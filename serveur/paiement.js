// Paiement (10/10) : une petite fonction Cloudflare Workers, seul morceau « serveur » du site.
// Elle garde la clé secrète Stripe (jamais dans le site) et crée la session de paiement ; le formulaire, lui, est
// dessiné par le site (Checkout Sessions en mode « elements »).
// Réglages (Cloudflare → ton Worker → Settings → Variables) :
//   STRIPE_SECRET_KEY  (secret)  sk_test_… pour les essais, sk_live_… pour de vrai — tu la colles toi-même
//   SITE               (texte)   https://rytrtest1.github.io  (l'origine autorisée ; à changer avec le nom de domaine)
//   PRIX_CENTIMES      (texte)   3000  (le prix est fixé ICI, jamais par la page)
// Points d'entrée :
//   POST /session  { prenom, ref, retour }  → { clientSecret, id }
//   GET  /status?session_id=cs_…            → { status, payment_status, prenom, ref }
// Stripe Tax : pas activé (artiste-auteur, à voir avec un comptable) ; il suffira d'ajouter automatic_tax[enabled]=true.

const API = 'https://api.stripe.com/v1';

function cors(env, res) {
  const h = new Headers(res.headers);
  h.set('Access-Control-Allow-Origin', env.SITE);
  h.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  h.set('Access-Control-Allow-Headers', 'Content-Type');
  h.set('Vary', 'Origin');
  return new Response(res.body, { status: res.status, headers: h });
}
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

async function stripe(env, method, path, params) {
  const r = await fetch(API + path, {
    method,
    headers: { Authorization: 'Bearer ' + env.STRIPE_SECRET_KEY, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params ? new URLSearchParams(params).toString() : undefined,
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message || 'stripe ' + r.status);
  return data;
}

async function createSession(env, req) {
  const body = await req.json().catch(() => ({}));
  // le prénom : capitales A–Z et espaces (comme sur le site), 22 caractères ; la référence : A–Z, chiffres, - et _
  const prenom = String(body.prenom || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/-/g, ' ')
    .replace(/[^A-Z ]/g, '').replace(/ {2,}/g, ' ').trim().slice(0, 22);
  const ref = String(body.ref || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 200);
  if (!prenom) return json({ error: 'prénom manquant' }, 400);
  // retour après paiement : seulement vers le site (jamais une adresse fournie par un inconnu)
  let retour = String(body.retour || '');
  if (!retour.startsWith(env.SITE + '/')) return json({ error: 'retour refusé' }, 400);
  retour += (retour.includes('?') ? '&' : '?') + 'session={CHECKOUT_SESSION_ID}';
  const s = await stripe(env, 'POST', '/checkout/sessions', {
    ui_mode: 'elements',   // le formulaire est dessiné par le site (champs Stripe habillés à ses couleurs)
    mode: 'payment',
    locale: 'fr',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'eur',
    'line_items[0][price_data][unit_amount]': String(+env.PRIX_CENTIMES || 3000),
    'line_items[0][price_data][product_data][name]': 'Un prénom, un poème : ' + prenom,
    'line_items[0][price_data][product_data][description]': 'Acrostiche tapé à la machine par Eternel, posté chez toi (port compris).',
    'shipping_address_collection[allowed_countries][0]': 'FR',
    'phone_number_collection[enabled]': 'false',
    client_reference_id: ref || prenom.replace(/ /g, '_'),
    'metadata[prenom]': prenom,
    'metadata[ref]': ref,
    'payment_intent_data[metadata][prenom]': prenom,
    'payment_intent_data[metadata][ref]': ref,
    return_url: retour,
  });
  return json({ clientSecret: s.client_secret, id: s.id });
}

async function status(env, url) {
  const id = url.searchParams.get('session_id') || '';
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) return json({ error: 'session inconnue' }, 400);
  const s = await stripe(env, 'GET', '/checkout/sessions/' + id);
  return json({ status: s.status, payment_status: s.payment_status, prenom: s.metadata?.prenom || '', ref: s.metadata?.ref || '' });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return cors(env, new Response(null, { status: 204 }));
    try {
      if (req.method === 'POST' && url.pathname === '/session') return cors(env, await createSession(env, req));
      if (req.method === 'GET' && url.pathname === '/status') return cors(env, await status(env, url));
      return cors(env, json({ error: 'introuvable' }, 404));
    } catch (e) {
      return cors(env, json({ error: String(e.message || e) }, 502));
    }
  },
};
