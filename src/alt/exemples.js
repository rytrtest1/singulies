// Version alternative (10/10) : sous la feuille, de vrais poèmes déjà écrits, en défilé façon story (celui du milieu
// plus grand, les voisins plus petits, en fondu). La carte de la question est posée face cachée (on ne dit pas laquelle).
import { ACROSTICHES } from './config.js';
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// acrostiches réels d'Eternel (10/10), un prénom par exemple : ISABELLE, ANAIS, MARYSOL, JULIE. Chaque vers : la lettre
// de la colonne, une espace, puis la suite tapée à la machine. Rendus par le vrai moteur (exemples-rendu.html →
// node tools/exemples-shot.mjs → public/exemples/<prénom>.jpg, avec une carte question au hasard) ; sans image : la
// feuille dessinée ci-dessous
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
  ] },
  { vers: [
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
  return `<div class="sheet ex-sheet"><div class="ex-poem" style="font-size:${fs.toFixed(2)}cqw">${lines}</div>
    <div class="ex-card ex-dos" style="background-image:url('${dos}')"></div></div>`;
}

// (11/10, Maxence) le défilé : sans fin (après le dernier, le premier revient, dans les deux sens), au doigt, à la souris
// ou en touchant un voisin ; le poème doit se lire : toucher la feuille du milieu l'ouvre en presque plein écran.
// Celle du milieu grande et nette, les voisines plus petites et en fondu.
export function mountExemples(host) {
  const srcs = ACROSTICHES.length ? ACROSTICHES : EXEMPLES.map(ex => 'exemples/' + ex.vers.filter(Boolean).map(v => v[0]).join('').toLowerCase() + '.jpg');
  const N = srcs.length;
  if (!N) return;
  const url = src => new URL(src, document.baseURI).href;
  host.innerHTML = '<div class="ex-ring"></div>';
  const ringEl = host.firstChild;
  // cinq places (−2 … 2) : chacune montre l'exemple (centre + place) modulo N
  const slots = [-2, -1, 0, 1, 2].map(k => {
    const f = document.createElement('figure'); f.className = 'ex-slot';
    const im = new Image(); im.decoding = 'async'; im.alt = ''; im.draggable = false;
    im.onerror = () => { const i = +f.dataset.i; if (!ACROSTICHES.length && EXEMPLES[i]) { im.remove(); f.insertAdjacentHTML('beforeend', sheetHtml(EXEMPLES[i])); } };
    f.appendChild(im); ringEl.appendChild(f);
    return { f, im, k };
  });
  const mod = i => ((i % N) + N) % N;
  let center = 1, off = 0, reading = false, anim = 0;   // off : décalage en places (le doigt), centre : l'exemple au milieu
  const label = i => { const ex = EXEMPLES[i]; return ex ? 'Acrostiche de ' + ex.vers.filter(Boolean).map(v => v[0]).join('') + ', tapé à la machine sur une feuille noire' : 'Un acrostiche tapé à la machine'; };
  function assign() {
    for (const s of slots) {
      const i = mod(center + s.k);
      if (s.f.dataset.i !== String(i)) { s.f.dataset.i = i; const im = s.f.querySelector('img'); if (im) { im.src = url(srcs[i]); im.alt = label(i); } }
    }
  }
  let w = 280;
  function layout() {
    const W = host.clientWidth || innerWidth;
    w = Math.round(Math.min(W * 0.72, 340));
    ringEl.style.height = Math.round(w * 1240 / 900) + 'px';
    for (const s of slots) s.f.style.width = w + 'px';
    place(false);
  }
  function place(smooth) {
    for (const s of slots) {
      const p = s.k + off, d = Math.min(1.6, Math.abs(p));
      const x = p * w * 0.86, sc = 1 - 0.16 * Math.min(1, d);
      s.f.style.transition = smooth ? 'transform .5s cubic-bezier(.2,.7,.3,1), opacity .5s' : 'none';
      s.f.style.transform = `translateX(${(x - w / 2).toFixed(1)}px) scale(${sc.toFixed(3)})`;
      s.f.style.opacity = (1 - 0.6 * Math.min(1, d)).toFixed(3);
      s.f.style.zIndex = String(10 - Math.round(d * 2));
      s.f.classList.toggle('mid', s.k === 0 && Math.abs(off) < 0.5);
    }
  }
  // aller d'une place (±1) : on glisse, puis on recentre sans que rien ne bouge (les images changent de place)
  function step(d) {
    off = -d; place(true);
    clearTimeout(anim);
    anim = setTimeout(() => { center = mod(center + d); off = 0; assign(); place(false); }, 500);
  }
  // lire (11/10, Maxence) : la feuille touchée s'ouvre en presque plein écran, entière — entre le bandeau du haut et
  // SINGULIES en bas —, la frappe se lit ; elle grandit depuis sa place et y retourne (toucher, glisser, Échap)
  let box = null;
  function read(on) {
    const mid = slots[2].f, im = mid.querySelector('img');
    if (on && (!im || box)) return;
    if (!on) { box?.close(); return; }
    reading = true;
    const r = im.getBoundingClientRect();
    const top = 52 + safe('top'), bot = 38 + safe('bottom'), H = innerHeight - top - bot, W = innerWidth;
    // la feuille occupe ≈ 90 % de la largeur de l'image : on laisse les bords noirs déborder un peu
    let w = Math.min(W / 0.9, H * 900 / 1240), h = w * 1240 / 900;
    if (h > H) { h = H; w = h * 900 / 1240; }
    const x = (W - w) / 2, y = top + (H - h) / 2;
    const veil = document.createElement('div'); veil.className = 'ex-veil';
    veil.style.top = top + 'px'; veil.style.bottom = bot + 'px';
    const big = im.cloneNode(); big.className = 'ex-big'; big.alt = im.alt;
    Object.assign(big.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    document.body.append(veil, big);
    void big.offsetWidth;
    veil.classList.add('on');
    Object.assign(big.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
    mid.style.visibility = 'hidden';
    const close = () => {
      if (!box) return;
      box = null; reading = false;
      const r2 = im.getBoundingClientRect();
      veil.classList.remove('on');
      Object.assign(big.style, { left: r2.left + 'px', top: r2.top + 'px', width: r2.width + 'px', height: r2.height + 'px' });
      setTimeout(() => { mid.style.visibility = ''; big.remove(); veil.remove(); removeEventListener('keydown', esc); }, 520);
      place(true);
    };
    const esc = e => { if (e.key === 'Escape') close(); };
    addEventListener('keydown', esc);
    for (const el of [veil, big]) el.addEventListener('click', close);
    let sx = null;
    big.addEventListener('touchstart', e => { sx = e.touches.length === 1 ? e.touches[0].clientX : null; }, { passive: true });
    big.addEventListener('touchend', e => { const t = e.changedTouches[0]; if (sx != null && t && Math.abs(t.clientX - sx) > 40) close(); }, { passive: true });
    box = { close };
    place(true);
  }
  const safe = side => { const d = document.createElement('div'); d.style.cssText = `position:fixed;width:1px;height:env(safe-area-inset-${side});visibility:hidden`; document.body.appendChild(d); const v = d.offsetHeight || 0; d.remove(); return v; };
  // le doigt / la souris
  let x0 = null, y0 = 0, t0 = 0, horiz = null, moved = false;
  const start = (x, y) => { x0 = x; y0 = y; t0 = performance.now(); horiz = null; moved = false; };
  const move = (x, y) => {
    if (x0 == null) return;
    const dx = x - x0, dy = y - y0;
    if (horiz == null && Math.hypot(dx, dy) > 8) horiz = Math.abs(dx) > 1.2 * Math.abs(dy);
    if (horiz) { moved = true; off = Math.max(-1.2, Math.min(1.2, dx / (w * 0.86))); place(false); }
  };
  const end = (x, target) => {
    if (x0 == null) return;
    const dx = x - x0, v = dx / Math.max(1, performance.now() - t0); x0 = null;
    if (horiz) {
      if (Math.abs(dx) > w * 0.22 || Math.abs(v) > 0.4) step(dx < 0 ? 1 : -1);
      else { off = 0; place(true); }
      return;
    }
    if (moved) return;
    // un toucher : sur un voisin, il vient au milieu ; sur celui du milieu, on lit (ou on revient à la feuille entière)
    const slot = slots.find(s => s.f.contains(target));
    if (!slot) return;
    if (slot.k === 0) read(true); else step(Math.sign(slot.k));
  };
  ringEl.addEventListener('touchstart', e => { if (e.touches.length === 1) start(e.touches[0].clientX, e.touches[0].clientY); else x0 = null; }, { passive: true });
  ringEl.addEventListener('touchmove', e => { if (e.touches.length === 1) move(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  ringEl.addEventListener('touchend', e => { const t = e.changedTouches[0]; if (t) end(t.clientX, document.elementFromPoint(t.clientX, t.clientY)); }, { passive: true });
  ringEl.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') start(e.clientX, e.clientY); });
  ringEl.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') move(e.clientX, e.clientY); });
  ringEl.addEventListener('pointerup', e => { if (e.pointerType === 'mouse') end(e.clientX, e.target); });
  addEventListener('keydown', e => { if (!host.isConnected || !host.getBoundingClientRect().top || host.getBoundingClientRect().top > innerHeight * 0.6) return; if (e.key === 'ArrowLeft') step(-1); else if (e.key === 'ArrowRight') step(1); });
  addEventListener('resize', layout);
  assign(); layout();
  return { step, read };
}
