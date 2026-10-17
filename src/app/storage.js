// Mémoire locale : prénom du visiteur (localStorage, visites suivantes) et
// état validé de l'onglet (sessionStorage, restauré au rechargement même pendant le fondu).
import { vk } from '../core/version.js';
const K_NAME = vk('singulies.name');
const K_VALID = vk('singulies.validated');

// prénom non retenu pour l'instant (04/10, Maxence : « toujours vide ») ; ?memoire=1 réactive la mémoire
const ON = (() => { try { return new URLSearchParams(location.search).get('memoire') === '1'; } catch { return false; } })();
// (le stockage est lu DANS le try : un navigateur qui le bloque lève une erreur dès qu'on nomme localStorage)
const LS = () => localStorage, SS = () => sessionStorage;
const get = (st, k) => { try { return st().getItem(k); } catch { return null; } };
const set = (st, k, v) => { try { v == null ? st().removeItem(k) : st().setItem(k, v); } catch {} };

export function loadState() {
  if (!ON) return { name: null, validated: null };
  return { name: get(LS, K_NAME), validated: get(SS, K_VALID) };
}
export function saveValidated(name) {
  if (!ON) return;
  set(LS, K_NAME, name); set(SS, K_VALID, name);
}
// (11/10, Maxence) alt.html : le prénom tapé est retenu le temps de la visite (l'onglet) — rechargé, il est déjà écrit
const K_SESSION = vk('singulies.prenom');
export function sessionName() { return get(SS, K_SESSION); }
export function saveSessionName(n) { set(SS, K_SESSION, n || null); }
// retour depuis les cartes : le prénom reste mémorisé (confirmé), seule la suite est oubliée
export function clearValidated() { set(SS, K_VALID, null); }
export function clearStored() { set(LS, K_NAME, null); set(SS, K_VALID, null); }

// (11/10) l'email de la personne, dès qu'elle l'a donné quelque part (fin du poème, paiement, liste d'attente,
// message) : on ne le redemande pas (me contacter, un poème par mois) ; rien d'autre n'est gardé
const K_EMAIL = vk('singulies.email');
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function knownEmail() { const e = get(LS, K_EMAIL); return e && EMAIL_RE.test(e) ? e : null; }
export function rememberEmail(e) { if (e && EMAIL_RE.test(e.trim())) set(LS, K_EMAIL, e.trim()); }
