// Les listes d'attente (17/10) : « me prévenir » quand le jeu SINGULIES sort, et plus tard la lettre mensuelle.
// Même base D1 que les commandes (liaison « DB », table créée seule).
//   POST /attente  (le site)     { email, liste, version, site } → { ok }
//   GET  /admin/attente          (Bearer token, voir commandes.js) → { attente: [...] }
export const LISTES = ['jeu', 'lettre'];
const MAX_BODY = 2000;
const EMAIL = /^[^\s@]{1,100}@[^\s@]{1,100}\.[^\s@]{2,30}$/;

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const str = (x, n) => String(x ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, n);

let schemaOk = false;
export async function schemaAttente(db) {
  if (schemaOk) return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS attente (
    email TEXT NOT NULL, liste TEXT NOT NULL, cree TEXT NOT NULL, version TEXT DEFAULT '', PRIMARY KEY (email, liste))`).run();
  schemaOk = true;
}

export async function postAttente(env, req) {
  if (!env.DB) return json({ error: 'base non reliée' }, 503);
  const raw = await req.text();
  if (raw.length > MAX_BODY) return json({ error: 'trop long' }, 413);
  let b; try { b = JSON.parse(raw); } catch { return json({ error: 'illisible' }, 400); }
  if (!b || typeof b !== 'object') return json({ error: 'illisible' }, 400);
  if (str(b.site, 50)) return json({ ok: true });                        // piège à robots
  const email = str(b.email, 200).toLowerCase();
  const liste = LISTES.includes(b.liste) ? b.liste : '';
  if (!EMAIL.test(email)) return json({ error: 'email invalide' }, 400);
  if (!liste) return json({ error: 'liste inconnue' }, 400);
  const version = /^[123]$/.test(String(b.version ?? '')) ? String(b.version) : '';
  await schemaAttente(env.DB);
  // déjà inscrit : rien à faire (on ne change pas la date) ; la même personne peut s'inscrire à deux listes
  await env.DB.prepare('INSERT OR IGNORE INTO attente (email, liste, cree, version) VALUES (?, ?, ?, ?)')
    .bind(email, liste, new Date().toISOString(), version).run();
  return json({ ok: true });
}

export async function listeAttente(db) {
  await schemaAttente(db);
  const r = await db.prepare('SELECT email, liste, cree, version FROM attente ORDER BY cree DESC LIMIT 1000').all();
  return json({ attente: r.results || [] });
}
