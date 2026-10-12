// « mes livres », page seule (livres.html, lien direct) : le contenu (content.js) et le bandeau des pages (nav.js).
import '../lettre/lettre.css';
import { installCount } from '../app/count.js';
import { siteFonts } from '../app/fonts.js';
import { installNav } from '../nav/nav.js';
import { buildLivres } from './content.js';

const host = document.querySelector('.ltp');
const pg = buildLivres(host, './');
const { main } = pg;
siteFonts('./').finally(() => requestAnimationFrame(() => requestAnimationFrame(() => main.classList.add('on'))));
installCount('livres');
// (12/10) l'objet est dans le monde commun (src/app/stage.js) : il voyage, le reste paraît sur place
const nav = installNav({ current: 'livres', base: './', host: { stage: () => [...pg.obj(), ...pg.rest()], all: () => [host], obj: pg.obj, rest: pg.rest, center: pg.center },
  show: () => true, foot: () => true, shade: () => true, side: () => true, center: pg.center });
nav?.enter([host]);
