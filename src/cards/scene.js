// Scène 2 — « une carte, deux faces » (04/10). Monde en mm, cartes dans le plan XY face à la caméra.
// Le paquet (au centre, à sa place) tire pour la personne : la carte du dessus se soulève, se retourne en
// l'air et se pose sur le paquet, question visible. Écarter la carte d'un glissé de côté (ou toucher le paquet) = une
// autre. Répondre : sous la question dépasse une feuille du même papier, sans logo, où un curseur respire ;
// toucher la carte ou la feuille = la feuille se dégage sous la question, le clavier s'ouvre ; à chaque retour
// à la ligne la feuille monte d'un cran (machine à écrire), les lignes passées glissent sous la question.
// Après deux questions écartées, le paquet OFFRE une carte blanche (un curseur y respire) qui reste posée
// sous le paquet ; « passer » apparaît avec elle. Donner = toucher le signe sous la carte écrite (page).
// Lumière : manière 1 (orbite + hauteur) + la carte en focus s'incline vers la souris / le téléphone.
import { createCardRenderer, M4, CARD } from './cardRenderer.js';
import { loadTypeFont, makeInkMap, makeAnswerInk, makeSheetInk, SHEET_LINE, TYPE } from './ink.js';
import { createNameRelief } from './nameRelief.js';
import { createRng } from '../field/rng.js';
import QUESTIONS from './questions.json';

export const LOOK = {
  // réglé par Maxence sur téléphone (04/10). Cartes noires ; lampe en orbite + hauteur (manière 1, 60 %) ; la
  // carte en focus s'incline vers la souris / le mouvement du téléphone, celle en attente respire et est baissée.
  light: 0.111, lightR: 400, env: 0.28, albedo: 0.029, exposure: 0.74, lightAz: 0.67, lightR0: 1.0, lightZ: 210, tiltAmp: 1.45,
  lightMode: 1, elevAmp: 0.45, flashZ: 70, cardTilt: 0.2, lightVar: 0.6, sway: 0.06, unfocusDim: 0.25, spot: 0.06,
  h: 0.19, b: 1.32, crease: 0, fiber: 0.06, foot: 0.76, footW: 0.165, parallax: 0,
  rough: 0.64, spec: 3.1, sheen: 0, glint: 0.35, edge: 3, grain: 1.25, diffRough: 0.65, envSpec: 0.32, toe: 0.0078,
  nameFlat: 0.42,   // prénom à plat (gris en retrait) ; 0 → prénom en relief (nameAlb, nameRelief…)
  nameAlb: 0.5, nameRelief: 0.05, nameBevel: 0.07, nameSpec: 0.4, nameGrain: 1.25, nameFiber: 0.06, nameGlint: 0.35,
  inkAlb: 0.35, inkPress: 0.1, inkWear: 3, inkThr: 0.35, inkVar: 0.6, inkPaper: 11.5, inkOrg: 0,
  offerAfter: 2,     // questions écartées avant que le paquet offre la carte blanche
};
const FOV = 26 * Math.PI / 180;
const TILT = 0.22;                 // la caméra regarde un peu d'en haut
const STACK = 12, PITCH = 0.15;
const DRAW_T = 1.5, FLIP_T = 0.75, DISCARD_T = 0.6, OFFER_T = 1.0, TAKE_T = 0.9;

const clamp01 = u => Math.min(1, Math.max(0, u));
const sstep = (a, b, x) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const ease = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
const lerp = (a, b, u) => a + (b - a) * u;
const lerpPose = (a, b, u) => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), z: lerp(a.z, b.z, u), rx: lerp(a.rx, b.rx, u), ry: lerp(a.ry, b.ry, u), rz: lerp(a.rz, b.rz, u) });
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k], norm3 = a => mul3(a, 1 / Math.hypot(...a));
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// lettre sans accent, en capitale (pour faire réagir le prénom aux lettres tapées)
const bare = ch => ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

