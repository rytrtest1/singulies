// « SINGULIES » (17/10, Maxence : en bas du site, SINGULIES décrit ce qu'est singuliés — liés par notre singularité).
// Une page par-dessus le site, même allure que « qui t'écrit » (auteur.js) ; retour : la flèche, Échap.
import { style } from './auteur.js';

// TEXTE PROVISOIRE, à réécrire par Maxence (une ligne = un paragraphe ; minuscules, « je » = Eternel)
export const SINGULIES = [
  'singuliés, c’est le nom que je donne à tout ça : les poèmes, le jeu de cartes, le fil noir.',
  'chacun de nous est singulier. un prénom, une question, quelques mots tapés à la machine peuvent suffire à nous relier, un moment.',
  'le fil noir, c’est ça : relier les singuliés.',
  'les questions du jeu sont celles que je pose aux inconnus, dans la rue, avant de leur écrire.',
];

const CSS = `
.sg-go { display: block; margin: 30px auto 0; padding: 12px 8px 12px calc(8px + .45em); border: 0; background: none; cursor: pointer; color: #fff;
  font: 500 14px/1.4 'SG Garamond', Georgia, serif; letter-spacing: .45em; opacity: .62; text-decoration: none; -webkit-tap-highlight-color: transparent; }
.sg-go:hover, .sg-go:focus-visible { opacity: .85; outline: none; }
`;
const BACK = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function openSingulies(opts = {}) {
  if (document.querySelector('.mn-au')) return;
  const { base = './' } = opts;
  style();
  if (!document.getElementById('sg-style')) { const st = document.createElement('style'); st.id = 'sg-style'; st.textContent = CSS; document.head.appendChild(st); }
  const root = document.createElement('div'); root.className = 'mn-au';
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'singuliés');
  const jeu = new URL(base + 'jeu.html', document.baseURI).href;
  root.innerHTML = `<button class="au-back" type="button" aria-label="Retour">${BACK}</button>
    <div class="au"><h2 class="au-h">SINGULIES</h2>${SINGULIES.map(p => `<p>${esc(p)}</p>`).join('')}
    <a class="sg-go" href="${esc(jeu)}">LE JEU</a></div>`;
  document.body.appendChild(root);
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('on')));
  const close = () => {
    removeEventListener('keydown', onKey, true);
    root.classList.remove('on'); root.inert = true;
    setTimeout(() => root.remove(), 380);
  };
  const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
  addEventListener('keydown', onKey, true);
  root.querySelector('.au-back').addEventListener('click', close);
}
