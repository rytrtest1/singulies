// « mes livres », page seule (livres.html, lien direct) : le contenu (content.js) et le bandeau des pages (nav.js).
import '../lettre/lettre.css';
import { installCount } from '../app/count.js';
import { siteFonts } from '../app/fonts.js';
import { installNav } from '../nav/nav.js';
import { buildLivres } from './content.js';

const host = document.querySelector('.ltp');
const { main } = buildLivres(host, './');
siteFonts('./').finally(() => requestAnimationFrame(() => requestAnimationFrame(() => main.classList.add('on'))));
installCount('livres');
const nav = installNav({ current: 'livres', base: './', host: { stage: () => [main.querySelector('.lt-env'), ...[...main.children].filter(e => !e.classList.contains('lt-env'))], all: () => [host], obj: () => [main.querySelector('.lt-env')], rest: () => [...main.children].filter(e => !e.classList.contains('lt-env')), center: () => { const r = main.querySelector('.lt-env').getBoundingClientRect(); return r.height ? { y: r.top + r.height / 2, h: r.height } : null; } },
  show: () => true, foot: () => true, shade: () => true, side: () => host.scrollTop < 40,
  center: () => { const im = main.querySelector('.lt-env').getBoundingClientRect(); return { y: im.top + im.height / 2, h: Math.max(140, innerHeight * 0.3) }; } });
nav?.enter([host]);
