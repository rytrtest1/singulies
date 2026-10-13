// Le livre d'Eternel, « Pensées poétiques », en direct (11/10) : le vrai moteur des cartes (même papier noir, même
// lampe rasante, même courbe photo), un broché vu de face (12/10, Maxence) — 127 × 203 mm, 6,7 mm (KDP). Une seule boîte :
// la couverture (son encre blanche, imprimée : traits pleins), la rainure de la charnière, le dos que la couverture
// enveloppe (arêtes arrondies), la tranche des pages NOIRES, feuille à feuille (cardRenderer, uBook).
// Il respire comme le reste : le livre se balance à peine (deux sinus non synchronisés), la lampe tourne lentement
// autour et monte / descend (comme sur les cartes, jamais du côté du regard). Le téléphone qu'on penche le fait
// vraiment tourner (gyroscope : on voit la tranche, le dos, la lumière glisse) ; sur ordinateur, la souris.
// (12/10, Maxence) On le prend : le doigt (ou la souris tenue) le fait tourner dans tous les sens, il continue sur son
// élan, puis revient doucement de face.
// À t = 0 tout est au repos : la même image que public/livres/livre.jpg (l'aperçu du bandeau ; tools/livre-shot.mjs).
import { createCardRenderer, M4 } from '../cards/cardRenderer.js';
import { LOOK } from '../cards/scene.js';
import { stageView, MM, SH } from '../app/stage.js';

// (12/10, Maxence) les deux livres, dans le monde commun (src/app/stage.js) : à l'échelle de la feuille A4 du poème,
// centrés sur son horizon ; l'épaisseur de chacun = son dos mesuré sur le PDF KDP (le nombre de pages)
export const BOOKS = [
  { id: 'recueil', w: 127, h: 203.2, t: 6.7, ink: 'livres/couverture-encre.png' },     // 5 × 8 po
  { id: 'journal', w: 152.4, h: 228.6, t: 15.9, ink: 'livres/journal-encre.png' },     // 6 × 9 po
];
export const BOOK = { ...BOOKS[0], cover: 0.3, sheet: 0.1, spineR: 1.4, hinge: 7.5 };
export const BOOK_ASPECT = 1000 / 1300;
const PX = 8;                                              // carte d'encre : 8 px / mm
const CAM_AZ = -Math.PI / 2;                               // le regard vient du bas de l'écran
const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
const S = k => new Float32Array([k, 0, 0, 0, 0, k, 0, 0, 0, 0, k, 0, 0, 0, 0, 1]);

// la lampe des cartes, à la mesure de la vue commune : rasante, de côté, tenue hors du secteur du regard ; elle tourne
// et respire (≈ 19 s, 9 s) — la même pour tous les objets des pages
// (12/10, Maxence : « artefact de lumière sur la tranche quand on le bouge, trop de lumière ou trop sombre ») un objet
// qu'on prend en main (le livre, l'enveloppe d'un poème par mois) : la lampe plus haute (≈ 46°, elle respire à peine)
// et plus loin — la force compensée pour la face (donc énorme sous une lampe rasante) ne fait plus flamber la tranche
// quand elle se tourne vers elle — et un peu plus de lumière ambiante : une face tournée loin de la lampe ne tombe plus
// dans le noir
// (13/10, Maxence : « refais la lumière et la respiration des gros objets, prends la carte en exemple ») la lampe de la
// carte, à la mesure de l'OBJET (pas de la vue) : la scène des cartes pose sa lampe à ≈ 2,7 largeurs de carte (téléphone :
// la carte fait 80 % de l'écran) ; ici, la même proportion pour un objet de largeur size (unités) — mêmes ombres
// rasantes, même dégradé d'un bord à l'autre, même respiration (orbite ≈ 19 / 9 s, hauteur 17°–42°) — au lieu d'une
// lampe lointaine et haute qui en faisait un aplat gris délavé (mesuré : livre ≈ 45 uniforme, carte 12–30)
export const objLamp = (L, size, t, tilt, az0 = 0) => stageLamp(L, { Hw: size * 2.7 }, t, tilt, 1, az0, false);
export function stageLamp(L, v, t, tilt, kf = 1.25, az0 = 0, calm = false) {
  const Hw = v.Hw, kk = Hw / 235 * kf, R = L.lightR0 * Hw * kf, Z = L.lightZ * kk, D0 = Math.hypot(R, Z), el0 = Math.atan2(Z, R);
  const back = CAM_AZ + Math.PI, lim = Math.PI - L.lampGap;
  let rel = wrapA(L.lightAz + az0 + L.breathAz * (calm ? 0.5 : 1) * (0.72 * Math.sin(t * 0.33) + 0.28 * Math.sin(t * 0.69)) + 0.5 * tilt.x - back);
  rel = lim * Math.tanh(rel / lim);
  const az = back + rel, mid = (L.elMin + L.elMax) / 2, half = (L.elMax - L.elMin) / 2;
  const el = calm ? 0.7 + 0.05 * Math.sin(t * 0.27) + 0.06 * tilt.y
    : mid + half * Math.tanh((L.elBase + L.breathEl * (0.7 * Math.sin(t * 0.27) + 0.3 * Math.sin(t * 0.61)) + 0.2 * tilt.y - mid) / half);
  return { ...L, lightPos: [Math.cos(az) * D0 * Math.cos(el), Math.sin(az) * D0 * Math.cos(el), D0 * Math.sin(el)],
    light: L.light * kk * kk * Math.sin(el0) / Math.sin(el), spotI: 0, ...(calm ? { env: L.env * 1.35 } : {}) };
}

