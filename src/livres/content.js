// « mes livres » (11/10 ; 12/10 : le JOURNAL) : une page du même monde, montée seule (livres.html) ou dans la page du
// poème (pages.js). Les livres en direct (book3d.js), à l'échelle de la feuille du poème, sur son horizon ; dessous,
// la description du livre tapée à la machine, des points (un par livre) ; LE LIRE mène au livre sur Amazon.
import { count } from '../app/count.js';
import { EST_V2 } from '../core/version.js';
import { buildStagePage } from '../lettre/page.js';
import { BOOKS } from './book3d.js';

// (les descriptions : deux à quatre lignes courtes, sans virgule en fin de ligne)
const STEPS = [
  { id: 'recueil', txt: 'de l’ombre à la lumière\nune danse introspective entre âme et chair\nentre amour et trahison', href: 'https://www.amazon.fr/dp/B0DS8RF83H', more: 'broché · 12,7 × 20,3 cm\nencre blanche sur papier noir', price: '<b>9,90 €</b> sur amazon' },
  // (12/10, Maxence) tiré de sa présentation : « quoi de plus intime qu'un journal ?… »
  { id: 'journal', txt: 'chaque pensée de chaque jour d’une année\ndu cœur gelé à la floraison sentimentale\nl’art exutoire dans la solitude noire', href: 'https://www.amazon.fr/dp/B0BYGNDTWB', more: 'broché · 15,2 × 22,9 cm\nencre blanche sur papier noir', price: '<b>18,99 €</b> sur amazon' },
];

export function buildLivres(host, base = './') {
  const pg = buildStagePage(host, { id: 'livres',
    base, steps: STEPS, fallback: k => (k === 0 ? 'livres/livre.jpg' : ''), aspectLabel: 'Les livres d’Eternel : PENSEES POETIQUES, JOURNAL — couvertures noires, un cadre fin, le titre en capitales.',
    sign: { label: EST_V2 ? 'LE LIRE ↗' : 'LE LIRE', href: STEPS[0].href }, price: k => STEPS[k].price,
    make: gl => import('./book3d.js').then(m => m.createBook(gl, base, BOOKS)),
    onStep: (k, from) => { if (from !== 'debut') count('livres/' + STEPS[k].id); },
  });
  pg.sign.addEventListener('click', () => count('livres/amazon-' + STEPS[pg.step].id));
  return pg;
}
