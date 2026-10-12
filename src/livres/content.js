// « mes livres » (11/10) : une page du même monde, montée seule (livres.html) ou dans la page du poème (pages.js).
// Le livre en direct (book3d.js), son titre, quelques lignes. Le lien mène au recueil sur Amazon.
import { count } from '../app/count.js';
import { stitch } from '../alt/stitch.js';

const HTML = `<main class="lt">
  <div class="lt-env lt-book"><img src="BASElivres/livre.jpg" alt="Le livre PENSEES POETIQUES, d’Eternel : une couverture noire, un cadre fin, le titre en capitales." width="1000" height="1300"></div>
  <h1 class="lt-h caps">PENSEES POETIQUES</h1>
  <p class="lt-sub">mon recueil</p>
  <div class="lt-txt">
    <p>de l’ombre à la lumière, les pensées poétiques offrent une danse introspective entre âme et chair, rapport à soi et à l’autre, entre amour et trahison, amertume et reconnaissance…</p>
  </div>
  <div class="lt-bar"><a class="lt-sign lt-link" href="https://www.amazon.fr/dp/B0DS8RF83H" target="_blank" rel="noopener">LE LIRE</a><div class="lt-pr"><b>9,90 €</b> sur amazon</div></div>
</main>`;

export function buildLivres(host, base = './') {
  host.innerHTML = HTML.replace(/BASE/g, base);
  const main = host.querySelector('.lt');
  main.querySelector('.lt-link').addEventListener('click', () => count('livres/amazon'));
  // (12/10, Maxence) la même grammaire que RECEVOIR : LE LIRE, cousu, le prix dessous
  stitch(main.querySelector('.lt-sign'), { seed: 'LE LIRE'.length * 13 });
  // (11/10) le livre en direct, par le moteur des cartes : il respire comme le reste ; l'image reste dessous (aperçu,
  // sans WebGL2)
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const box = main.querySelector('.lt-book');
  import('./book3d.js').then(m => m.mountBook(box, base, { reduced })).then(r => { if (!r) box.classList.add('flat'); }).catch(() => box.classList.add('flat'));
  return { main };
}