export async function createBook(gl, base = './', list = BOOKS) {
  const card = await createCardRenderer(gl, base);
  const L = { ...LOOK };
  const books = await Promise.all(list.map(async (b, i) => {
    card.addShape('book-' + b.id, { w: b.w, h: b.h, r: 0.6, t: b.t, fine: null });
    const im = new Image(); im.src = base + b.ink; await im.decode();
    const ink = new OffscreenCanvas(Math.round(b.w * PX), Math.round(b.h * PX)), ix = ink.getContext('2d');
    ix.fillStyle = '#000'; ix.fillRect(0, 0, ink.width, ink.height);
    // (une couverture est imprimée, pas tapée : des traits pleins — les filets fins un peu épaissis pour le rendu)
    ix.globalCompositeOperation = 'lighter';
    for (const [dx, dy] of [[0, 0], [0.8, 0], [0, 0.8]]) ix.drawImage(im, dx, dy, ink.width, ink.height);
    return { ...b, i, inkTex: card.makeInk(ink, false) };
  }));
  // (posé : son bas sur celui de la feuille du poème)
  const baseY = b => -SH.h / 2 + b.h * MM / 2;
  // l'écart entre deux livres : hors de l'écran (on n'en voit qu'un à la fois ; ils glissent de côté)
  const span = (v, W, H) => v.Hw * W / H * 0.62 + 70;

  // W, H : px du canvas ; cw, ch : px CSS ; t (s) : la respiration ; tilt { x, y } ∈ [−1, 1] ; spin { x, y } (rad, le
  // livre tourné à la main) ; p : l'étape (continue) — le livre p est au centre, les autres glissent de côté
  function frame(W, H, cw, ch, t = 0, tilt = { x: 0, y: 0 }, spin = { x: 0, y: 0 }, p = 0) {
    const v = stageView(cw, ch);
    const lx = window.__lamp || {}, bc = books[Math.max(0, Math.min(books.length - 1, Math.round(p)))];
    const P = { ...(lx.kf ? stageLamp(L, v, t, tilt, lx.kf, lx.az ?? 0, lx.calm ?? false) : objLamp(L, bc.w * MM, t, tilt)), inkWear: 0, inkVar: 0.08, inkPress: 0, inkPaper: 1.5, inkOrg: 0, inkThr: 0.2 };
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    const sp = span(v, cw, ch);
    for (const b of books) {
      const d = b.i - p;
      if (Math.abs(d) > 1.2) continue;
      const near = Math.max(0, 1 - Math.abs(d));
      // le livre : de face, droit ; il respire à peine (deux sinus) et tourne franchement quand on penche le téléphone
      const ph = b.i * 1.7;
      // (13/10, Maxence) une respiration ample, d'elle-même : il tourne lentement d'un côté puis de l'autre (on voit son
      // dos, son épaisseur, la tranche des pages), bascule un peu — deux sinus lents non synchronisés
      const bx = 0.6 * Math.sin(t * 0.23 + ph) + 0.4 * Math.sin(t * 0.51 + ph), by = 0.7 * Math.sin(t * 0.19 + ph) + 0.3 * Math.sin(t * 0.43 + 2 * ph);
      const rx = 0.09 * bx - 0.2 * tilt.y * near + spin.x * near, ry = 0.42 * by + 0.2 * tilt.x * near + spin.y * near + 0.35 * d,   // (inclinaison : celle de la carte, 0,2)
        rz = 0.008 * Math.sin(t * 0.29 + ph);
      const dz = 2.2 * Math.sin(t * 0.29 + ph) * MM;
      card.draw(v.vp, v.eye, P, {
        model: M4.mul(M4.model(rx, ry, rz, d * sp, baseY(b), -b.t * MM / 2 + dz), S(MM)), lod: 'book-' + b.id, seed: 31 + b.i * 7, noLogo: true,
        paperXf: [0.8, -0.4, 0, 0], warp: [0, 0, 0], paperTile: 0.6 * 87 / 0.7, paperLo: 0.75,
        inkBack: b.inkTex, book: [b.t, BOOK.cover, BOOK.sheet, BOOK.spineR], hinge: [BOOK.hinge, 0.09], fade: Math.min(1, 0.15 + near * 1.2),
      });
    }
  }
  const cur = p => books[Math.max(0, Math.min(books.length - 1, Math.round(p)))];
  // la prise (px CSS) : le livre du centre ; son bas (unités) : pour la légende
  function rect(cw, ch, p) { const v = stageView(cw, ch), b = cur(p), y = baseY(b), a = v.project(-b.w * MM / 2, y + b.h * MM / 2), c = v.project(b.w * MM / 2, y - b.h * MM / 2); return { l: a[0], t: a[1], r: c[0], b: c[1] }; }
  // (12/10, Maxence : « cohérence globale des zones ») chaque livre est posé sur la même ligne que le bas de la feuille du
  // poème : la description est au même endroit sur toutes les pages
  function bottom() { return -SH.h / 2; }
  return { frame, rect, bottom };
}

