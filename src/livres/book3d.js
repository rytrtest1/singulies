// Le livre d'Eternel, « Pensées poétiques », en direct (11/10) : le vrai moteur des cartes (même papier noir, même
// lampe rasante, même courbe photo), un broché de trois quarts — 127 × 203 mm, 6,7 mm (KDP). Une seule boîte :
// la couverture (son encre blanche, imprimée : traits pleins), la rainure de la charnière, le dos que la couverture
// enveloppe (arêtes arrondies), la tranche des pages NOIRES, feuille à feuille (cardRenderer, uBook).
// Il respire comme le reste : le livre se balance à peine (deux sinus non synchronisés), la lampe tourne lentement
// autour et monte / descend (comme sur les cartes, jamais du côté du regard), la souris l'incline un peu (ordinateur).
// À t = 0 tout est au repos : la même image que public/livres/livre.jpg (l'aperçu du bandeau ; tools/livre-shot.mjs).
import { createCardRenderer, M4 } from '../cards/cardRenderer.js';
import { LOOK } from '../cards/scene.js';

export const BOOK = { w: 127, h: 203.2, t: 6.7, cover: 0.3, sheet: 0.1, spineR: 1.4, hinge: 7.5 };
export const BOOK_ASPECT = 1000 / 1300;
const FOV = 26 * Math.PI / 180, TILT = 0.24, TF = Math.tan(FOV / 2);
const PX = 8;                                              // carte d'encre : 8 px / mm
const CAM_AZ = -Math.PI / 2;                               // le regard vient du bas de l'écran
const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));

