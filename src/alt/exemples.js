// Version alternative (10/10) : sous la feuille, de vrais poèmes déjà écrits, en défilé façon story (celui du milieu
// plus grand, les voisins plus petits, en fondu). La carte de la question est posée face cachée (on ne dit pas laquelle).
import { ACROSTICHES } from './config.js';
import { count } from '../app/count.js';
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
// opt.root (17/10) : la couche où il est posé (VOIR EN VRAI, par-dessus la page), sinon la page du poème
export function mountExemples(host, opt = {}) {
  const ROOT = opt.root || document.getElementById('offre');
  const srcs = ACROSTICHES.length ? ACROSTICHES : EXEMPLES.map(ex => 'exemples/' + ex.vers.filter(Boolean).map(v => v[0]).join('').toLowerCase() + '.jpg');
  const N = srcs.length;
  if (!N) return;
  const url = src => new URL(src, document.baseURI).href;
  host.innerHTML = '<div class="ex-ring"></div>';
  const ringEl = host.firstChild;
  // cinq places (−2 … 2) : chacune montre l'exemple (centre + place) modulo N
  const slots = [-2, -1, 0, 1, 2].map(k => {
    const f = document.createElement('figure'); f.className = 'ex-slot';
    // (12/10) la feuille dans son « objet » : il s'incline avec la main (souris, téléphone penché) et respire ; un reflet
    // de lumière glisse dessus, du côté d'où vient la lampe
    const o = document.createElement('div'); o.className = 'ex-obj';
    const im = new Image(); im.decoding = 'async'; im.alt = ''; im.draggable = false;
    im.onerror = () => { const i = +f.dataset.i; if (!ACROSTICHES.length && EXEMPLES[i]) { im.remove(); o.insertAdjacentHTML('afterbegin', sheetHtml(EXEMPLES[i])); } };
    const sh = document.createElement('i'); sh.className = 'ex-sheen';
    o.append(im, sh); f.appendChild(o); ringEl.appendChild(f);
    return { f, im, o, sh, k };
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
  // (le défilé recentré d'un coup, sans animation : la lecture ouverte a déjà fait glisser les feuilles)
  function jump(d) { clearTimeout(anim); center = mod(center + d); off = 0; assign(); place(false); }
  function step(d) {
    off = -d; place(true);
    clearTimeout(anim);
    anim = setTimeout(() => { center = mod(center + d); off = 0; assign(); place(false); }, 500);
  }
  // lire (11/10, Maxence) : la feuille touchée s'ouvre en presque plein écran, entière — entre le bandeau du haut et
  // SINGULIES en bas —, la frappe se lit ; elle grandit depuis sa place et y retourne (toucher, glisser, Échap)
  let box = null, onScrRef = null;
  function read(on) {
    if (g3) return read3d(on);
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
      if (onScrRef) document.getElementById('offre')?.removeEventListener('scroll', onScrRef);
      setTimeout(() => { mid.style.visibility = ''; big.remove(); veil.remove(); removeEventListener('keydown', esc); }, 520);
      place(true);
    };
    const esc = e => { if (e.key === 'Escape') close(); };
    addEventListener('keydown', esc);
    for (const el of [veil, big]) el.addEventListener('click', close);
    // (12/10, Maxence) défiler (molette, doigt vers le haut ou le bas) ou glisser = refermer, comme on s'y attend
    for (const el of [veil, big]) el.addEventListener('wheel', e => { if (Math.abs(e.deltaY) > 2 || Math.abs(e.deltaX) > 2) { e.preventDefault(); close(); } }, { passive: false });
    let sx = null, sy = 0;
    const tS = e => { sx = e.touches.length === 1 ? e.touches[0].clientX : null; sy = e.touches.length === 1 ? e.touches[0].clientY : 0; };
    const tM = e => { const t = e.touches[0]; if (sx != null && t && Math.hypot(t.clientX - sx, t.clientY - sy) > 24) { sx = null; if (e.cancelable) e.preventDefault(); close(); } };
    for (const el of [veil, big]) { el.addEventListener('touchstart', tS, { passive: true }); el.addEventListener('touchmove', tM, { passive: false }); }
    const host0 = document.getElementById('offre'), y0s = host0 ? host0.scrollTop : 0;
    const onScr = () => { if (host0 && Math.abs(host0.scrollTop - y0s) > 6) close(); };
    host0?.addEventListener('scroll', onScr, { passive: true });
    onScrRef = onScr;
    box = { close };
    place(true);
  }
  // (12/10, Maxence) lire, en direct : la feuille du milieu vient remplir l'écran (exemples3d.js) ; toucher sa carte =
  // la carte de près (toucher encore : la feuille) ; glisser de côté = le poème voisin, toujours ouvert ; glisser vers le
  // bas, la molette, Échap, toucher ailleurs = refermer
  let veil3 = null;
  function read3d(on) {
    if (!on) { if (!reading) return; reading = false; g3.close(); veil3?.classList.remove('on'); removeEventListener('keydown', esc3); return; }
    if (reading) return;
    reading = true; count('alt/lire');
    if (!veil3) {
      veil3 = document.createElement('div'); veil3.className = 'ex-veil3';
      (document.getElementById('offre') || document.body).appendChild(veil3);
      let sx = null, sy = 0, st = 0, hz = null, busy3 = false;
      const tap = (x, y) => { if (g3.cardOpen) { g3.zoom(null); return; } const w = g3.hitWhat(x, y); if (w) g3.zoom(w); else read3d(false); };
      // (12/10, Maxence) glisser de côté, ouverte : la feuille suit le doigt, la voisine arrive à côté au fur et à mesure ;
      // lâchée au-delà du quart (ou d'un geste vif), la voisine vient au milieu ; sinon tout revient. Aucune collision : les
      // deux feuilles restent à une largeur d'écran l'une de l'autre.
      const mv = (x, y) => {
        if (sx == null || busy3) return;
        const dx = x - sx, dy = y - sy;
        if (hz == null && Math.hypot(dx, dy) > 10) hz = Math.abs(dx) > Math.abs(dy);
        if (hz) g3.drag(Math.max(-1, Math.min(1, dx / innerWidth)));
      };
      const fin = (x, y) => {
        if (sx == null) return; const dx = x - sx, dy = y - sy, dtm = performance.now() - st, quick = dtm < 900; sx = null;
        const wasH = hz; hz = null;
        if (busy3) return;
        if (Math.hypot(dx, dy) < 10) { tap(x, y); return; }
        if (wasH) {
          const v = dx / Math.max(1, dtm), d = dx < 0 ? 1 : -1;
          if (Math.abs(dx) > innerWidth * 0.25 || Math.abs(v) > 0.45) { busy3 = true; g3.settle(-d, () => { jump(d); g3.jumpDrag(0); busy3 = false; }); }
          else g3.settle(0);
          return;
        }
        if (quick && Math.abs(dy) > 42) read3d(false);
      };
      veil3.addEventListener('touchstart', e => { const t = e.touches[0]; if (e.touches.length === 1) { sx = t.clientX; sy = t.clientY; st = performance.now(); hz = null; } else sx = null; }, { passive: true });
      veil3.addEventListener('touchmove', e => { if (e.cancelable) e.preventDefault(); const t = e.touches[0]; if (t) mv(t.clientX, t.clientY); }, { passive: false });
      veil3.addEventListener('touchend', e => { const t = e.changedTouches[0]; if (t) fin(t.clientX, t.clientY); if (e.cancelable) e.preventDefault(); });
      veil3.addEventListener('touchcancel', () => { sx = null; hz = null; g3.settle(0); });
      veil3.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') { sx = e.clientX; sy = e.clientY; st = performance.now(); hz = null; } });
      veil3.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') mv(e.clientX, e.clientY); });
      veil3.addEventListener('pointerup', e => { if (e.pointerType === 'mouse') fin(e.clientX, e.clientY); });
      veil3.addEventListener('wheel', e => { e.preventDefault(); if (Math.abs(e.deltaY) > 4) read3d(false); }, { passive: false });
    }
    const sf = { top: 52 + safe('top'), bot: 38 + safe('bottom') };
    veil3.style.top = sf.top + 'px'; veil3.style.bottom = sf.bot + 'px';
    void veil3.offsetWidth; veil3.classList.add('on');
    addEventListener('keydown', esc3);
    g3.open();
  }
  const esc3 = e => { if (e.key === 'Escape') read3d(false); else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { const d = e.key === 'ArrowRight' ? 1 : -1; g3.settle(-d, () => { jump(d); g3.jumpDrag(0); }); } };
  const safe = side => { const d = document.createElement('div'); d.style.cssText = `position:fixed;width:1px;height:env(safe-area-inset-${side});visibility:hidden`; document.body.appendChild(d); const v = d.offsetHeight || 0; d.remove(); return v; };
  // le doigt / la souris
  let x0 = null, y0 = 0, t0 = 0, horiz = null, moved = false;
  const start = (x, y) => { x0 = x; y0 = y; t0 = performance.now(); horiz = null; moved = false; lastDy = 0; };
  let lastDy = 0;
  const move = (x, y) => {
    if (x0 == null) return;
    const dx = x - x0, dy = y - y0; lastDy = dy;
    if (Math.hypot(dx, dy) > 8) moved = true;                    // (12/10) bougé : jamais un toucher (défiler n'ouvre plus le poème)
    if (horiz == null && Math.hypot(dx, dy) > 8) horiz = Math.abs(dx) > Math.abs(dy);
    if (horiz) { off = Math.max(-1.2, Math.min(1.2, dx / (w * 0.86))); place(false); }
  };
  const end = (x, target) => {
    if (x0 == null) return;
    const dx = x - x0, v = dx / Math.max(1, performance.now() - t0); x0 = null;
    if (horiz) {
      if (Math.abs(dx) > w * 0.22 || Math.abs(v) > 0.4) step(dx < 0 ? 1 : -1);
      else { off = 0; place(true); }
      return;
    }
    // (12/10, Maxence) glisser vers le haut = ouvrir le poème du milieu
    if (horiz === false && g3 && lastDy < -40 && performance.now() - t0 < 900) { read(true); return true; }
    if (moved || performance.now() - t0 > 600) return;
    // un toucher : sur un voisin, il vient au milieu ; sur celui du milieu, on lit (ou on revient à la feuille entière)
    const slot = slots.find(s => s.f.contains(target));
    if (!slot) return;
    if (slot.k === 0) read(true); else step(Math.sign(slot.k));
    return true;
  };
  ringEl.addEventListener('touchstart', e => { if (e.touches.length === 1) start(e.touches[0].clientX, e.touches[0].clientY); else x0 = null; }, { passive: true });
  // (12/10) glisser de côté ne fait plus défiler la page (le geste est pris dès qu'il penche à l'horizontale)
  ringEl.addEventListener('touchmove', e => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0]; move(t.clientX, t.clientY);
    if (x0 != null && (horiz || (horiz == null && Math.abs(t.clientX - x0) > Math.abs(t.clientY - y0))) && e.cancelable) e.preventDefault();
  }, { passive: false });
  // (un toucher traité ici n'est pas suivi du « click » simulé : il tombait sur la grande feuille, posée sous le doigt,
  // et la refermait aussitôt)
  ringEl.addEventListener('touchend', e => { const t = e.changedTouches[0]; if (t && end(t.clientX, document.elementFromPoint(t.clientX, t.clientY)) && e.cancelable) e.preventDefault(); });
  ringEl.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') start(e.clientX, e.clientY); });
  ringEl.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') move(e.clientX, e.clientY); });
  ringEl.addEventListener('pointerup', e => { if (e.pointerType === 'mouse') end(e.clientX, e.target); });
  addEventListener('keydown', e => { if (reading || !host.isConnected || !host.getBoundingClientRect().top || host.getBoundingClientRect().top > innerHeight * 0.6) return; if (e.key === 'ArrowLeft') step(-1); else if (e.key === 'ArrowRight') step(1); });
  addEventListener('resize', layout);
  assign(); layout();
  // (12/10, Maxence) les feuilles en direct, dans la lumière du site (exemples3d.js) ; l'image reste dessous, pour la mise
  // en page et sans WebGL2
  let g3 = null;
  if (!ACROSTICHES.length) import('./exemples3d.js').then(m => m.mountSheets3d({ root: ROOT || document.body, slots, exemples: EXEMPLES, safe, watch: ringEl, scroller: ROOT || window, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches }))
    .then(r => { if (!r) return; g3 = r; window.__ex3 = r; ringEl.classList.add('live3d'); for (const s of slots) s.o.style.transform = ''; }).catch(e => console.warn('exemples 3D', e));
  // la molette vers le bas sur le défilé, la page déjà au bout : ouvrir
  ringEl.addEventListener('wheel', e => { const r = document.getElementById('offre'); if (g3 && !reading && e.deltaY > 30 && r && r.scrollTop + r.clientHeight >= r.scrollHeight - 4) read(true); }, { passive: true });
  live();
  return { step, read };
  // ---- (12/10, Maxence : « bien faire réagir ces feuilles à l'environnement ») chaque feuille est un objet posé dans la
  //      même lumière que le reste : elle s'incline à peine vers la souris (le téléphone penché, s'il le dit déjà), elle
  //      respire (deux sinus non accordés, chacune son rythme), et un reflet doux glisse sur le papier du côté de la
  //      lampe. Seulement quand on la voit. ----
  function live() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
    addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; tilt.tx = Math.max(-1, Math.min(1, e.clientX / innerWidth * 2 - 1)); tilt.ty = Math.max(-1, Math.min(1, e.clientY / innerHeight * 2 - 1)); }, { passive: true });
    // (13/10) plus d'orientation du téléphone
    let seen = false, raf = 0, last = 0;
    const f = now => {
      raf = 0;
      if (!seen || document.hidden) return;
      const dt = Math.min(0.1, (now - (last || now)) / 1000); last = now;
      const k = Math.min(1, dt * 2.2); tilt.x += (tilt.tx - tilt.x) * k; tilt.y += (tilt.ty - tilt.y) * k;
      const t = now / 1000;
      if (g3) { raf = 0; return; }
      for (const s of slots) {
        const ph = s.k * 1.9;
        const bx = 0.6 * Math.sin(t * 0.47 + ph) + 0.4 * Math.sin(t * 1.07 + ph * 1.3), by = 0.6 * Math.sin(t * 0.39 + ph * 0.7) + 0.4 * Math.sin(t * 0.93 + ph);
        const ry = 4.5 * tilt.x + 1.1 * bx, rx = -3.5 * tilt.y + 0.9 * by;
        s.o.style.transform = 'perspective(1100px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
        // le reflet : la lampe en haut à gauche, il suit l'inclinaison (une bande large, très douce)
        const p = 30 + 22 * (tilt.x * 0.8 + 0.25 * bx) - 10 * tilt.y;
        s.sh.style.backgroundPosition = p.toFixed(1) + '% 0';
        s.sh.style.opacity = (0.55 + 0.25 * Math.sin(t * 0.31 + ph) + 0.2 * Math.abs(tilt.x)).toFixed(3);
      }
      raf = requestAnimationFrame(f);
    };
    new IntersectionObserver(es => { seen = es.some(e => e.isIntersecting); if (seen && !raf) raf = requestAnimationFrame(f); }).observe(ringEl);
  }
}
