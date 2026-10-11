// « un poème par mois », page seule (lettre.html, lien direct) : le contenu (content.js) et le bandeau des pages
// (src/nav/nav.js) ; les pages voisines s'y montent sans rechargement, sauf le poème (alt.html).
import './lettre.css';
import { installCount } from '../app/count.js';
import { menuFonts } from '../menu/menu.js';
import { installNav } from '../nav/nav.js';
import { buildLettre } from './content.js';

const host = document.querySelector('.ltp');
const { main } = buildLettre(host, './');
menuFonts('./').finally(() => requestAnimationFrame(() => requestAnimationFrame(() => main.classList.add('on'))));
installCount('lettre');
const nav = installNav({ current: 'lettre', base: './', host: { stage: () => [main], all: () => [host] },
  show: () => true, foot: () => true, shade: () => true, side: () => host.scrollTop < 40,
  center: () => { const im = main.querySelector('.lt-env').getBoundingClientRect(); return { y: im.top + im.height / 2, h: Math.max(160, innerHeight * 0.36) }; } });
nav?.enter([host]);
if (nav) nav.swipe(host, 'lettre');