export async function createBook(gl, base = './') {
  const card = await createCardRenderer(gl, base);
  card.addShape('book', { w: BOOK.w, h: BOOK.h, r: 0.6, t: BOOK.t, fine: null });
  const im = new Image(); im.src = base + 'livres/couverture-encre.png'; await im.decode();
  const ink = new OffscreenCanvas(Math.round(BOOK.w * PX), Math.round(BOOK.h * PX)), ix = ink.getContext('2d');
  ix.fillStyle = '#000'; ix.fillRect(0, 0, ink.width, ink.height);
  // (une couverture est imprimée, pas tapée : des traits pleins — les filets fins un peu épaissis pour le rendu)
  ix.globalCompositeOperation = 'lighter';
  for (const [dx, dy] of [[0, 0], [0.8, 0], [0, 0.8]]) ix.drawImage(im, dx, dy, ink.width, ink.height);
  const coverInk = card.makeInk(ink, false);
  const L = { ...LOOK };

  // t (s) : le temps de la respiration (0 = repos) ; tilt : { x, y } ∈ [−1, 1] (la souris)
  function frame(W, H, t = 0, tilt = { x: 0, y: 0 }) {
    // le livre : de trois quarts (on voit l'épaisseur, la tranche des pages), qui se balance à peine
    const bx = 0.6 * Math.sin(t * 0.61) + 0.4 * Math.sin(t * 1.37), by = 0.6 * Math.sin(t * 0.47) + 0.4 * Math.sin(t * 1.13);
    const rx = -0.24 + 0.022 * bx - 0.07 * tilt.y, ry = -0.36 + 0.03 * by + 0.1 * tilt.x, rz = 0.035 + 0.006 * Math.sin(t * 0.29);
    const dz = 2.2 * Math.sin(t * 0.29);
    const y0 = -BOOK.h / 2 - 10, y1 = BOOK.h / 2 + 6;
    const Hw = Math.max((y1 - y0) * 1.08, (BOOK.w + 30) * 1.08 * H / W), D = Hw / (2 * TF), cy = (y0 + y1) / 2;
    const eye = [0, cy - D * Math.sin(TILT), D * Math.cos(TILT)];
    const vp = M4.mul(M4.perspective(FOV, W / H, D * 0.25, D * 3), M4.lookAt(eye, [0, cy, 0], [0, 1, 0]));
    // la lampe des cartes : rasante, de côté, tenue hors du secteur du regard ; elle tourne et respire (≈ 19 s, 9 s)
    const kf = 1.25, kk = Hw / 235 * kf, R = L.lightR0 * Hw * kf, Z = L.lightZ * kk, D0 = Math.hypot(R, Z), el0 = Math.atan2(Z, R);
    const back = CAM_AZ + Math.PI, lim = Math.PI - L.lampGap;
    let rel = wrapA(L.lightAz + L.breathAz * (0.72 * Math.sin(t * 0.33) + 0.28 * Math.sin(t * 0.69)) + 0.5 * tilt.x - back);
    rel = lim * Math.tanh(rel / lim);
    const az = back + rel, mid = (L.elMin + L.elMax) / 2, half = (L.elMax - L.elMin) / 2;
    const el = mid + half * Math.tanh((L.elBase + L.breathEl * (0.7 * Math.sin(t * 0.27) + 0.3 * Math.sin(t * 0.61)) + 0.2 * tilt.y - mid) / half);
    const P = { ...L, lightPos: [Math.cos(az) * D0 * Math.cos(el), cy + Math.sin(az) * D0 * Math.cos(el), D0 * Math.sin(el)],
      light: L.light * kk * kk * Math.sin(el0) / Math.sin(el), spotI: 0, inkWear: 0, inkVar: 0.08, inkPress: 0, inkPaper: 1.5, inkOrg: 0, inkThr: 0.2 };
    gl.viewport(0, 0, W, H);
    gl.clearColor(6 / 255, 6 / 255, 6 / 255, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    card.draw(vp, eye, P, {
      model: M4.model(rx, ry, rz, 0, 0, -BOOK.t / 2 + dz), lod: 'book', seed: 31, noLogo: true,
      paperXf: [0.8, -0.4, 0, 0], warp: [0, 0, 0], paperTile: 0.6 * 87 / 0.7, paperLo: 0.4,
      inkBack: coverInk, book: [BOOK.t, BOOK.cover, BOOK.sheet, BOOK.spineR], hinge: [BOOK.hinge, 0.09],
    });
  }
  return { frame };
}

// Sur la page : un canvas posé exactement sur l'image (même boîte) ; l'image reste dessous tant que la première image
// n'est pas dessinée (et si WebGL2 manque). Dessine seulement quand on le voit.
export async function mountBook(box, base = './', { reduced = false } = {}) {
  const img = box.querySelector('img');
  const canvas = document.createElement('canvas');
  canvas.className = 'lt-book-c';
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, depth: true, premultipliedAlpha: false });
  if (!gl) return null;
  let book;
  try { book = await createBook(gl, base); } catch { return null; }
  box.appendChild(canvas);
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!reduced && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; tilt.tx = Math.max(-1, Math.min(1, (e.clientX / innerWidth) * 2 - 1)); tilt.ty = Math.max(-1, Math.min(1, (e.clientY / innerHeight) * 2 - 1)); }, { passive: true });
  }
  let seen = true, raf = 0, t0 = performance.now(), last = t0, lost = false, shown = false;
  // (page montée mais pas montrée : visibility hidden — on attend, sans dessiner)
  const hiddenNow = () => getComputedStyle(box).visibility === 'hidden';
  const draw = now => {
    raf = 0;
    if (lost) return;
    if (shown && hiddenNow()) { setTimeout(go, 400); return; }
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const W = Math.max(2, Math.round(box.clientWidth * dpr)), H = Math.round(W / BOOK_ASPECT);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const k = Math.min(1, dt * 1.6); tilt.x += (tilt.tx - tilt.x) * k; tilt.y += (tilt.ty - tilt.y) * k;
    book.frame(W, H, reduced ? 0 : (now - t0) / 1000, tilt);
    if (!shown) { shown = true; canvas.classList.add('on'); if (img) img.style.visibility = 'hidden'; }
    if (!reduced && seen && !document.hidden) raf = requestAnimationFrame(draw);
  };
  const go = () => { if (!raf && !lost) raf = requestAnimationFrame(draw); };
  new IntersectionObserver(es => { seen = es.some(e => e.isIntersecting); if (seen) go(); }).observe(box);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) go(); });
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; canvas.remove(); if (img) img.style.visibility = ''; });
  go();
  return { canvas };
}
