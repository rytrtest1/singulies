// Versions « basiques » du site (essai 09/10) : ce qui est commun aux trois pages.
// Aucun appel réseau : les formulaires s'arrêtent sur un message (paiement / envoi à brancher).
import raw from '../cards/questions.json';

// prénom → capitales A–Z, tiret = espace, 22 caractères (mêmes règles que l'accueil)
export function norm(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
    .replace(/-/g, ' ').replace(/[^A-Z ]/g, '').replace(/^ +/, '').replace(/ {2,}/g, ' ').slice(0, 22);
}

// questions du jeu : minuscules, accents gardés
export const QUESTIONS = raw.map((x) => ({ id: x.id, q: x.q.toLowerCase() }));
let last = -1;
export function pick() {
  let i;
  do i = Math.floor(Math.random() * QUESTIONS.length); while (i === last && QUESTIONS.length > 1);
  last = i;
  return QUESTIONS[i];
}

// tape une nouvelle question sur une carte (.qcard > p), en fondu
export function showQuestion(card, q = pick()) {
  const p = card.querySelector('p');
  p.classList.add('out');
  setTimeout(() => { p.textContent = q.q; p.classList.remove('out'); }, p.textContent ? 250 : 0);
  card.dataset.id = q.id;
  return q;
}

// l'acrostiche : une ligne par lettre (une espace = une ligne blanche) ; seules les lignes nouvelles s'animent
export function acrostic(el, name) {
  const letters = norm(name).trimEnd().split('');
  const rows = [...el.children];
  let keep = 0;
  while (keep < rows.length && keep < letters.length && rows[keep].dataset.l === letters[keep]) keep++;
  rows.slice(keep).forEach((r) => r.remove());
  letters.slice(keep).forEach((l, k) => {
    const row = document.createElement('div');
    row.className = 'ac-row' + (l === ' ' ? ' ac-gap' : '');
    row.dataset.l = l;
    row.style.animationDelay = (k * 0.09) + 's';
    row.innerHTML = l === ' ' ? '' : `<b>${l}</b><i></i>`;
    el.appendChild(row);
  });
  el.style.setProperty('--n', Math.max(letters.length, 1));
  el.classList.toggle('empty', letters.length === 0);
}

// relie un champ prénom à un ou plusieurs acrostiches
export function bindName(input, targets) {
  const up = () => targets.forEach((t) => acrostic(t, input.value));
  input.addEventListener('input', up);
  up();
  return up;
}

// un formulaire qui ne part nulle part pour l'instant : vérifie, puis affiche le message
export function fakeSubmit(form, onDone) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    onDone(Object.fromEntries(new FormData(form)));
  });
}

export const AMAZON = 'https://www.amazon.fr/dp/B0DS8RF83H';
export const INSTAGRAM = 'https://www.instagram.com/e.t.ernel/';
