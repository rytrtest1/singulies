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
const ease = u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const lerp = (a, b, u) => a + (b - a) * u;
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
export const objLamp = (L, size, t, tilt, az0 = 0, calm = false) => stageLamp(L, { Hw: size * 2.7 }, t, tilt, 1, az0, calm);
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
  // (17/10) chaque maillage dans sa propre tâche : la préparation ne fait plus d'à-coup
  const yieldT = () => new Promise(r => setTimeout(r, 0));
  const books = await Promise.all(list.map(async (b, i) => {
    await yieldT(); card.addShape('book-' + b.id, { w: b.w, h: b.h, r: 0.6, t: b.t, fine: null });
    const im = new Image(); im.src = base + b.ink; await im.decode();
    const ink = new OffscreenCanvas(Math.round(b.w * PX), Math.round(b.h * PX)), ix = ink.getContext('2d');
    ix.fillStyle = '#000'; ix.fillRect(0, 0, ink.width, ink.height);
    // (une couverture est imprimée, pas tapée : des traits pleins — les filets fins un peu épaissis pour le rendu)
    ix.globalCompositeOperation = 'lighter';
    for (const [dx, dy] of [[0, 0], [0.8, 0], [0, 0.8]]) ix.drawImage(im, dx, dy, ink.width, ink.height);
    return { ...b, i, inkTex: card.makeInk(ink, false) };
  }));
  // (16/10, Maxence : « pouvoir les feuilleter, qu'il s'ouvre à une page qu'on puisse lire ») toucher le livre l'ouvre à
  // une double page tirée au hasard (les vraies pages du PDF, en encre blanche sur son papier noir : tools/livre-pages.py) ;
  // la couverture et la moitié des pages tournent autour du dos ; toucher encore, ou glisser = la page suivante (une
  // feuille tourne) ; glisser vers le bas, Échap, toucher à côté = il se referme. Téléphone : la page de droite au centre,
  // un peu plus grande (on la lit), la gauche dépasse du bord ; ordinateur : la double page centrée.
  for (const b of books) { await yieldT(); card.addShape('bookhalf-' + b.id, { w: b.w, h: b.h, r: 0.6, t: b.t / 2, fine: null }); await yieldT(); card.addShape('leaf-' + b.id, { w: b.w, h: b.h, r: 0.6, t: 0.12, fine: null }); }
  const spreads = await fetch(base + 'livres/pages/pages.json').then(r => r.json()).catch(() => null);
  const texs = new Map(), loading = new Map();
  const pageTex = (b, name) => {
    if (!loading.has(name)) loading.set(name, (async () => {
      const im = new Image(); im.src = base + 'livres/pages/' + name; await im.decode();
      const c = new OffscreenCanvas(Math.round(b.w * PX), Math.round(b.h * PX)); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      const tx = card.makeInk(c, false); texs.set(name, tx); return tx;
    })().catch(e => { console.warn('page', name, e); loading.delete(name); return null; }));
    return loading.get(name);
  };
  const spreadOf = (b, s) => spreads && spreads[b.id] && spreads[b.id][s];
  const loadSpread = (b, s) => { const sp = spreadOf(b, s); return sp ? Promise.all(sp.map(n => pageTex(b, n))) : Promise.resolve(null); };
  const OPEN_T = 1.25, TURN_T = 0.95;
  // (17/10, Maxence : « le livre s'ouvre ; toucher rapproche la page touchée ; toucher encore referme le livre ; le
  // glissé ne montre qu'une double page avant et une après, pour ne pas trop en montrer ») s0 : la double page
  // d'ouverture ; zoom : la page rapprochée (−1 gauche, 1 droite, 0 aucune), zu : son avancée (0 → 1)
  const bk = { book: -1, s: 0, s0: 0, want: 0, u: 0, turn: null, busy: false, zoom: 0, zu: 0, zside: 1 };
  const nowS = () => performance.now() / 1000;
  async function openBook(i) {
    const b = books[i], n = spreads && spreads[b.id] ? spreads[b.id].length : 0;
    if (!n || bk.busy || bk.want) return false;
    bk.busy = true;
    const s = Math.floor(Math.random() * n);
    await loadSpread(b, s);
    // (17/10, Maxence : « zoomer vraiment plus, que le texte soit lisible dès le premier clic ») le livre s'ouvre directement sur la page de droite, rapprochée
    bk.busy = false; bk.book = i; bk.s = s; bk.s0 = s; bk.want = 1; bk.turn = null; bk.zoom = 1; bk.zside = 1;
    loadSpread(b, (s + 1) % n); loadSpread(b, (s - 1 + n) % n);
    return true;
  }
  function closeBook() { if (!bk.want) return false; bk.want = 0; bk.turn = null; bk.zoom = 0; return true; }
  async function turnPage(dir) {
    if (!bk.want || bk.u < 0.98 || bk.turn || bk.busy || bk.book < 0) return false;
    const b = books[bk.book], n = spreads[b.id].length, to = (bk.s + dir + n) % n;
    // (une double page avant, une après : pas plus loin)
    const rel = ((to - bk.s0 + n + 1) % n) - 1;
    if (n > 2 && Math.abs(rel) > 1) return false;
    bk.busy = true; await loadSpread(b, to); bk.busy = false;
    if (!bk.want) return false;
    bk.turn = { from: bk.s, to, dir, t0: nowS() };
    return true;
  }
  let lastF = 0;
  const tex = (b, s, k) => { const sp = spreadOf(b, s); return sp ? texs.get(sp[k]) || null : null; };
  // (posé : son bas sur celui de la feuille du poème)
  const baseY = b => -SH.h / 2 + b.h * MM / 2;
  // ouvert : la place de la double page (décalage x, agrandissement) — portrait : la page de droite au centre, plus grande
  const openFit = (b, cw, ch, e) => { const land = cw > ch * 0.95; return { sx: land ? b.w / 2 * MM * e * Math.min(1.5, 290 / b.h) : 0, k: 1 + (Math.min(1.5, 290 / b.h) - 1) * e }; };   // (aussi haut que la feuille A4 du poème : on lit)
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
    { const tn = nowS(), dt = lastF ? Math.min(0.1, tn - lastF) : 0; lastF = tn;
      bk.u = Math.max(0, Math.min(1, bk.u + (bk.want ? 1 : -1.3) * dt / OPEN_T));
      if (bk.zoom) bk.zside = bk.zoom;
      bk.zu = Math.max(0, Math.min(1, bk.zu + (bk.zoom && bk.want ? 1 : -1.4) * dt / 0.75));
      if (bk.turn && tn - bk.turn.t0 >= TURN_T) { bk.s = bk.turn.to; bk.turn = null; }
      if (!bk.want && bk.u <= 0) bk.book = -1; }
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
      if (bk.book === b.i && bk.u > 0) { drawOpen(v, P, b, d * sp, dz, rx, ry, rz, cw, ch); continue; }
      card.draw(v.vp, v.eye, P, {
        model: M4.mul(M4.model(rx, ry, rz, d * sp, baseY(b), -b.t * MM / 2 + dz), S(MM)), lod: 'book-' + b.id, seed: 31 + b.i * 7, noLogo: true,
        paperXf: [0.8, -0.4, 0, 0], warp: [0, 0, 0], paperTile: 0.6 * 87 / 0.7, paperLo: 0.75,
        inkBack: b.inkTex, book: [b.t, BOOK.cover, BOOK.sheet, BOOK.spineR], hinge: [BOOK.hinge, 0.09], fade: Math.min(1, 0.15 + near * 1.2),
      });
    }
  }
  // le livre ouvert : le bloc du dessous (la page de droite), la couverture et la moitié des pages qui tournent autour du
  // dos (la page de gauche dessous), et, quand on feuillette, une feuille qui tourne
  function drawOpen(v, P, b, x0, dz, rx, ry, rz, cw, ch) {
    const e = ease(bk.u), { sx, k } = openFit(b, cw, ch, e), calm = 1 - 0.85 * e;
    const zp = zoomPose(b, v, cw, ch, sx, k), zu = ease(bk.zu);
    const Mb = M4.mul(M4.model(rx * calm * (1 - zu), ry * calm * (1 - zu), rz * calm * (1 - zu), x0 + lerp(sx, zp.x, zu), lerp(baseY(b) + (k - 1) * b.h * MM / 2, zp.y, zu), -b.t * MM / 2 + dz), S(MM * lerp(k, zp.k, zu)));
    const T = (x, y, z) => M4.model(0, 0, 0, x, y, z), Ry = a => M4.model(0, a, 0, 0, 0, 0);
    const look = { seed: 31 + b.i * 7, noLogo: true, paperXf: [0.8, -0.4, 0, 0], warp: [0, 0, 0], paperTile: 0.6 * 87 / 0.7, paperLo: 0.75, fade: 1 };
    const tr = bk.turn, tu = tr ? ease(Math.min(1, (nowS() - tr.t0) / TURN_T)) : 0;
    // ce que montre chaque bloc pendant qu'une feuille tourne : dessous, la page d'arrivée ; la feuille, celles du départ
    const sR = tr ? (tr.dir > 0 ? tr.to : tr.from) : bk.s, sL = tr ? (tr.dir > 0 ? tr.from : tr.to) : bk.s;
    const half = { lod: 'bookhalf-' + b.id, book: [b.t / 2, BOOK.cover, BOOK.sheet, BOOK.spineR] };
    card.draw(v.vp, v.eye, P, { model: M4.mul(Mb, T(0, 0, -b.t / 4)), ...half, ...look, inkBack: tex(b, sR, 1) });
    const th = Math.PI * e;
    card.draw(v.vp, v.eye, P, { model: M4.mul(Mb, M4.mul(M4.mul(T(-b.w / 2, 0, 0), Ry(-th)), T(b.w / 2, 0, b.t / 4))), ...half, ...look, seed: look.seed + 3,
      inkBack: b.inkTex, ink: tex(b, sL, 0), hinge: th < Math.PI / 2 ? [BOOK.hinge, 0.09] : [0, 0] });
    if (tr) {
      // la feuille : sa face du dessus (sur la droite) = la page de droite qu'on quitte (ou qu'on retrouve), dessous la
      // page de gauche d'arrivée (ou qu'on quitte) ; elle se soulève un peu en tournant
      const a = Math.PI * (tr.dir > 0 ? tu : 1 - tu), lift = 2.5 * Math.sin(a);
      const fR = tr.dir > 0 ? tex(b, tr.from, 1) : tex(b, tr.to, 1), fL = tr.dir > 0 ? tex(b, tr.to, 0) : tex(b, tr.from, 0);
      card.draw(v.vp, v.eye, P, { model: M4.mul(Mb, M4.mul(M4.mul(T(-b.w / 2, 0, 0.07 + lift), Ry(-a)), T(b.w / 2, 0, 0.06))), lod: 'leaf-' + b.id, ...look, seed: look.seed + 9,
        inkBack: fR, ink: fL });
    }
  }
  // la page rapprochée : son centre au centre de la vue (entre le bandeau et la légende), aussi grande que l'écran le permet
  // (repère du livre : le dos à x = −w/2, la page de droite centrée en 0, la gauche en −w)
  function zoomPose(b, v, cw, ch, sx, k) {
    // (17/10, Maxence : « comment on fait mieux pour le livre sur PC ? ») sur ordinateur, la page prend toute la hauteur entre le
    // bandeau et le signe du bas, et plus : la page déborde en haut et en bas (ses marges sont vides, le texte est au milieu) sous un
    // fondu (lettre.css, .book-open) — le texte se lit ; la légende s'efface le temps de la lecture. Sur téléphone, comme avant
    const land = cw > ch * 0.95, ins = land ? 150 : v.ins;
    const Wv = v.Hw * cw / ch, Hf = (ch - ins - v.top) / ch * v.Hw;   // (la place libre)
    const kz = Math.max(k, Math.min(0.94 * Wv / (b.w * MM), (land ? 1.75 : 0.9) * Hf / (b.h * MM)));
    const lx = bk.zside < 0 ? -b.w : 0;
    return { x: -lx * MM * kz, y: -2 - (v.ins - ins) / 2 * v.Hw / ch, k: kz };
  }
  const cur = p => books[Math.max(0, Math.min(books.length - 1, Math.round(p)))];
  // la prise (px CSS) : le livre du centre ; son bas (unités) : pour la légende
  function rect(cw, ch, p) {
    const v = stageView(cw, ch), b = cur(p), y = baseY(b);
    const e = bk.book === b.i ? ease(bk.u) : 0, { sx, k } = openFit(b, cw, ch, e), yc = y + (k - 1) * b.h * MM / 2;
    const a = v.project(sx + (-b.w / 2 - b.w * e) * MM * k, yc + b.h * MM * k / 2), c = v.project(sx + b.w * MM * k / 2, yc - b.h * MM * k / 2);
    return { l: a[0], t: a[1], r: c[0], b: c[1], spine: v.project(sx - b.w / 2 * MM * k, yc)[0] };
  }
  // (16/10) les gestes sur le livre : toucher = l'ouvrir / la page suivante / (à côté) le refermer ; glisser de côté
  // ouvert = feuilleter ; refermer (glisser vers le bas, Échap, changer de livre)
  // (17/10, Maxence) fermé : toucher l'ouvre ; ouvert : toucher une page la rapproche ; rapprochée : toucher le referme ;
  // à côté : il se referme
  function tap(x, y, cw, ch, p) {
    const r = rect(cw, ch, p), inB = x > r.l && x < r.r && y > r.t && y < r.b;
    if (bk.want) {
      if (bk.zoom || bk.zu > 0.05) { closeBook(); return true; }
      if (inB && bk.u > 0.9 && !bk.turn) { bk.zoom = x < r.spine ? -1 : 1; return true; }
      closeBook(); return true;
    }
    if (inB) { openBook(Math.max(0, Math.min(books.length - 1, Math.round(p)))); return true; }
    return false;
  }
  const swipe = dir => (bk.want ? (turnPage(dir), true) : false);
  // (12/10, Maxence : « cohérence globale des zones ») chaque livre est posé sur la même ligne que le bas de la feuille du
  // poème : la description est au même endroit sur toutes les pages
  function bottom() { return -SH.h / 2; }
  return { frame, rect, bottom, tap, swipe, close: closeBook, isOpen: () => !!bk.want, moving: () => (bk.u > 0 && bk.u < 1) || !!bk.turn || (bk.zu > 0 && bk.zu < 1) };
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
