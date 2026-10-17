// « qui t'écrit » (17/10, Maxence : « il faut savoir qui je suis ») : qui est Eternel, en quelques lignes, avec son
// portrait (PORTRAIT dans src/alt/config.js, vide = le texte seul). Deux places : une section de la page du poème,
// sous les autres poèmes (auteurHtml), et une page par-dessus le site quand on touche ETERNEL en bas (openAuteur).
// ECRIS-MOI → la carte de contact (contact.js).
import { PORTRAIT } from '../alt/config.js';

// TEXTE PROVISOIRE, à réécrire par Maxence (une ligne = un paragraphe ; minuscules, « je » = Eternel)
export const AUTEUR = [
  'je m’appelle maxence. j’écris sous le nom d’eternel, à paris.',
  'j’écris des poèmes à des inconnus, dans la rue, sur une machine à écrire : un prénom, quelques mots échangés, et j’écris.',
  'ici, c’est pareil. tu me donnes ton prénom, tu réponds à une question du jeu SINGULIES, et je t’écris ton poème. je le tape une seule fois, à la machine, et je te l’envoie par la poste.',
  'personne d’autre ne l’écrit, aucun programme non plus.',
];

const CSS = `
.au { max-width: 34em; margin: 0 auto; padding: 0 16px; text-align: center; color: rgb(200,200,200); }
.au-ph { display: block; width: min(260px, 64vw); aspect-ratio: 4 / 5; object-fit: cover; margin: 0 auto 28px; filter: grayscale(1) brightness(.9); }
.au-h { font: 500 22px/1 'SG Garamond', Georgia, serif; letter-spacing: .45em; padding-left: .45em; color: #fff; opacity: .9; margin: 0 0 26px; }
.au p { font: 14.5px/1.85 'SG Machine', 'Courier New', monospace; margin: 0 0 14px; }
.au-go { display: block; margin: 30px 0 14px; padding: 0 0 0 .45em;
  font: 500 14px/1.4 'SG Garamond', Georgia, serif; letter-spacing: .45em; color: #fff; opacity: .62; }
.au-ct { display: flex; justify-content: center; }
.au-ig { display: block; font: 13px/1.6 'SG Machine', 'Courier New', monospace; color: rgba(255,255,255,.4); text-decoration: none; }
.au-ig:hover { color: rgba(255,255,255,.65); }
.mn-au { position: fixed; inset: 0; z-index: 44; background: #060606; opacity: 0; transition: opacity .35s ease; overflow-y: auto;
  -webkit-overflow-scrolling: touch; overscroll-behavior: contain; touch-action: pan-y pinch-zoom; padding: calc(104px + env(safe-area-inset-top)) 0 calc(88px + env(safe-area-inset-bottom)); box-sizing: border-box;
  display: flex; flex-direction: column; }   /* (17/10) plus de justify-content: center — le haut d'une page plus haute que l'écran restait coupé ; margin: auto centre sans rien couper */
.mn-au.on { opacity: 1; }
.mn-au .au { margin: auto; }
.mn-au .au-back { position: fixed; left: max(6px, env(safe-area-inset-left)); top: max(6px, env(safe-area-inset-top)); width: 44px; height: 44px;
  display: flex; align-items: center; justify-content: center; margin: 0; padding: 0; border: 0; background: transparent; color: #fff; opacity: .62; cursor: pointer; }
.mn-au .au-back:hover, .mn-au .au-back:focus-visible { opacity: .85; outline: none; }
`;
const BACK = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function style() {
  if (document.getElementById('au-style')) return;
  const st = document.createElement('style'); st.id = 'au-style'; st.textContent = CSS; document.head.appendChild(st);
}

// le bloc lui-même : portrait, ETERNEL, le texte, ECRIS-MOI, instagram
export function auteurHtml(base = './') {
  style();
  const ph = PORTRAIT ? `<img class="au-ph" src="${esc(new URL(base + PORTRAIT, document.baseURI).href)}" alt="Eternel" loading="lazy" decoding="async" onerror="this.remove()">` : '';
  return `<div class="au">${ph}${AUTEUR.map(p => `<p>${esc(p)}</p>`).join('')}
    <h3 class="au-go">ECRIS-MOI</h3><div class="au-ct"></div></div>`;
}

// ECRIS-MOI : la carte de contact
// (17/10, Maxence) la carte tout de suite sous ECRIS-MOI (plus de clic de plus), @e.t.ernel dessous
export function wireAuteur(root, { base = './', reduced = false, name = '' } = {}) {
  const h = root.querySelector('.au-ct');
  if (h && !h.firstChild) import('./contact.js').then(m => m.mountContact(h, { base, reduced, name }));
}

// la page par-dessus le site (ETERNEL, en bas) ; retour : la flèche, Échap
export function openAuteur(opts = {}) {
  if (document.querySelector('.mn-au')) return;
  const { base = './' } = opts;
  const root = document.createElement('div'); root.className = 'mn-au'; root.dataset.title = 'A PROPOS'; root.dataset.x = 'auteur';
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'à propos');
  root.innerHTML = `<button class="au-back" type="button" aria-label="Retour">${BACK}</button>${auteurHtml(base)}`;
  document.body.appendChild(root);
  wireAuteur(root, opts);
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('on')));
  const close = () => {
    removeEventListener('keydown', onKey, true);
    root.classList.remove('on'); root.inert = true;
    setTimeout(() => root.remove(), 380);
  };
  // Échap : seulement si la carte de contact n'est pas ouverte par-dessus (elle se ferme d'abord)
  const onKey = e => { if (e.key === 'Escape' && !document.querySelector('.mn-ct:not(.ct-in)')) { e.preventDefault(); e.stopPropagation(); close(); } };
  addEventListener('keydown', onKey, true);
  root.querySelector('.au-back').addEventListener('click', close);
}
