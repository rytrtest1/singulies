// « mes livres », page seule (livres.html, lien direct) : le contenu (content.js) et le bandeau des pages (nav.js).
import '../lettre/lettre.css';
import { installCount } from '../app/count.js';
import { menuFonts } from '../menu/menu.js';
import { installNav } from '../nav/nav.js';
import { buildLivres } from './content.js';

const host = document.querySelector('.ltp');
const { main } = buildLivres(host, './');
menuFonts('./').finally(() => requestAnimationFrame(() => requestAnimationFrame(() => main.classList.add('on'))));
installCount('livres');
const nav = installNav({ current: 'livres', base: './', host: { stage: () => [main], all: () => [host] },
  show: () => true, foot: () => true, shade: () => true, side: () => host.scrollTop < 40,
  center: () => { const im = main.querySelector('.lt-env').getBoundingClientRect(); return { y: im.top + im.height / 2, h: Math.max(140, innerHeight * 0.3) }; } });
nav?.enter([host]);
if (nav) nav.swipe(host, 'livres');
