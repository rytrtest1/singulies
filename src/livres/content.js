// « mes livres » (11/10) : une page du même monde, montée seule (livres.html) ou dans la page du poème (pages.js).
// À compléter : la couverture du recueil, son titre, quelques lignes. Le lien mène au recueil sur Amazon.
import { count } from '../app/count.js';

const HTML = `<main class="lt">
  <img class="lt-env lt-book" src="BASElivres/couverture.jpg" alt="La couverture de Pensées poétiques, d’Eternel : noire, un cadre fin, le titre en capitales." width="900" height="1440">
  <h1 class="lt-h">pensées poétiques</h1>
  <p class="lt-sub">mon recueil</p>
  <div class="lt-txt">
    <p>les poèmes que j’ai écrits, rassemblés dans un livre.</p>
  </div>
  <a class="lt-go on lt-link" href="https://www.amazon.fr/dp/B0DS8RF83H" target="_blank" rel="noopener">LE LIRE</a>
  <p class="lt-note">sur amazon</p>
  <button class="lt-contact" type="button">écris-moi</button>
</main>`;

export function buildLivres(host, base = './') {
  host.innerHTML = HTML.replace(/BASE/g, base);
  const main = host.querySelector('.lt');
  main.querySelector('.lt-link').addEventListener('click', () => count('livres/amazon'));
  // écris-moi : le message sur une carte vierge (src/menu/contact.js)
  main.querySelector('.lt-contact').addEventListener('click', () => import('../menu/contact.js').then(m => m.openContact({ base, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches })));
  return { main };
}
