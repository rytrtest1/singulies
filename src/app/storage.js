// Mémoire locale : prénom du visiteur (localStorage, visites suivantes) et
// état validé de l'onglet (sessionStorage, restauré au rechargement même pendant le fondu).
const K_NAME = 'singulies.name';
const K_VALID = 'singulies.validated';

// prénom non retenu pour l'instant (04/10, Maxence : « toujours vide ») ; ?memoire=1 réactive la mémoire
const ON = (() => { try { return new URLSearchParams(location.search).get('memoire') === '1'; } catch { return false; } })();
const get = (st, k) => { try { return st.getItem(k); } catch { return null; } };
const set = (st, k, v) => { try { v == null ? st.removeItem(k) : st.setItem(k, v); } catch {} };

export function loadState() {
  if (!ON) return { name: null, validated: null };
  return { name: get(localStorage, K_NAME), validated: get(sessionStorage, K_VALID) };
}
export function saveValidated(name) {
  if (!ON) return;
  set(localStorage, K_NAME, name); set(sessionStorage, K_VALID, name);
}
// (11/10, Maxence) alt.html : le prénom tapé est retenu le temps de la visite (l'onglet) — rechargé, il est déjà écrit
const K_SESSION = 'singulies.prenom';
export function sessionName() { return get(sessionStorage, K_SESSION); }
export function saveSessionName(n) { set(sessionStorage, K_SESSION, n || null); }
// retour depuis les cartes : le prénom reste mémorisé (confirmé), seule la suite est oubliée
export function clearValidated() { set(sessionStorage, K_VALID, null); }
export function clearStored() { set(localStorage, K_NAME, null); set(sessionStorage, K_VALID, null); }

// (11/10) l'email de la personne, dès qu'elle l'a donné quelque part (fin du poème, paiement, liste d'attente,
// message) : on ne le redemande pas (me contacter, un poème par mois) ; rien d'autre n'est gardé
const K_EMAIL = 'singulies.email';
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function knownEmail() { const e = get(localStorage, K_EMAIL); return e && EMAIL_RE.test(e) ? e : null; }
export function rememberEmail(e) { if (e && EMAIL_RE.test(e.trim())) set(localStorage, K_EMAIL, e.trim()); }
