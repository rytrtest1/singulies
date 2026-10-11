// « mes livres » (11/10) : une page du même monde, dans la boucle des pages (le bandeau relié par le fil, nav.js).
// À compléter : la couverture du recueil, son titre, quelques lignes. Le lien mène au recueil sur Amazon.
import { installCount, count } from '../app/count.js';
import { menuFonts } from '../menu/menu.js';
import { installNav } from '../nav/nav.js';

const main = document.querySelector('.lt');
menuFonts('./').finally(() => requestAnimationFrame(() => requestAnimationFrame(() => main.classList.add('on'))));
installCount('livres');
main.querySelector('.lt-link').addEventListener('click', () => count('livres/amazon'));
const nav = installNav({ current: 'livres', base: './', show: () => true, side: () => scrollY < 40, stage: () => [main],
  center: () => { const im = main.querySelector('.lt-env').getBoundingClientRect(); return { y: im.top + im.height / 2, h: Math.max(140, innerHeight * 0.3) }; } });
nav?.enter([main]);
if (nav) nav.swipe(main);
