// « mes livres » (11/10) : une page du même monde, montée seule (livres.html) ou dans la page du poème (pages.js).
// À compléter : la couverture du recueil, son titre, quelques lignes. Le lien mène au recueil sur Amazon.
import { count } from '../app/count.js';

const HTML = `<main class="lt">
  <img class="lt-env lt-card" src="BASEsimple/portail-livres.jpg" alt="Une carte noire où est tapé : mes livres." width="900" height="550">
  <h1 class="lt-h">mes livres</h1>
  <p class="lt-sub">mes poèmes, réunis</p>
  <div class="lt-txt">
    <p>les poèmes que j’ai tapés, rassemblés en recueil.</p>
  </div>
  <a class="lt-go on lt-link" href="https://www.amazon.fr/dp/B0DS8RF83H" target="_blank" rel="noopener">LE RECUEIL</a>
  <p class="lt-note">sur amazon</p>
</main>`;

export function buildLivres(host, base = './') {
  host.innerHTML = HTML.replace(/BASE/g, base);
  const main = host.querySelector('.lt');
  main.querySelector('.lt-link').addEventListener('click', () => count('livres/amazon'));
  return { main };
}
