// Version alternative (10/10) : sous la feuille, de vrais poèmes déjà écrits, en défilé façon story (celui du milieu
// plus grand, les voisins plus petits, en fondu). La carte de la question est posée face cachée (on ne dit pas laquelle).
import { ACROSTICHES } from './config.js';
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// trois acrostiches réels d'Eternel (10/10). Chaque vers : la lettre de la colonne, puis la suite tapée à la machine ;
// '' = la ligne blanche entre deux mots du prénom (deux strophes)
export const EXEMPLES = [
  { vers: [
    'I l y a des liens qui courent, survivent à la distance',
    'S i tu es loin, je souffre, je m’oublie seule en France',
    'A ttends-moi je découvre des horizons qui dansent',
    'B lancs les nuages qui couvrent le ciel de Paris',
    'E t noirs les pavés mous sous les pas endormis',
    'L à-bas je me retrouve, là-bas tout me sourit',
    'L à-bas tu es une louve qui attend ses petits',
    'E t quand tu me retrouves, je retrouve l’envie',
  ] },
  { vers: [
    'A mour, viens dans mes bras, et ne lâche jamais prise',
    'N ’oublie pas qu’un cœur bat quand il sort de l’emprise',
    'A vec le contrôle part la légèreté des brises',
    'I lluminant les soirs où les mots électrisent',
    'S i le parfait fait peur, le pire paralyse',
    '',
    'M ême un cœur amoureux peut douter de lui-même',
    'A ime-moi, si je peux, moi je ferai de même',
    'R are est la foudre bleue, mais je l’attends sereine',
    'Y a-t-il une manière de savoir si je saigne ?',
    'S i mon cœur bat pour eux, ou s’il hésite, blême ?',
    'O n peut croire ce qu’on veut ; je veux être certaine',
    'L aissons le temps faire mieux que nos relations vaines',
  ] },
  { vers: [
    'J e respire quand mon cœur a son verrou cassé',
    'U ne fois que je meurs, je redeviens assez',
    'L oin du lieu des douleurs, loin de l’amour tassé',
    'I l suffit d’une lueur et soudain le passé',
    'E claire les profondeurs, et je peux mieux aimer',
  ] },
];

function sheetHtml(ex) {
  // la taille du texte : le vers le plus long tient dans la largeur, le poème entier au-dessus de la carte
  const long = Math.max(...ex.vers.map(v => v.length));
  const fs = Math.min(3.2, 78 / (long * 0.6), 68 / ((ex.vers.length + 2) * 1.95));   // (le haut à 22, la carte dès 98 : cqw)
  const lines = ex.vers.map(v => v ? `<div class="ex-l"><b>${esc(v[0])}</b><span>${esc(v.slice(1))}</span></div>` : '<div class="ex-l ex-gap">&nbsp;</div>').join('');
  const dos = new URL('simple/dos.jpg', document.baseURI).href;
  return `<div class="sheet ex-sheet"><div class="ex-poem" style="font-size:${fs.toFixed(2)}cqw">${lines}<div class="ex-sig">- ETERNEL -</div></div>
    <div class="ex-card ex-dos" style="background-image:url('${dos}')"></div></div>`;
}

export function mountExemples(host) {
  // des photos de poèmes envoyés, s'il y en a ; sinon les poèmes réels, posés sur la feuille dessinée
  const slidesHtml = ACROSTICHES.length
    ? ACROSTICHES.map(src => `<figure class="ex-slide"><img class="ex-photo" src="${esc(new URL(src, document.baseURI).href)}" alt="Un acrostiche tapé à la machine sur une feuille noire" loading="lazy" decoding="async"></figure>`).join('')
    : EXEMPLES.map(ex => `<figure class="ex-slide">${sheetHtml(ex)}</figure>`).join('');
  host.innerHTML = `<div class="ex-track">${slidesHtml}</div>`;
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
