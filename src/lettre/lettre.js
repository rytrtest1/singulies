// « un poème par mois », page seule (lettre.html, lien direct) : le contenu (content.js) et le bandeau des pages
// (src/nav/nav.js) ; les pages voisines s'y montent sans rechargement, sauf le poème (alt.html).
import './lettre.css';
import { installCount } from '../app/count.js';
import { siteFonts } from '../app/fonts.js';
import { installNav } from '../nav/nav.js';
import { buildLettre } from './content.js';

const host = document.querySelector('.ltp');
const pg = buildLettre(host, './');
const { main } = pg;
siteFonts('./').finally(() => requestAnimationFrame(() => requestAnimationFrame(() => main.classList.add('on'))));
installCount('lettre');
// (12/10) l'objet est dans le monde commun (src/app/stage.js) : il voyage, le reste paraît sur place
const nav = installNav({ current: 'lettre', base: './', host: { stage: () => [...pg.obj(), ...pg.rest()], all: () => [host], obj: pg.obj, rest: pg.rest, center: pg.center },
  show: () => true, foot: () => true, shade: () => true, side: () => true, center: pg.center });
nav?.enter([host]);
