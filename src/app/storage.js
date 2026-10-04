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
// retour depuis les cartes : le prénom reste mémorisé (confirmé), seule la suite est oubliée
export function clearValidated() { set(sessionStorage, K_VALID, null); }
export function clearStored() { set(localStorage, K_NAME, null); set(sessionStorage, K_VALID, null); }
