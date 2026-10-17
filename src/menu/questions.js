// « QUESTIONS » (17/10, Maxence : « enlève le tes questions de sous les pages, c'est à mettre dans le menu ») : ce qu'on se
// demande avant de commander, une page du menu (même allure que A PROPOS). Toucher une question l'ouvre (une seule à la fois).
// Le texte : src/alt/questions.js (réponses vraies seulement, comme conditions.html).
import { style } from './auteur.js';
import { questionsHtml, wireQuestions } from '../alt/questions.js';

const CSS = `
.mn-au .qs { max-width: 32em; margin: 0 auto; text-align: left; }
.mn-au .qs-i { border-top: 1px solid rgba(255,255,255,.08); }
.mn-au .qs-i:last-child { border-bottom: 1px solid rgba(255,255,255,.08); }
.mn-au .qs-i summary { list-style: none; cursor: pointer; padding: 13px 28px 13px 2px; position: relative; font: 500 16px/1.4 'SG Garamond', Georgia, serif; color: rgba(255,255,255,.82); }
.mn-au .qs-i summary::-webkit-details-marker { display: none; }
.mn-au .qs-i summary::after { content: ''; position: absolute; right: 6px; top: 50%; width: 7px; height: 7px; margin-top: -6px; border: solid rgba(255,255,255,.45);
  border-width: 0 1px 1px 0; transform: rotate(45deg); transition: transform .3s ease, margin .3s ease; }
.mn-au .qs-i[open] summary::after { transform: rotate(-135deg); margin-top: -2px; }
.mn-au .qs-i summary:hover, .mn-au .qs-i summary:focus-visible { color: #fff; outline: none; }
.mn-au .qs-i p { margin: 0 2px 16px; font: 14px/1.8 'SG Machine', 'Courier New', monospace; color: rgba(214,214,214,.86); }
`;
const BACK = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';

export function openQuestions() {
  if (document.querySelector('.mn-au')) return;
  style();
  if (!document.getElementById('qs-style')) { const st = document.createElement('style'); st.id = 'qs-style'; st.textContent = CSS; document.head.appendChild(st); }
  const root = document.createElement('div'); root.className = 'mn-au'; root.dataset.title = 'QUESTIONS';
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'questions');
  root.innerHTML = `<button class="au-back" type="button" aria-label="Retour">${BACK}</button><div class="au">${questionsHtml()}</div>`;
  document.body.appendChild(root);
  wireQuestions(root);
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
