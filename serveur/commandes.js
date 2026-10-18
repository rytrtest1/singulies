// Suivi des commandes (17/10) : chaque demande du site est gardée dans une petite base Cloudflare D1 (liaison « DB »),
// en plus de l'email (EmailJS) qui part comme avant. La page commandes.html (protégée par ADMIN_TOKEN) les liste et
// change leur statut : reçue → paiement envoyé → payée → tapée → postée.
// Points d'entrée :
//   POST /commande                       (le site)        { ref, prenom, genre, … } → { ok, ref }
//   GET  /admin/commandes?statut=…       (Bearer token)   → { commandes: [...] }
//   POST /admin/commande                 (Bearer token)   { ref, statut?, note?, facture?, posteMail? } → { commande }
//   POST /admin/lien-stripe              (Bearer token)   { ref } → { url }   (paiement Stripe hébergé, valable 24 h)
//   GET  /admin/config                   (Bearer token)   → { paypal, prix, stripe }

import { listeAttente } from './attente.js';

export const STATUTS = ['recue', 'paiement', 'payee', 'tapee', 'postee'];
const MAX_BODY = 16000;   // octets : une demande fait ≈ 1–2 ko (la réponse est limitée à 4000 caractères)

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const str = (x, n) => String(x ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, n);
const now = () => new Date().toISOString();

// la table se crée d'elle-même au premier appel (rien à faire à la main dans la console D1)
let schemaOk = false;
async function schema(db) {
  if (schemaOk) return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS commandes (
    ref TEXT PRIMARY KEY, cree TEXT NOT NULL, maj TEXT NOT NULL,
    prenom TEXT, genre TEXT, question_id TEXT, question TEXT, reponse TEXT,
    adresse TEXT, email TEXT, contact TEXT, mode TEXT, cadeau INTEGER DEFAULT 0, session TEXT, lien TEXT,
    statut TEXT NOT NULL DEFAULT 'recue', note TEXT DEFAULT '', facture TEXT DEFAULT '', poste_mail TEXT DEFAULT '',
    essai INTEGER DEFAULT 0)`).run();
  await db.prepare('CREATE INDEX IF NOT EXISTS commandes_cree ON commandes (cree)').run();
  // (17/10) la version du site d'où vient la commande (1, 2, 3 ; vide = site principal) : la table existe peut-être déjà
  try { await db.prepare("ALTER TABLE commandes ADD COLUMN version TEXT DEFAULT ''").run(); } catch { /* la colonne existe déjà */ }
  // (18/10) « de la part de » : celui qui offre signe (V3)
  try { await db.prepare("ALTER TABLE commandes ADD COLUMN de_la_part TEXT DEFAULT ''").run(); } catch { /* la colonne existe déjà */ }
  // (18/10, V2) pour offrir : un mot qui accompagne l'envoi, et la date où il doit arriver
  try { await db.prepare("ALTER TABLE commandes ADD COLUMN mot TEXT DEFAULT ''").run(); } catch { /* la colonne existe déjà */ }
  try { await db.prepare("ALTER TABLE commandes ADD COLUMN quand TEXT DEFAULT ''").run(); } catch { /* la colonne existe déjà */ }
  schemaOk = true;
}

// une référence quand le site n'en donne pas (ancien parcours, essai sans adresse)
const newRef = () => 'S' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();

export async function postCommande(env, req) {
  if (!env.DB) return json({ error: 'base non reliée' }, 503);
  const raw = await req.text();
  if (raw.length > MAX_BODY) return json({ error: 'trop long' }, 413);
  let b; try { b = JSON.parse(raw); } catch { return json({ error: 'illisible' }, 400); }
  if (!b || typeof b !== 'object') return json({ error: 'illisible' }, 400);
  // piège à robots : un champ invisible sur le site, toujours vide chez une vraie personne
  if (str(b.site, 50)) return json({ ok: true });
  const prenom = str(b.prenom, 40).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/-/g, ' ').replace(/[^A-Z ]/g, '').replace(/ {2,}/g, ' ').trim();
  if (!prenom) return json({ error: 'prénom manquant' }, 400);
  const ref = str(b.ref, 80).replace(/[^A-Za-z0-9_-]/g, '') || newRef();
  const adresse = Array.isArray(b.adresse) ? b.adresse.slice(0, 8).map(l => str(l, 120)).filter(Boolean).join('\n') : str(b.adresse, 600);
  const mode = ['reservation', 'paye', 'simule', 'poste', 'direct', 'essai', 'note'].includes(b.mode) ? b.mode : 'poste';
  const row = {
    prenom, genre: str(b.genre, 30), question_id: str(b.questionId, 20), question: str(b.question, 400),
    reponse: str(b.reponse, 4000), adresse, email: str(b.email, 200), contact: str(b.contact, 200), mode,
    cadeau: b.cadeau ? 1 : 0, session: str(b.session, 200).replace(/[^A-Za-z0-9_]/g, ''), lien: str(b.lien, 6000),
    essai: b.essai ? 1 : 0, version: /^[123]$/.test(String(b.version ?? '')) ? String(b.version) : '', de_la_part: str(b.dela, 80),
    mot: str(b.mot, 320), quand: /^\d{4}-\d{2}-\d{2}$/.test(String(b.quand ?? '')) ? String(b.quand) : '',
  };
  const db = env.DB; await schema(db);
  const t = now();
  const old = await db.prepare('SELECT ref, statut, adresse, email, reponse FROM commandes WHERE ref = ?').bind(ref).first();
  if (old) {
    // une même référence revient (la personne offerte répond, la page rechargée, l'email donné ensuite) : on complète,
    // sans jamais effacer ce qui était là ni toucher au statut, à la note, au numéro de facture
    const keep = (k, v) => v || old[k] || '';
    await db.prepare(`UPDATE commandes SET maj = ?, prenom = ?, genre = ?, question_id = COALESCE(NULLIF(?, ''), question_id),
      question = COALESCE(NULLIF(?, ''), question), reponse = ?, adresse = ?, email = ?, contact = COALESCE(NULLIF(?, ''), contact),
      mode = ?, cadeau = MAX(cadeau, ?), session = COALESCE(NULLIF(?, ''), session), lien = COALESCE(NULLIF(?, ''), lien) WHERE ref = ?`)
      .bind(t, row.prenom, row.genre, row.question_id, row.question, keep('reponse', row.reponse), keep('adresse', row.adresse),
        keep('email', row.email), row.contact, row.mode, row.cadeau, row.session, row.lien, ref).run();
  } else {
    const statut = mode === 'paye' ? 'payee' : 'recue';
    await db.prepare(`INSERT INTO commandes (ref, cree, maj, prenom, genre, question_id, question, reponse, adresse, email, contact,
      mode, cadeau, session, lien, statut, essai, version, de_la_part, mot, quand) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(ref, t, t, row.prenom, row.genre, row.question_id, row.question, row.reponse, row.adresse, row.email, row.contact,
        row.mode, row.cadeau, row.session, row.lien, statut, row.essai, row.version, row.de_la_part, row.mot, row.quand).run();
  }
  return json({ ok: true, ref });
}

