// Version alternative (10/10) : sous la feuille, d'autres poèmes, en défilé façon story (celui du milieu plus grand,
// les voisins plus petits, en fondu). Chacun avec la carte question tirée, posée en bas de la feuille.
// PROVISOIRE : prénoms au hasard et poèmes d'exemple — à remplacer par de vrais poèmes (avec l'accord des personnes).
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// chaque vers commence par sa lettre de la colonne (la lettre, en Garamond, puis la suite tapée à la machine)
export const EXEMPLES = [
  { q: 30, vers: ['Il dort au fond d’un tiroir,', 'Numéroté, plié en quatre,', 'Encore un peu de salle noire', 'Sur mes doigts quand je le touche.'] },
  { q: 21, vers: ['Le café qui refroidit,', 'On ne se lève pas encore,', 'Un dimanche sans montre,', 'Il pleut, et tant mieux,', 'Surtout, que rien ne bouge.'] },
  { q: 33, vers: ['Chaque été tu m’attendais', 'Haut sur la dune, ton chapeau,', 'Le sel restait dans tes rides,', 'On rentrait sans rien se dire,', 'Et j’entends encore la mer.'] },
  { q: 26, vers: ['Sur le quai, le train partait,', 'Avec lui ma phrase entière,', 'Mes mains au fond des poches,', 'Il faisait froid, j’ai souri,', 'Rien dit. je le dis ici.'] },
];

function sheetHtml(ex) {
  const lines = ex.vers.map(v => `<div class="ex-l"><b>${esc(v[0])}</b><span>${esc(v.slice(1))}</span></div>`).join('');
  const card = new URL('email/q/' + ex.q + '.jpg', document.baseURI).href;
  return `<div class="sheet ex-sheet"><div class="ex-poem">${lines}<div class="ex-sig">- ETERNEL -</div></div>
    <div class="ex-card" style="background-image:url('${card}')"></div></div>`;
}

export function mountExemples(host) {
  host.innerHTML = `<div class="ex-track">${EXEMPLES.map(ex => `<figure class="ex-slide">${sheetHtml(ex)}</figure>`).join('')}</div>`;
  const track = host.querySelector('.ex-track'), slides = [...track.children];
  // le milieu grand et net, les voisins plus petits et en fondu (selon la distance au centre)
  const look = () => {
    const c = track.scrollLeft + track.clientWidth / 2;
    for (const s of slides) {
      const m = s.offsetLeft - track.offsetLeft + s.offsetWidth / 2, d = Math.min(1, Math.abs(m - c) / s.offsetWidth);
      s.style.transform = `scale(${(1 - 0.16 * d).toFixed(3)})`;
      s.style.opacity = (1 - 0.6 * d).toFixed(3);
    }
  };
  // largeur : 72 % de la bande (320 px au plus), centrée — les voisins dépassent de chaque côté
  const size = () => {
    const W = track.clientWidth, w = Math.round(Math.min(W * 0.72, 320));
    for (const s of slides) s.style.flexBasis = w + 'px';
    track.style.paddingLeft = track.style.paddingRight = Math.round((W - w) / 2) + 'px';
    look();
  };
  track.addEventListener('scroll', () => requestAnimationFrame(look), { passive: true });
  addEventListener('resize', size);
  size();
  // départ sur le deuxième : on voit qu'il y en a de chaque côté
  setTimeout(() => { const s = slides[1]; if (s) track.scrollLeft = s.offsetLeft - track.offsetLeft + s.offsetWidth / 2 - track.clientWidth / 2; look(); }, 50);
  look();
}
