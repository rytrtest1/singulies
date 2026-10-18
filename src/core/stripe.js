// Stripe, le minimum pour une page en DOM (V1) : la session (fonction Cloudflare, serveur/paiement.js), le paiement par carte
// et le portefeuille (Apple Pay / Google Pay) habillés aux couleurs du site. Même mécanisme que le panneau de src/alt/offre.js
// (le moteur des versions 2 et 3), sans rien en partager : une page ne tire que ce dont elle a besoin.
// Le Worker n'accepte que les origines du site (SITE) : le paiement réel ne s'essaie que sur singulies.com.
import { STRIPE_PK, PAIEMENT_URL } from '../alt/config.js';

export const stripeDispo = () => !!(STRIPE_PK && PAIEMENT_URL);

export function chargerStripe() {
  if (window.Stripe) return Promise.resolve(window.Stripe);
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://js.stripe.com/endive/stripe.js';
    s.onload = () => (window.Stripe ? res(window.Stripe) : rej(new Error('stripe.js')));
    s.onerror = () => rej(new Error('stripe.js'));
    document.head.appendChild(s);
  });
}

export function apparence() {
  return {
    theme: 'night', labels: 'floating',
    variables: {
      colorPrimary: '#ece8e0', colorBackground: '#0f0f0e', colorText: '#d6d2ca', colorTextSecondary: '#a9a49b',
      colorTextPlaceholder: '#6f6b64', colorDanger: '#e08a7a', iconColor: '#a9a49b',
      fontFamily: '"SG Machine", "Courier New", monospace', fontSizeBase: '16px', borderRadius: '2px', spacingUnit: '4px',
    },
    rules: {
      '.Input': { backgroundColor: '#0f0f0e', border: '1px solid #4a4741', boxShadow: 'none' },
      '.Input:focus': { border: '1px solid #cfcac0', boxShadow: 'none' },
      '.Label': { color: '#a9a49b' },
      '.Tab': { backgroundColor: '#0f0f0e', border: '1px solid #4a4741', boxShadow: 'none' },
      '.Tab--selected': { border: '1px solid #ece8e0' },
    },
  };
}

// → { checkout, actions } : une session pour cette commande. retour : où Stripe ramène si une redirection est nécessaire
// (3-D Secure, PayPal) ; le Worker y ajoute ?session=…
export async function creerSession({ prenom, ref, retour, base = './' }) {
  const Stripe = await chargerStripe();
  const stripe = Stripe(STRIPE_PK, { locale: 'fr' });
  const clientSecret = fetch(PAIEMENT_URL.replace(/\/$/, '') + '/session', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prenom, ref, retour }),
  }).then(r => r.json()).then(d => { if (!d.clientSecret) throw new Error(d.error || 'session'); return d.clientSecret; });
  const fonts = new URL(base + 'fonts/', document.baseURI).href;
  const checkout = stripe.initCheckoutElementsSdk({
    clientSecret,
    elementsOptions: { appearance: apparence(), fonts: [
      { family: 'SG Machine', src: `url(${fonts}CourierPrime-latin.woff2)`, weight: '400' },
      { family: 'SG Garamond', src: `url(${fonts}EBGaramond-500.woff2)`, weight: '500' },
    ] },
  });
  const la = await checkout.loadActions();
  if (la.type === 'error') throw new Error(la.error?.message || 'actions');
  return { checkout, actions: la.actions };
}

// l'adresse déjà donnée dans le formulaire → l'adresse de livraison de la session (France)
export async function adresseVersStripe(actions, checkout, f) {
  const a = { name: [f.prenom, f.nom].filter(Boolean).join(' ').trim(), address: { line1: f.rue || '', line2: f.cplt || '', city: f.ville || '', postal_code: String(f.cp || '').replace(/\s+/g, ''), country: 'FR' } };
  const fn = actions.updateShippingAddress || checkout.updateShippingAddress;
  if (!fn) throw new Error('updateShippingAddress absent');
  const r = await fn.call(actions.updateShippingAddress ? actions : checkout, a);
  if (r && r.type === 'error') throw new Error(r.error?.message || 'adresse refusée');
}