export async function createCardScene(gl, { base = './', seed = (Math.random() * 1e9) >>> 0, look = {}, on = {} } = {}) {
  const card = await createCardRenderer(gl, base);
  const nameR = await createNameRelief(gl, card.paperTex);
  await loadTypeFont(base);
  const L = { ...LOOK, ...look };
  const rnd = createRng(seed);
  const emit = (k, d) => { try { on[k] && on[k](d); } catch (e) { console.error(e); } };

  const order = QUESTIONS.map(q => q.id);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const variant = () => ({
    seed: rnd() * 100,
    paperXf: [rnd.range(-2.5, 2.5), rnd.range(-1.5, 1.5), rnd() < 0.5 ? 0 : Math.PI, 0],
    logoOff: [rnd.range(-0.15, 0.15), rnd.range(-0.15, 0.15)],
    warp: [rnd.range(0.05, 0.35), rnd.range(-0.2, 0.05), rnd.range(-0.12, 0.12)],
    jx: rnd.range(-0.5, 0.5), jy: rnd.range(-0.4, 0.4), jr: rnd.range(-0.012, 0.012),
  });
  const sheetVariant = () => ({ ...variant(), noLogo: true, warp: [rnd.range(0.02, 0.08), 0, 0], paperXf: [rnd.range(-2.5, 2.5), rnd.range(-1.5, 1.5), 0, 0] });
  const stack = Array.from({ length: STACK }, variant);
  let next = 0, discards = 0;
  // cartes : { kind: 'question' | 'blank', id, v, ink, anim, t0, from, text, sheet? } ; feuille : { v, ink, cursorMM, scroll, sp }
  let active = null;           // la carte au centre
  let offered = null;          // la carte blanche offerte (posée à côté du paquet)
  let leaving = [];            // cartes écartées en train de partir
  let pendingDraw = -1;
  let writing = false, kbPx = 0, kb = 0;   // écriture en cours ; hauteur du clavier (px) et poids lissé
  let ended = null;            // fin de scène (donné / passé) : { t0, kind }
  let nameText = '', nameKey = '', glow = [];

  // ---------- disposition ----------
  const lay = { W: 1, H: 1, D: 300, Hw: 100, Ww: 100, yDeck: 0, yOffer: -60 };
  function layout(W, H) {
    const portrait = W < H;
    const cardHpx = portrait ? Math.min(W * 0.80 / (CARD.w / CARD.h), H * 0.27) : H * 0.27;
    const cardWpx = cardHpx * CARD.w / CARD.h;
    lay.W = W; lay.H = H;
    lay.D = (CARD.w / cardWpx) * (H / 2) / Math.tan(FOV / 2);
    lay.Hw = 2 * lay.D * Math.tan(FOV / 2); lay.Ww = lay.Hw * W / H;
    lay.yDeck = (0.5 - 0.42) * lay.Hw;               // paquet : place d'origine (42 % de la hauteur)
    lay.yOffer = (0.5 - 0.76) * lay.Hw;              // carte blanche offerte : dessous
  }
  const FACE_Z = STACK * PITCH + 2.4;                // carte posée sur le paquet ; la feuille glisse dessous (−1 mm)
  const SHEET_PEEK = -6, SHEET_OUT = -(CARD.h + 6 - 10);   // décalage de la feuille (mm) : 3 lignes visibles sous la carte
  const deckPose = (i, v) => ({ x: v.jx, y: lay.yDeck + v.jy, z: i * PITCH, rx: 0, ry: 0, rz: v.jr });
  const centerPose = (side, v, dx = 0) => ({ x: v.jx * 3 + 1.2 + dx, y: lay.yDeck + v.jy * 2 - 0.8, z: FACE_Z, rx: 0, ry: side === 'q' ? Math.PI : 0, rz: v.jr * 1.5 + dx * 0.0015 });
  const offerPose = v => ({ x: v.jx, y: lay.yOffer + v.jy, z: 0, rx: 0, ry: Math.PI, rz: v.jr });
  const visibleStack = () => Math.max(0, Math.min(STACK, QUESTIONS.length - next));

  // ---------- animations ----------
  let dragX = 0, dragging = false;
  function poseOf(c, t) {
    const u = clamp01((t - c.t0) / c.dur);
    if (c.anim === 'draw') {         // soulevée du paquet, retournée en l'air, posée au centre
      const a = c.from, b = centerPose('q', c.v), up = sstep(0, 0.35, u), down = sstep(0.6, 1, u), e = ease(u);
      const p = lerpPose(a, b, e);
      p.z += (CARD.w / 2 + 8) * (up - down) * 0.9; p.ry = Math.PI * sstep(0.2, 0.7, u); p.rx = -0.12 * (up - down);
      return p;
    }
    if (c.anim === 'flip') {         // retournement sur place (question ↔ réponse), léger soulèvement
      const a = centerPose(c.fromSide, c.v), b = centerPose(c.side, c.v), e = ease(u);
      const p = lerpPose(a, b, e); p.z += Math.sin(Math.PI * e) * (CARD.w / 2 + 8); return p;
    }
    if (c.anim === 'discard') {      // écartée du côté du glissé, en accélérant
      const a = c.from, e = Math.pow(u, 1.8), s = c.dir || -1;
      return { ...a, x: a.x + s * e * (lay.Ww / 2 + CARD.w * 1.2), y: a.y - 8 * u, z: a.z + 4 * sstep(0, 0.3, u), rz: a.rz + s * 0.3 * e };
    }
    if (c.anim === 'offer') {        // la carte blanche glisse hors du paquet et se pose à côté
      const a = c.from, b = offerPose(c.v), e = ease(u), p = lerpPose(a, b, e);
      p.z += (CARD.w / 2 + 8) * Math.sin(Math.PI * e); p.ry = Math.PI * sstep(0.1, 0.8, u); return p;
    }
    if (c.anim === 'take') {         // la carte blanche vient au centre
      const a = c.from, b = centerPose('q', c.v), e = ease(u), p = lerpPose(a, b, e);
      p.z += 30 * Math.sin(Math.PI * e); return p;
    }
    return c === active ? centerPose(c.side, c.v, dragging ? dragX : 0) : offerPose(c.v);
  }
  const busy = (c, t) => c && c.anim && t - c.t0 < c.dur;

  function makeQuestion(t) {
    if (next >= QUESTIONS.length) return null;
    const id = order[next++];
    const v = stack.pop(); stack.unshift(variant());
    const q = QUESTIONS.find(x => x.id === id);
    const ink = card.makeInk(makeInkMap(q.q, Math.floor(v.seed * 1000) + id).canvas);
    return { kind: 'question', id, q: q.q, v, ink, side: 'q', anim: 'draw', t0: t, dur: DRAW_T, from: deckPose(STACK - 1, v), text: '',
      sheet: { v: sheetVariant(), ink: null, cursorMM: null, scroll: 0, sp: 0 } };
  }
  function drawNext(t) { active = makeQuestion(t); if (active) emit('draw', { id: active.id }); }
  function discard(t, dir = -1, from = null) {
    if (!active || busy(active, t) || writing) return false;
    const out = { ...active, anim: 'discard', t0: t, dur: DISCARD_T, dir, from: from || poseOf(active, t) };
    leaving.push(out); emit('discard', { id: active.id, kind: active.kind });
    if (active.kind === 'question') discards++;
    active = null;
    pendingDraw = t + DISCARD_T * 0.45;
    if (!offered && discards >= L.offerAfter) {
      const v = variant();
      offered = { kind: 'blank', v: { ...v, noLogo: true }, ink: null, side: 'q', anim: 'offer', t0: t + 0.5, dur: OFFER_T, from: deckPose(STACK - 1, v), text: '' };
      emit('offer', {});
    }
    return true;
  }
  function take(t) {                 // prendre la carte blanche : la question au centre est écartée
    if (!offered || busy(offered, t) || (active && busy(active, t))) return false;
    if (active) { leaving.push({ ...active, anim: 'discard', t0: t, dur: DISCARD_T, dir: -1, from: poseOf(active, t) }); }
    active = { ...offered, anim: 'take', t0: t, dur: TAKE_T, from: offerPose(offered.v) };
    offered = null; pendingDraw = -1;
    startWriting(t);                 // on la prend pour écrire : le clavier s'ouvre (page)
    emit('take', {});
    return true;
  }
  // feuille sous la carte question : pose (suit la carte, décalée de sp : 0 cachée, 1 dépasse, 2 dégagée)
  function sheetPose(c, t) {
    const p = poseOf(c, t), sp = c.sheet.sp;
    const oy = sp <= 1 ? SHEET_PEEK * sp : lerp(SHEET_PEEK, SHEET_OUT, sp - 1);
    return { x: p.x - Math.sin(p.rz) * oy, y: p.y + Math.cos(p.rz) * oy, z: p.z - 1.0, rx: p.rx, ry: Math.PI, rz: p.rz };
  }

  // ---------- écriture ----------
  function setText(s) {
    if (!active || !writing) return;
    const clean = s.toLowerCase().replace(/[’‘`´]/g, "'").replace(/[\r\n\t]/g, ' ').replace(/ {2,}/g, ' ');
    const prev = active.text || '';
    if (clean === prev) return;
    // lettres nouvelles présentes dans le prénom → elles s'éclairent
    if (clean.length > prev.length && clean.startsWith(prev)) {
      for (const ch of clean.slice(prev.length)) {
        const b = bare(ch);
        [...nameText].forEach((n, i) => { if (b && n === b) glow[i] = 1; });
      }
    }
    active.text = clean;
    if (active.kind === 'question') {          // sur la feuille : la ligne en cours reste en place, la feuille monte
      const sh = active.sheet, m = makeSheetInk(clean, Math.floor(sh.v.seed * 1000) + 7);
      if (sh.ink) card.freeInk(sh.ink);
      sh.ink = card.makeInk(m.canvas); sh.cursorMM = m.cursor; sh.scroll = m.scroll;
    } else {                                   // carte blanche : trois lignes visibles
      const m = makeAnswerInk(clean, Math.floor(active.v.seed * 1000) + 7);
      if (active.ink) card.freeInk(active.ink);
      active.ink = card.makeInk(m.canvas); active.cursorMM = m.cursor;
    }
  }
  function startWriting(t) {
    if (!active) return false;
    writing = true;
    if (active.kind === 'question') { if (!active.sheet.cursorMM) active.sheet.cursorMM = { x: 10.5, y: SHEET_LINE }; }
    else if (!active.cursorMM) active.cursorMM = makeAnswerInk('', Math.floor(active.v.seed * 1000) + 7).cursor;
    return true;
  }
  function stopWriting() { writing = false; }

  // ---------- lumière (manière 1) + inclinaison de la carte en focus ----------
  const tilt = { x: 0, y: 0 }, ts = { x: 0, y: 0 };
  const lp = { x: Math.cos(L.lightAz), y: Math.sin(L.lightAz), vx: 0, vy: 0 };
  function stepLight(dt) {
    const kk = Math.min(1, dt * 3); ts.x += (tilt.x - ts.x) * kk; ts.y += (tilt.y - ts.y) * kk;
    const m = L.lightMode | 0, ax = tilt.x * L.lightVar, ay = (m === 1 ? 0 : tilt.y) * L.lightVar;
    let tx = Math.cos(L.lightAz) + L.tiltAmp * ax, ty = Math.sin(L.lightAz) + L.tiltAmp * ay;
    const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const w = 2.2, z = 0.85;
    for (const [k, v, tg] of [['x', 'vx', tx], ['y', 'vy', ty]]) {
      const acc = -2 * z * w * lp[v] - w * w * (lp[k] - tg);
      lp[v] += acc * dt; lp[k] += lp[v] * dt;
    }
  }

  let vp = null, eye = null, lastT = 0;
  function frame(t, dt, W, H) {
    lastT = t;
    layout(W, H);
    if (pendingDraw >= 0 && t >= pendingDraw) { pendingDraw = -1; drawNext(t); }
    for (const c of [active, offered]) if (c && c.anim && t - c.t0 >= c.dur) c.anim = null;
    leaving = leaving.filter(c => { if (t - c.t0 < c.dur) return true; if (c.ink) card.freeInk(c.ink); if (c.sheet && c.sheet.ink) card.freeInk(c.sheet.ink); return false; });
    stepLight(dt);
    kb += ((writing && kbPx > 40 ? 1 : 0) - kb) * Math.min(1, dt * 4);
    for (let i = 0; i < glow.length; i++) glow[i] = (glow[i] || 0) * Math.exp(-dt / 1.4);
    if (active && active.sheet) {
      const target = active.anim === 'draw' ? 0 : (writing || active.text) ? 2 : 1;
      active.sheet.sp += (target - active.sheet.sp) * Math.min(1, dt * (target === 2 ? 4 : 2.5));
    }
    const endU = ended ? clamp01((t - ended.t0) / 2.2) : 0;

    // caméra ; clavier ouvert : la carte remonte au milieu de la partie visible de l'écran
    const fK = 0.5 * (1 - kbPx / H) + 0.04;
    const yF = lay.yDeck - (active && active.kind === 'question' ? CARD.h * 0.55 : 0);   // à garder visible : la ligne en cours
    const cy = lerp((lay.yDeck + lay.yOffer) / 2, yF - (0.5 - fK) * lay.Hw, kb);
    eye = [0, cy - lay.D * Math.sin(TILT), lay.D * Math.cos(TILT)];
    vp = M4.mul(M4.perspective(FOV, W / H, lay.D * 0.3, lay.D * 3), M4.lookAt(eye, [0, cy, 0], [0, 1, 0]));
    const k = lay.Hw / 235;
    const ap = active ? poseOf(active, t) : { x: 0, y: lay.yDeck, z: 0 };
    const R = L.lightR0 * lay.Hw, Z = L.lightZ * k, D0 = Math.hypot(R, Z), el0 = Math.atan2(Z, R), ln = Math.hypot(lp.x, lp.y) || 1;
    const el = (L.lightMode | 0) === 1 ? Math.min(1.35, Math.max(0.18, el0 + ts.y * L.elevAmp * L.lightVar)) : el0;
    const lightPos = [ap.x + lp.x / ln * D0 * Math.cos(el), ap.y + lp.y / ln * D0 * Math.cos(el), D0 * Math.sin(el)];
    const light = L.light * k * k * Math.sin(el0) / Math.sin(el);
    const spotPos = [ap.x, ap.y + 0.35 * lay.Hw, lay.D * 0.55];
    const sd = [ap.x - spotPos[0], ap.y - spotPos[1], ap.z - spotPos[2]], sl = Math.hypot(...sd);
    const P = { ...L, lightPos, light, spotPos, spotDir: sd.map(x => x / sl), spotI: L.spot * k * k * (sl / 300) ** 2,
      spotCosOut: Math.cos(Math.atan(0.62 * CARD.w / sl)), spotCosIn: Math.cos(Math.atan(0.4 * CARD.w / sl)) };

    // la carte au centre est en focus : immobile au repos, suit la souris / l'inclinaison ; le reste respire
    const crx = -ts.y * L.cardTilt, cry = ts.x * L.cardTilt;
    const group = (px, py, pz, ph, wt) => {
      const sw = L.sway * 0.5 * (1 - wt);
      const rx = crx * wt + sw * (0.6 * Math.sin(t * 0.61 + ph) + 0.4 * Math.sin(t * 1.37 + 2.1 * ph));
      const ry = cry * wt + sw * 1.2 * (0.6 * Math.sin(t * 0.47 + 1.7 * ph) + 0.4 * Math.sin(t * 1.13 + 0.6 * ph));
      const dz = sw * 12 * Math.sin(t * 0.29 + ph);
      return M4.mul(M4.mul(M4.model(0, 0, 0, px, py, pz + dz), M4.model(rx, ry, 0)), M4.model(0, 0, 0, -px, -py, -pz));
    };
    const Gc = group(0, lay.yDeck, 0, 0.0, 1), Gd = Gc, Go = group(0, lay.yOffer, 0, 2.3, 0);
    // tout ce qui n'est pas la carte au centre s'efface quand le clavier est ouvert (et à la fin)
    const deckShade = (1 - endU), sideShade = (1 - L.unfocusDim) * (1 - kb) * (1 - endU);
    const endShade = 1 - endU;
    gl.enable(gl.DEPTH_TEST);
    const model = (G, p) => M4.mul(G, M4.model(p.rx, p.ry, p.rz, p.x, p.y, p.z));
    const pa = active ? poseOf(active, t) : null, occA = pa ? { x: pa.x, y: pa.y, z: pa.z, rz: pa.rz } : null;
    {
      const n = visibleStack();
      for (let i = 0; i < n; i++) {
        const v = stack[STACK - n + i], p = deckPose(i, v);
        card.draw(vp, eye, P, { model: model(Gd, p), lod: i === n - 1 ? 'fine' : 'coarse', shade: (0.55 + 0.45 * (i + 1) / n) * deckShade, occ: occA, ...v });
      }
      if (offered && sideShade > 0.01) {
        const p = poseOf(offered, t), cur = !busy(offered, t) ? cursorOf(offered, t, 'front') : {};
        card.draw(vp, eye, P, { model: model(busy(offered, t) ? Gd : Go, p), lod: 'fine', shade: sideShade, ...offered.v, ...cur });
      }
    }
    const drawSheet = (c, cur = {}) => {
      if (!c.sheet || c.sheet.sp < 0.02 || c.anim === 'draw') return;
      const sh = c.sheet, p = sheetPose(c, t), v = { ...sh.v, paperXf: [sh.v.paperXf[0], sh.v.paperXf[1] - 0.7 * sh.scroll, 0, 0] };
      card.draw(vp, eye, P, { model: model(Gc, p), lod: 'fine', ink: sh.ink, shade: endShade, occ: { x: poseOf(c, t).x, y: poseOf(c, t).y, z: poseOf(c, t).z, rz: poseOf(c, t).rz }, ...v, ...cur });
    };
    for (const c of leaving) { drawSheet(c); card.draw(vp, eye, P, { model: model(Gc, poseOf(c, t)), lod: 'fine', ink: c.ink, shade: endShade, ...c.v }); }
    let occ = null;
    if (active) {
      const p = poseOf(active, t);
      occ = { x: p.x, y: p.y, z: p.z, rz: p.rz };
      if (active.kind === 'question') {
        // la feuille : curseur sur la ligne en cours (dégagée) ou sur la bande qui dépasse (au repos)
        const sh = active.sheet, peekCur = { x: 10.5, y: CARD.h - 2.2 };
        const cm = active.sheet.sp > 1.5 ? (sh.cursorMM || { x: 10.5, y: SHEET_LINE }) : peekCur;
        drawSheet(active, active.anim === 'draw' || active.text && !writing ? {} : cursorAt(cm, t));
        card.draw(vp, eye, P, { model: model(Gc, p), lod: 'fine', ink: active.ink, shade: endShade, ...active.v });
      } else {
        const cur = writing && !busy(active, t) ? cursorOf(active, t, 'front') : {};
        card.draw(vp, eye, P, { model: model(Gc, p), lod: 'fine', ink: active.ink, shade: endShade, ...active.v, ...cur });
      }
    }
    // prénom (à plat, en retrait) ; ses lettres s'éclairent quand on les tape ; tout s'allume à la fin
    if (nameText) {
      const fy = 0.11, ndcY = 1 - 2 * fy, tf = Math.tan(FOV / 2);
      const fwd = norm3(sub3([0, cy, 0], eye)), right = norm3(cross3(fwd, [0, 1, 0])), up = cross3(right, fwd);
      const dir = norm3(add3(fwd, mul3(up, ndcY * tf)));
      const s = -eye[2] / dir[2], py = eye[1] + dir[1] * s;
      const g = [...nameText].map((_, i) => Math.max(glow[i] || 0, ended ? sstep(0.1 + i * 0.08, 0.5 + i * 0.08, (t - ended.t0)) * 0.9 : 0));
      const key = nameText + W + 'x' + H + Math.round(py * 10) + g.map(x => x.toFixed(2)).join();
      if (key !== nameKey) {
        const capPx = Math.min(52, Math.max(26, 0.052 * H)) * 0.66;
        nameR.layout(nameText, 0, py, capPx * lay.Hw / H, lay.Ww * 0.86, g);
        nameKey = key;
      }
      nameR.draw(vp, eye, P, L, occ);
    }
    if (ended && !ended.done && t - ended.t0 > 2.6) { ended.done = true; emit('end', { kind: ended.kind, text: ended.text, id: ended.id }); }
  }
  // curseur à une position (mm depuis le coin haut-gauche de la face lue, recto)
  function cursorAt(cm, t) {
    const a = 0.55 + 0.4 * Math.sin(t * 2.4);
    return { cursor: [CARD.w / 2 - cm.x, CARD.h / 2 - cm.y - 0.8, TYPE.size * 0.92, a], cursorFace: 1 };
  }
  // curseur (mm, coordonnées de face) : trait fin qui respire
  function cursorOf(c, t, face) {
    const cm = c.cursorMM || makeAnswerInk('', Math.floor(c.v.seed * 1000) + 7).cursor;
    c.cursorMM = cm;
    const xmm = cm.x, ymm = cm.y;                     // depuis le coin haut-gauche de la face lue
    const px = face === 'back' ? xmm - CARD.w / 2 : CARD.w / 2 - xmm, py = CARD.h / 2 - ymm - 0.8;
    const a = 0.55 + 0.4 * Math.sin(t * 2.4);
    return { cursor: [px, py, TYPE.size * 0.92, a], cursorFace: face === 'back' ? 0 : 1 };
  }

  // ---------- sélection ----------
  function screenQuad(p, G) {
    const mvp = M4.mul(vp, G ? M4.mul(G, M4.model(p.rx, p.ry, p.rz, p.x, p.y, p.z)) : M4.model(p.rx, p.ry, p.rz, p.x, p.y, p.z));
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
      const x = sx * CARD.w / 2, y = sy * CARD.h / 2;
      const cx = mvp[0] * x + mvp[4] * y + mvp[12], cy = mvp[1] * x + mvp[5] * y + mvp[13], cw = mvp[3] * x + mvp[7] * y + mvp[15];
      return [(cx / cw * 0.5 + 0.5) * lay.W, (0.5 - cy / cw * 0.5) * lay.H];
    });
  }
  const inside = (q, x, y) => {
    let s = 0;
    for (let i = 0; i < 4; i++) {
      const [ax, ay] = q[i], [bx, by] = q[(i + 1) % 4], c = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
      if (c !== 0) { if (s === 0) s = Math.sign(c); else if (Math.sign(c) !== s) return false; }
    }
    return true;
  };
  function hit(x, y) {
    if (!vp) return null;
    const t = lastT;
    if (active && inside(screenQuad(poseOf(active, t)), x, y)) return 'card';
    if (active && active.sheet && active.sheet.sp > 0.5 && inside(screenQuad(sheetPose(active, t)), x, y)) return 'card';
    if (offered && inside(screenQuad(offerPose(offered.v)), x, y)) return 'offer';
    const n = visibleStack();
    if (n && inside(screenQuad(deckPose(n - 1, stack[STACK - 1])), x, y)) return 'deck';
    return null;
  }
  // rectangle écran (px CSS) de la carte question (ou du paquet) : zone où la souris laisse la carte droite
  function cardRect() {
    if (!vp) return null;
    const q = screenQuad(active ? centerPose('q', active.v) : deckPose(STACK - 1, stack[STACK - 1]));
    const xs = q.map(p => p[0]), ys = q.map(p => p[1]);
    return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
  }
  // rectangle écran (px CSS) de la carte au centre : la page y place le signe « donner »
  function activeRect() {
    if (!active || !vp) return null;
    const q = screenQuad(active.sheet && active.sheet.sp > 1.5 ? sheetPose(active, lastT) : poseOf(active, lastT));
    const xs = q.map(p => p[0]), ys = q.map(p => p[1]);
    return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
  }

  // ---------- gestes (la page traduit pointeurs et clavier) ----------
  // toucher : 'card' (la carte ou sa feuille → écrire), 'deck' (une autre),
  // 'offer' (prendre la carte blanche) ; glisser horizontalement la carte = l'écarter
  function tap(x, y, t) {
    if (ended) return { type: null };
    const h = hit(x, y);
    if (h === 'card') {
      if (busy(active, t)) return { type: null };
      startWriting(t); return { type: 'write' };
    }
    if (h === 'offer') { return take(t) ? { type: 'take' } : { type: null }; }
    if (h === 'deck' && !writing) { if (active) return discard(t, -1) ? { type: 'discard' } : { type: null }; if (pendingDraw < 0) { drawNext(t); return { type: 'draw' }; } }
    return { type: null };
  }
  function drag(dx) { if (active && !busy(active, lastT) && !writing && !ended) { dragging = true; dragX = dx * lay.Ww / lay.W; } }
  function release(dx, vx, t) {
    if (!dragging) return { type: null };
    const from = active ? poseOf(active, t) : null;      // part de là où le doigt l'a laissée
    dragging = false;
    const far = Math.abs(dx) > lay.W * 0.22 || Math.abs(vx) > 0.6;
    if (far) { const ok = discard(t, Math.sign(dx) || -1, from); dragX = 0; return ok ? { type: 'discard' } : { type: null }; }
    dragX = 0; return { type: 'cancel' };
  }
  function give(t) {
    if (!active || !active.text || ended) return false;
    writing = false;
    ended = { t0: t, kind: active.kind === 'question' ? 'reponse' : 'theme', text: active.text, id: active.id };
    return true;
  }
  function pass(t) { if (ended) return false; writing = false; ended = { t0: t, kind: 'improvisation' }; return true; }

  function start(t) { pendingDraw = t + 0.6; }
  function setName(s) { nameText = (s || '').toUpperCase(); nameKey = ''; glow = []; }
  function setTilt(x, y) { tilt.x = Math.max(-1, Math.min(1, x)); tilt.y = Math.max(-1, Math.min(1, y)); }
  function setKeyboard(px) { kbPx = px; }
  return {
    frame, tap, drag, release, give, pass, start, setName, setTilt, setKeyboard, setText, startWriting, stopWriting, activeRect, cardRect,
    state: () => ({ writing, offered: !!offered, active: active ? { kind: active.kind, id: active.id, text: active.text } : null, ended: !!ended, discards }),
    look: L, layout: lay,
  };
}
