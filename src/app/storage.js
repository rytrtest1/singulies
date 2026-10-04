// Mémoire locale : prénom du visiteur (localStorage, visites suivantes) et
// état validé de l'onglet (sessionStorage, restauré au rechargement même pendant le fondu).
const K_NAME = 'singulies.name';
const K_VALID = 'singulies.validated';

const get = (st, k) => { try { return st.getItem(k); } catch { return null; } };
const set = (st, k, v) => { try { v == null ? st.removeItem(k) : st.setItem(k, v); } catch {} };

export function loadState() {
  return { name: get(localStorage, K_NAME), validated: get(sessionStorage, K_VALID) };
}
export function saveValidated(name) { set(localStorage, K_NAME, name); set(sessionStorage, K_VALID, name); }
// retour depuis les cartes : le prénom reste mémorisé (confirmé), seule la suite est oubliée
export function clearValidated() { set(sessionStorage, K_VALID, null); }
export function clearStored() { set(localStorage, K_NAME, null); set(sessionStorage, K_VALID, null); }
