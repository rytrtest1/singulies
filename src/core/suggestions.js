// La liste de propositions d'adresse (décision 6), commune aux trois versions : on tape la rue, la Base Adresse Nationale
// propose l'adresse complète, un choix remplit la rue, le code postal et la ville. Modèle ARIA « combobox » : le champ
// reste un champ (la saisie libre marche toujours), la liste est un listbox, flèches / Entrée / Échap au clavier,
// lignes de 44 px au toucher. Le service est interrogé après une pause dans la frappe (src/core/adresse.js).
import { creerRecherche, toucheListe } from './adresse.js';

const CSS = `
.sg-sugg { position: fixed; z-index: 30; margin: 0; padding: 4px 0; list-style: none; box-sizing: border-box; max-height: 46vh; overflow-y: auto;
  background: #0f0f0e; border: 1px solid #3a3733; box-shadow: 0 8px 30px rgba(0,0,0,.6); display: none; }
.sg-sugg.on { display: block; }
.sg-sugg li { min-height: 44px; box-sizing: border-box; padding: 11px 14px; cursor: pointer; font: 15px/1.35 'SG Garamond', Georgia, serif;
  letter-spacing: .02em; color: #ece8e0; -webkit-tap-highlight-color: transparent; }
.sg-sugg li[aria-selected="true"], .sg-sugg li:hover { background: #24211e; color: #fff; }
.sg-sugg .sg-sugg-pied { min-height: 0; padding: 6px 14px 8px; font-size: 12px; color: #a9a49b; cursor: default; background: none; }
`;

// input : le champ de la rue ; ancre() → { left, top, bottom, width } du champ à l'écran ; onChoix({ rue, cp, ville, label })
export function lierAdresse(input, { ancre, onChoix, chercher = creerRecherche() } = {}) {
  if (!document.getElementById('sg-sugg-style')) {
    const st = document.createElement('style'); st.id = 'sg-sugg-style'; st.textContent = CSS; document.head.appendChild(st);
  }
  const id = 'sg-sugg-' + Math.random().toString(36).slice(2, 7);
  const ul = document.createElement('ul');
  ul.id = id; ul.className = 'sg-sugg'; ul.setAttribute('role', 'listbox'); ul.setAttribute('aria-label', 'Adresses proposées');
  document.body.appendChild(ul);
  input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list'); input.setAttribute('aria-controls', id); input.setAttribute('aria-expanded', 'false');

  let liste = [], index = -1, ouvert = false, jeton = 0;

  const fermer = () => {
    ouvert = false; index = -1; ul.classList.remove('on'); ul.innerHTML = '';
    input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant');
  };
  const marquer = () => {
    [...ul.querySelectorAll('[role="option"]')].forEach((li, i) => li.setAttribute('aria-selected', i === index ? 'true' : 'false'));
    if (index >= 0) input.setAttribute('aria-activedescendant', id + '-' + index); else input.removeAttribute('aria-activedescendant');
    const actif = ul.querySelector('[aria-selected="true"]'); if (actif && actif.scrollIntoView) actif.scrollIntoView({ block: 'nearest' });
  };
  function placer() {
    const r = (ancre && ancre()) || input.getBoundingClientRect();
    const bas = (window.visualViewport ? window.visualViewport.offsetTop + window.visualViewport.height : innerHeight) - 8;
    const larg = Math.min(Math.max(r.width || 0, 260), innerWidth - 16);
    const gauche = Math.max(8, Math.min(r.left, innerWidth - larg - 8));
    ul.style.width = larg + 'px'; ul.style.left = gauche + 'px';
    const haut = r.bottom + 4, h = Math.min(ul.scrollHeight, innerHeight * 0.46);
    // pas de place dessous (clavier ouvert) : au-dessus du champ
    ul.style.top = (haut + h > bas && r.top - 4 - h > 8 ? r.top - 4 - h : haut) + 'px';
  }
  function ouvrir(l) {
    liste = l; index = -1; ul.innerHTML = '';
    if (!liste.length) { fermer(); return; }
    liste.forEach((s, i) => {
      const li = document.createElement('li'); li.id = id + '-' + i; li.setAttribute('role', 'option'); li.setAttribute('aria-selected', 'false'); li.textContent = s.label;
      li.addEventListener('pointerdown', e => { e.preventDefault(); });      // le champ garde le focus
      li.addEventListener('click', () => choisir(i));
      ul.appendChild(li);
    });
    const pied = document.createElement('li'); pied.className = 'sg-sugg-pied'; pied.setAttribute('aria-hidden', 'true'); pied.textContent = 'ou continue d’écrire ton adresse'; ul.appendChild(pied);
    ouvert = true; ul.classList.add('on'); input.setAttribute('aria-expanded', 'true'); placer();
  }
  function choisir(i) {
    const s = liste[i]; if (!s) return;
    fermer();
    if (onChoix) onChoix({ rue: s.rue, cp: s.cp, ville: s.ville, label: s.label });
  }

  input.addEventListener('input', () => {
    const mon = ++jeton;
    Promise.resolve(chercher(input.value)).then(l => { if (mon === jeton && document.activeElement === input) ouvrir(l); else if (mon === jeton) fermer(); });
  });
  input.addEventListener('keydown', e => {
    if (!ouvert) return;
    if (!['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key) || e.isComposing) return;
    const r = toucheListe({ index, taille: liste.length, ouvert }, e.key);
    if (e.key === 'Enter' && !r.valider) return;      // aucune proposition active : Entrée garde son rôle (champ suivant)
    e.preventDefault(); e.stopImmediatePropagation();
    if (r.valider) { choisir(index); return; }
    index = r.index; if (!r.ouvert) fermer(); else marquer();
  });
  input.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== input) fermer(); }, 120));
  addEventListener('resize', () => { if (ouvert) placer(); });
  return { fermer, destroy() { fermer(); ul.remove(); } };
}