// (12/10) un objet en direct sur une page, dans le monde commun : un canvas TRANSPARENT qui couvre l'écran (l'objet y est
// à sa place et à son échelle — plus de boîte, donc plus de cadre noir qui passe sur l'objet voisin en changeant de
// page) ; grab : l'élément posé sur l'objet (on l'y prend en main). make(gl) → { frame(W, H, cw, ch, t, tilt, spin, p),
// rect, bottom } (frame rend true s'il bouge encore de lui-même) ; o.pt() : l'étape voulue ; o.step(dt) → encore en mouvement ? (l'étape qui glisse) ; o.p() : l'étape. Mêmes gestes partout : la
// souris, le téléphone penché, la main.
export async function mountStage(host, grab, make, { reduced = false, step = () => false, p = () => 0, pt = p } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'lt-cv';
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: true, depth: true, premultipliedAlpha: false });
  if (!gl) return null;
  let scene;
  try { scene = await make(gl); } catch (e) { console.warn('objet', e); return null; }
  host.insertBefore(canvas, host.firstChild);
  const tilt = { x: 0, y: 0, tx: 0, ty: 0, gyro: false };
  let raf = 0, t0 = performance.now(), last = t0, lost = false, shown = false;
  // (page montée mais pas montrée : visibility hidden — on attend, sans dessiner)
  const hiddenNow = () => getComputedStyle(host).visibility === 'hidden';
  const onScreen = () => shown && !document.hidden && !hiddenNow();
  if (!reduced && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; tilt.tx = Math.max(-1, Math.min(1, (e.clientX / innerWidth) * 2 - 1)); tilt.ty = Math.max(-1, Math.min(1, (e.clientY / innerHeight) * 2 - 1)); }, { passive: true });
  }
  // le téléphone penché (gyroscope) : on tourne l'objet dans la main. Le zéro suit doucement la tenue (≈ 4 s) ;
  // iPhone : la demande d'accès au lâcher d'un toucher sur cette page (jamais au pointerdown) ; Android : sans demande.
  let b0 = null, g0 = 0, oT = 0;
  const onOrient = e => {
    if (e.beta == null || e.gamma == null || reduced) return;
    const now = performance.now(), dt = oT ? Math.min(0.2, (now - oT) / 1000) : 0; oT = now;
    if (b0 == null) { b0 = e.beta; g0 = e.gamma; }
    const k = dt / 4; b0 += (e.beta - b0) * k; g0 += (e.gamma - g0) * k;
    tilt.gyro = true;
    tilt.tx = Math.tanh((e.gamma - g0) / 18); tilt.ty = Math.tanh(-(e.beta - b0) / 18);
  };
  const DO = null;   // (13/10, Maxence) plus jamais l'orientation du téléphone : la respiration suffit
  let asked = false;
  const ask = () => {
    if (asked || !DO || reduced || !onScreen()) return;
    asked = true;
    if (typeof DO.requestPermission === 'function') DO.requestPermission().then(r => { if (r === 'granted') addEventListener('deviceorientation', onOrient); }).catch(() => { asked = false; });
    else addEventListener('deviceorientation', onOrient);
  };
  addEventListener('touchend', ask, { passive: true });
  addEventListener('click', ask);
  // (13/10, Maxence) plus de prise en main : le toucher ou la souris tenue ne font plus tourner l'objet (seuls le
  // téléphone penché et la souris qui passe l'inclinent, comme la carte)
  const spin = { x: 0, y: 0 };
  const stepSpin = () => false;
  const draw = now => {
    raf = 0;
    if (lost) return;
    if (shown && hiddenNow()) { setTimeout(go, 400); return; }
    const dpr = Math.min(devicePixelRatio || 1, 2), cw = innerWidth, ch = innerHeight;
    const W = Math.max(2, Math.round(cw * dpr)), H = Math.max(2, Math.round(ch * dpr));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const k = Math.min(1, dt * (tilt.gyro ? 7 : 1.6)); tilt.x += (tilt.tx - tilt.x) * k; tilt.y += (tilt.ty - tilt.y) * k;
    const turning = stepSpin(dt, now), moving = step(dt);
    const live = scene.frame(W, H, cw, ch, reduced ? 0 : (now - t0) / 1000, tilt, spin, p(), pt());
    if (!shown) { shown = true; canvas.classList.add('on'); if (DO && typeof DO.requestPermission !== 'function') ask(); }
    if ((!reduced || turning || moving || live === true) && !document.hidden) raf = requestAnimationFrame(draw);
  };
  const go = () => { if (!raf && !lost) raf = requestAnimationFrame(draw); };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) go(); });
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; canvas.remove(); host.querySelector('.lt')?.classList.add('flat'); });
  go();
  return { canvas, scene, go };
}
