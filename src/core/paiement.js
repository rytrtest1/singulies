// Le paiement, un seul endroit pour les trois versions (décisions 0 et 3).
//  - MODE_PAIEMENT : 'paypal' aujourd'hui (rien n'est débité, l'auteur envoie le lien de paiement) ; 'stripe' le jour où
//    Stripe passe en réel. Réglé à la construction : variable VITE_PAIEMENT_MODE (Cloudflare → Variables, ou .env).
//  - LIGNE_PAIEMENT : la phrase dite à la personne, la même dans les trois versions, qui suit le mode.
//  - Le panneau Stripe en mode test n'est visible qu'en test (?test=1, retenu le temps de la visite, ou variable
//    VITE_STRIPE_TEST=1 sur un déploiement d'essai) ; on peut alors le passer. Passer ne paie rien et n'est jamais
//    proposé hors test.
import { vk } from './version.js';

const ENV = (typeof import.meta !== 'undefined' && import.meta.env) || {};
export const MODE_PAIEMENT = ENV.VITE_PAIEMENT_MODE === 'stripe' ? 'stripe' : 'paypal';
const TEST_DEPLOIEMENT = ENV.VITE_STRIPE_TEST === '1';

export const LIGNES_PAIEMENT = {
  paypal: 'rien n’est débité maintenant : je t’envoie le lien de paiement par email',
  stripe: 'paiement par carte, Apple Pay ou Google Pay, après l’adresse',
};
export const lignePaiement = (mode = MODE_PAIEMENT) => LIGNES_PAIEMENT[mode] || LIGNES_PAIEMENT.paypal;
export const LIGNE_PAIEMENT = lignePaiement();

const CLE_TEST = () => vk('test');
const lire = () => { try { return sessionStorage.getItem(CLE_TEST()) === '1'; } catch { return false; } };
const ecrire = on => { try { on ? sessionStorage.setItem(CLE_TEST(), '1') : sessionStorage.removeItem(CLE_TEST()); } catch { /* */ } };

// ?test=1 active le mode test pour la visite, ?test=0 l'éteint ; sans paramètre, on garde ce qui a été choisi.
export function stripeTestVisible(recherche = (typeof location !== 'undefined' ? location.search : ''), deploiement = TEST_DEPLOIEMENT) {
  let p = null; try { p = new URLSearchParams(recherche).get('test'); } catch { /* */ }
  if (p === '1') ecrire(true); else if (p === '0') ecrire(false);
  return deploiement || lire();
}

// L'état à afficher : { mode: 'paypal' | 'stripe-test' | 'stripe', ligne, panneauStripe, passable }
export function etatPaiement({ mode = MODE_PAIEMENT, test = stripeTestVisible() } = {}) {
  if (mode === 'stripe') return { mode: 'stripe', ligne: lignePaiement('stripe'), panneauStripe: true, passable: false };
  if (test) return { mode: 'stripe-test', ligne: lignePaiement('paypal'), panneauStripe: true, passable: true };
  return { mode: 'paypal', ligne: lignePaiement('paypal'), panneauStripe: false, passable: false };
}
