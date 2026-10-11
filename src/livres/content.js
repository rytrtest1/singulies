// « mes livres » (11/10) : une page du même monde, montée seule (livres.html) ou dans la page du poème (pages.js).
// Le livre en direct (book3d.js), son titre, quelques lignes. Le lien mène au recueil sur Amazon.
import { count } from '../app/count.js';

const HTML = `<main class="lt">
  <div class="lt-env lt-book"><img src="BASElivres/livre.jpg" alt="Le livre Pensées poétiques, d’Eternel : une couverture noire, un cadre fin, le titre en capitales." width="1000" height="1300"></div>
  <h1 class="lt-h">pensées poétiques</h1>
  <p class="lt-sub">mon recueil</p>
  <div class="lt-txt">
    <p>les poèmes que j’ai écrits, rassemblés dans un livre.</p>
  </div>
  <a class="lt-go on lt-link" href="https://www.amazon.fr/dp/B0DS8RF83H" target="_blank" rel="noopener">LE LIRE</a>
  <p class="lt-note">sur amazon</p>
</main>`;

export function buildLivres(host, base = './') {
  host.innerHTML = HTML.replace(/BASE/g, base);
  const main = host.querySelector('.lt');
  main.querySelector('.lt-link').addEventListener('click', () => count('livres/amazon'));
  // (11/10) le livre en direct, par le moteur des cartes : il respire comme le reste ; l'image reste dessous (aperçu,
  // sans WebGL2)
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const box = main.querySelector('.lt-book');
  import('./book3d.js').then(m => m.mountBook(box, base, { reduced })).then(r => { if (!r) box.classList.add('flat'); }).catch(() => box.classList.add('flat'));
  return { main };
}
