// jeu.html — la page du jeu seule (lien partagé q/<id>, ou direct) : la ligne du haut (ETERNEL, ← la page d'avant, le menu, le
// sous-bandeau de la section) et le jeu (game.js). Ailleurs sur le site, le jeu s'ouvre par-dessus la page (sous-bandeau, menu) ou
// en relais depuis le paquet de la page SINGULIES.
import { siteFonts } from '../app/fonts.js';
import { installCount } from '../app/count.js';
import { installNav } from '../nav/nav.js';
import { mountGame } from './game.js';

const BASE = './';
const P = new URLSearchParams(location.search);
const sharedQ = P.get('q') != null && /^\d+$/.test(P.get('q')) ? +P.get('q') : null;

const st = document.createElement('style');
st.textContent = 'html, body { margin: 0; background: #060606; overflow: hidden; overscroll-behavior: none; -webkit-text-size-adjust: 100%; } body { position: fixed; inset: 0; width: 100%; }';
document.head.appendChild(st);

// la page d'avant (l'historique du site) ; venu d'ailleurs (lien partagé) : l'accueil
function goBack() {
  try { if (history.length > 1 && document.referrer && new URL(document.referrer).origin === location.origin) { history.back(); return; } } catch { /* */ }
  location.href = BASE;
}
installCount('jeu');
installNav({ current: 'jeu', headerOnly: true, base: BASE, show: () => false, foot: () => false, shade: () => false, canBack: () => true, onBack: () => { goBack(); return true; } });

(async () => {
  await siteFonts(BASE).catch(() => {});
  const g = await mountGame({ base: BASE, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, standalone: true, firstQ: sharedQ }).catch(e => { console.warn('jeu', e); return null; });
  // sans WebGL2 : le jeu en version simple (mêmes mots, mêmes gestes)
  if (!g) import('../simple/simple.js').then(m => m.mountSimpleJeu({ onBack: goBack, firstQ: sharedQ, answer: false })).catch(() => { /* */ });
  // Échap : la page d'avant (sauf menu ou page de la section ouverts)
  addEventListener('keydown', e => { if (e.key === 'Escape' && !document.querySelector('.nv-pan.on, .mn-au, .mn-ct')) goBack(); });
})();
