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
/* (17/10, Maxence : « l'aperçu du jeu, SINGULIES / LE JEU écrit dessus, qu'on peut toucher pour jouer ») le paquet en direct (jeu/deck3d.js) */
.sg-deck { position: relative; width: min(100%, 340px); height: min(36svh, 250px); margin: 0 auto 26px; cursor: pointer; touch-action: pan-y pinch-zoom; -webkit-tap-highlight-color: transparent; outline: none; }
.sg-deck .mc-deck-c { position: absolute; inset: 0; width: 100%; height: 100%; }
.sg-deck.on ~ .sg-go { display: none; }
.mn-au .au > * { transition: opacity .6s ease; }
.mn-au.away .au > :not(.sg-deck) { opacity: 0; pointer-events: none; }
`;
const BACK = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function openSingulies(opts = {}) {
  if (document.querySelector('.mn-au')) return;
  const { base = './' } = opts;
  style();
  if (!document.getElementById('sg-style')) { const st = document.createElement('style'); st.id = 'sg-style'; st.textContent = CSS; document.head.appendChild(st); }
  const root = document.createElement('div'); root.className = 'mn-au'; root.dataset.title = 'SINGULIES'; root.dataset.x = 'singulies';
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'singuliés');
  const jeu = new URL(base + 'jeu.html', document.baseURI).href;
  root.innerHTML = `<button class="au-back" type="button" aria-label="Retour">${BACK}</button>
    <div class="au"><div class="sg-deck" role="button" tabindex="0" aria-label="SINGULIES, le jeu : tirer une carte"></div>${SINGULIES.map(p => `<p>${esc(p)}</p>`).join('')}
    <a class="sg-go" href="${esc(jeu)}">LE JEU</a></div>`;
  document.body.appendChild(root);
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('on')));
  // le paquet en direct. Au toucher : la page du jeu, préparée d'avance par-dessus (une couche transparente, game.js en relais), prend
  // la carte du dessus là où elle est et la retourne sur une question, qui vient se poser au centre — une seule scène dessine la carte,
  // aucun changement de page ; le retour (←) la ramène sur le paquet. Sans WebGL2 ou si le relais manque : le lien LE JEU.
  const box = root.querySelector('.sg-deck'), jeuUrl = id => { const u = new URL(jeu); if (id != null) u.searchParams.set('q', id); return u.href; };
  let deck = null, game = null, inGame = false;
  import('../jeu/deck3d.js').then(m => m.mountDeck(box, { base, reduced: opts.reduced, onDraw: id => { if (!game) location.href = jeuUrl(id); } })).then(r => {
    if (!r) return; deck = r; box.classList.add('on');
    setTimeout(() => { if (root.isConnected) import('../jeu/game.js').then(m => m.mountGame({ base, reduced: opts.reduced, relay: true, deck: () => deck,
      onReturned: () => { inGame = false; root.classList.remove('away'); } })).then(g => { if (g && root.isConnected) game = g; else g?.root.remove(); }).catch(e => console.warn('jeu (relais)', e)); }, 1200);
  }).catch(() => { /* le lien suffit */ });
  const play = () => {
    if (inGame) return;
    if (deck && game) { inGame = true; root.classList.add('away'); game.takeOver(); return; }
    if (deck) deck.pull(); else location.href = jeu;
  };
  box.addEventListener('click', play);
  box.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(); } });
  const close = () => {
    removeEventListener('keydown', onKey, true);
    root.classList.remove('on'); root.inert = true;
    setTimeout(() => { root.remove(); game?.root.remove(); }, 380);
  };
  const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
  addEventListener('keydown', onKey, true);
  root.querySelector('.au-back').addEventListener('click', close);
}