// --- administration ---------------------------------------------------------------------------------------------
function same(a, b) {   // comparaison à temps constant
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
export function authorized(env, req) {
  const tok = String(env.ADMIN_TOKEN || '');
  const got = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  return tok.length >= 12 && same(got, tok);
}

export async function admin(env, req, url, stripe) {
  if (!env.ADMIN_TOKEN) return json({ error: 'ADMIN_TOKEN non défini dans Cloudflare' }, 503);
  if (!authorized(env, req)) { await new Promise(r => setTimeout(r, 400)); return json({ error: 'mot de passe refusé' }, 401); }
  const p = url.pathname;
  if (req.method === 'GET' && p === '/admin/config') {
    return json({ paypal: env.PAYPAL || '', prix: +env.PRIX_CENTIMES || 3900, stripe: !!env.STRIPE_SECRET_KEY, base: !!env.DB });
  }
  if (!env.DB) return json({ error: 'base non reliée (voir serveur/LISEZ-MOI.md)' }, 503);
  const db = env.DB; await schema(db);
  if (req.method === 'GET' && p === '/admin/attente') return listeAttente(db);
  if (req.method === 'GET' && p === '/admin/commandes') {
    const st = url.searchParams.get('statut') || '';
    const q = STATUTS.includes(st)
      ? db.prepare('SELECT * FROM commandes WHERE statut = ? ORDER BY cree DESC LIMIT 500').bind(st)
      : db.prepare('SELECT * FROM commandes ORDER BY cree DESC LIMIT 500');
    return json({ commandes: (await q.all()).results || [] });
  }
  const b = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const ref = str(b.ref, 80);
  const row = ref && await db.prepare('SELECT * FROM commandes WHERE ref = ?').bind(ref).first();
  if (!row) return json({ error: 'commande inconnue' }, 404);
  if (req.method === 'POST' && p === '/admin/commande') {
    const set = [], val = [];
    if (b.statut !== undefined) { if (!STATUTS.includes(b.statut)) return json({ error: 'statut inconnu' }, 400); set.push('statut = ?'); val.push(b.statut); }
    if (b.note !== undefined) { set.push('note = ?'); val.push(str(b.note, 4000)); }
    if (b.facture !== undefined) { set.push('facture = ?'); val.push(str(b.facture, 60)); }
    if (b.posteMail) { set.push('poste_mail = ?'); val.push(now()); }
    if (set.length) await db.prepare('UPDATE commandes SET ' + set.join(', ') + ', maj = ? WHERE ref = ?').bind(...val, now(), ref).run();
    return json({ commande: await db.prepare('SELECT * FROM commandes WHERE ref = ?').bind(ref).first() });
  }
  if (req.method === 'POST' && p === '/admin/lien-stripe') {
    if (!env.STRIPE_SECRET_KEY) return json({ error: 'STRIPE_SECRET_KEY non défini' }, 503);
    const site = String(env.SITE || '').split(',')[0].trim();
    const params = {
      mode: 'payment', locale: 'fr',
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': 'eur',
      'line_items[0][price_data][unit_amount]': String(+env.PRIX_CENTIMES || 3900),
      'line_items[0][price_data][product_data][name]': 'Un prénom, un poème : ' + row.prenom,
      client_reference_id: ref, 'metadata[prenom]': row.prenom, 'metadata[ref]': ref,
      'payment_intent_data[metadata][ref]': ref,
      success_url: site + '/', cancel_url: site + '/',
    };
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(row.email || '')) params.customer_email = row.email;
    const s = await stripe(env, 'POST', '/checkout/sessions', params);
    await db.prepare('UPDATE commandes SET session = ?, maj = ? WHERE ref = ?').bind(s.id, now(), ref).run();
    return json({ url: s.url });
  }
  return json({ error: 'introuvable' }, 404);
}
