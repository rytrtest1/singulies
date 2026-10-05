// Scène 3 — la feuille (nuit du 05 au 06/10, proposition). Même monde, même caméra, même lampe que la scène des
// cartes, qui lui passe la main sans coupure (snapshot : matrices des cartes, prénom, caméra, lampe).
// 1) La paire se referme : la carte réponse se glisse exactement sous la question et s'y fond ; la carte se
//    soulève, se retourne en l'air (la réponse est au dos de la question : une carte, deux faces) et va se poser
//    sur le bas d'une feuille A5 noire qui arrive du fond (logo gaufré à sec en tête, comme un papier à lettres).
// 2) Le prénom devient l'acrostiche : chaque lettre quitte le haut de l'écran, l'une après l'autre, et vient se
//    poser en colonne sur la feuille (une espace = une strophe) ; à l'arrivée elle s'allume un peu (absorbée).
//    Puis la lumière parcourt la colonne de haut en bas (le prénom se lit), et un curseur de machine respire à
//    côté de la première lettre : c'est là que le poème sera tapé.
// 3) La commande : quelques secondes après (jamais moins de 3 s après le dernier geste), la vue descend vers deux
//    cartes, « par la poste » et « en direct ». Les toucher : leur lien (liens d'attente : « bientôt », comme le
//    portail). Glisser / molette : remonter voir la feuille, redescendre.
// Toucher la carte : elle se retourne (question ↔ réponse). Retour : le temps remonte (tout se défait dans l'ordre
// inverse, les lettres remontent à leur place), puis la scène des cartes revient.
// Tout ce qui arrive est une fonction du temps de la scène (τ) : le retour n'est que τ qui décroît.
import { M4, CARD } from '../cards/cardRenderer.js';
import { makeInkMap, makeAnswerInk, TYPE } from '../cards/ink.js';
import { createRng } from '../field/rng.js';

export const SHEET = { w: 148, h: 210, r: 0.6, t: 0.1 };
// liens de la commande : null = lien d'attente (« bientôt »)
export const ORDER_LINKS = { poste: null, direct: null };
const ORDERS = [{ id: 'poste', label: 'par la poste' }, { id: 'direct', label: 'en direct' }];

const FOV = 26 * Math.PI / 180, TILT = 0.22, TF = Math.tan(FOV / 2);
const LOGO_Y = SHEET.h / 2 - 21;                 // logo en tête de feuille (centre, mm)
const LOGO_K = 0.4;                              // ≈ 15 mm (le logo des cartes fait 38,5)
const COL_X = -SHEET.w / 2 + 34;                 // marge de la colonne (un bloc de poème centré sur la page)
const C_OVER = 15;                               // la carte recouvre le bas de la feuille (mm)
const C_POSE = { x: 26, y: -SHEET.h / 2 + C_OVER - CARD.h / 2, rz: -0.07 };
const O_GAP = 13;
const O_X = 10;                                  // la commande descend en cascade depuis la carte, un peu à droite

// temps de la scène (s)
const SHEET_IN = [0.15, 1.9];                    // la feuille arrive du fond
const MERGE = [0, 0.55];                         // la carte réponse se glisse sous la question et s'y fond
const CARD_MOVE = [0.35, 2.0];                   // la carte va se poser sur la feuille (en se retournant)
const FLY_AT = 1.05, FLY_GAP = 0.27, FLY_T = 1.35;
const CAM_T = 2.4;

const clamp01 = u => Math.min(1, Math.max(0, u));
const sstep = (a, b, x) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const ease = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
const lerp = (a, b, u) => a + (b - a) * u;
const span = (r, x) => clamp01((x - r[0]) / (r[1] - r[0]));
const hop = ph => 3.2 * sstep(0, 0.16, ph) * (1 - sstep(0.16, 0.45, ph)) + 1.1 * sstep(0.45, 0.57, ph) * (1 - sstep(0.57, 0.85, ph));
const lerpM = (a, b, u) => { const o = new Float32Array(16); for (let i = 0; i < 16; i++) o[i] = a[i] + (b[i] - a[i]) * u; return o; };
const T = (x, y, z) => M4.model(0, 0, 0, x, y, z);
const S = k => new Float32Array([k, 0, 0, 0, 0, k, 0, 0, 0, 0, k, 0, 0, 0, 0, 1]);
const rotOf = m => { const o = new Float32Array(m); o[12] = o[13] = o[14] = 0; return o; };
const posOf = m => [m[12], m[13], m[14]];
const apply = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
// une lettre ou une carte qui voyage : translation interpolée (+ décalage), rotation interpolée (proches)
function blendM(a, b, u, off = [0, 0, 0]) {
  const R = lerpM(rotOf(a), rotOf(b), u), pa = posOf(a), pb = posOf(b);
  R[12] = lerp(pa[0], pb[0], u) + off[0]; R[13] = lerp(pa[1], pb[1], u) + off[1]; R[14] = lerp(pa[2], pb[2], u) + off[2];
  return R;
}

// opts : { card (renderer), nameR, look, from (snapshot de la scène des cartes), seed, reduced, on: { order, back } }
export function createSheetScene(gl, opts) {
  const { card, nameR, look: L, from, on = {} } = opts;
  const reduced = !!opts.reduced;
  const rnd = createRng(opts.seed ?? ((Math.random() * 1e9) >>> 0));
  const emit = (k, d) => { try { on[k] && on[k](d); } catch (e) { console.error(e); } };
  const P_LOGO = (P => new URLSearchParams(location.search).get(P))('logoFeuille') !== '0';
  card.addShape('sheet', { ...SHEET, fine: P_LOGO ? [10, 10, 0.25, 0, LOGO_Y] : null });

  const sheetV = {
    seed: rnd() * 100, paperXf: [rnd.range(-2.5, 2.5), rnd.range(-1.5, 1.5), rnd() < 0.5 ? 0 : Math.PI, 0],
    warp: [rnd.range(0.35, 0.6), rnd.range(-0.35, -0.15), rnd.range(-0.2, 0.2)],
    logoOff: [0, LOGO_Y], logoScale: [LOGO_K, LOGO_K], noLogo: !P_LOGO,
    // papier d'une feuille : plus lisse qu'une carte (nuages atténués), motif de ≈ 75 mm (0,6 × 87 / 0,7)
    paperTile: 0.6 * CARD.w / 0.7, paperLo: 0.35,
  };

  // ---- la carte posée sur la feuille ----
  // réponse : une carte, deux faces — la question au recto (celle qu'on a tirée), la réponse tapée au dos ;
  // carte blanche : le thème au recto, « carte blanche » au dos ; improvisation : pas de carte
  let C = null;
  if (from.question && from.answer) {
    const v = from.question.v;
    const back = makeAnswerInk(from.answer.text, Math.floor(v.seed * 1000) + 11, 3, 0);
    C = { v, front: from.question.ink, back: card.makeInk(back.canvas), M0: from.question.M, A0: from.answer.M, av: from.answer.v,
      phi0: Math.PI, phi1: 2 * Math.PI, ownBack: true };
  } else if (from.blank) {
    const v = from.blank.v;
    const fr = makeAnswerInk(from.blank.text, Math.floor(v.seed * 1000) + 7, 3, 0);
    C = { v, front: card.makeInk(fr.canvas), back: from.blank.labelInk, M0: from.blank.M, phi0: Math.PI, phi1: Math.PI, ownFront: true };
  }
  if (C) { C.flips = 0; C.flipA = 0; C.flipT0 = -1; }

  // ---- l'acrostiche : une ligne par caractère du prénom (une espace = une ligne blanche, entre deux strophes) ----
  const name = from.name || '';
  const chars = [...name];
  nameR.letters(chars);
  const nLines = chars.length;
  const lead = nLines > 1 ? Math.min(10.5, 148 / (nLines - 1)) : 10.5;
  const cap = Math.min(6.4, lead * 0.6), emT = cap / nameR.capHeight;
  const yc = C ? -6 : 0;                                    // bloc un peu remonté quand la carte occupe le bas
  const baseOf = k => yc + ((nLines - 1) / 2 - k) * lead - cap / 2;
  // départ : la lettre telle que la scène des cartes l'a laissée (monde, à plat)
  const starts = [];
  { let gi = 0; chars.forEach((ch, i) => { if (ch === ' ') { starts.push(null); return; } const g = from.glyphs[gi++]; starts.push(g ? T(g.x, g.base, 0) : null); }); }
  // la feuille se pose sous le prénom (son haut à 14 mm sous les lettres) : les lettres y descendent
  const gb = from.glyphs.length ? from.glyphs : [{ base: 0 }];
  const nameBot = Math.min(...gb.map(g => g.base)), nameTop = Math.max(...gb.map(g => g.base)) + from.em * nameR.capHeight;
  const SY = nameBot - 14 - SHEET.h / 2;
  const flyers = [];
  { let k = 0; chars.forEach((ch, i) => { if (ch === ' ' || !starts[i]) return; flyers.push({ i, ch, at: FLY_AT + k * FLY_GAP + rnd.range(-0.05, 0.06), dur: FLY_T * rnd.range(0.92, 1.1), side: rnd.range(24, 34), lift: rnd.range(6, 12), g0: from.glow[i] ?? 0.9, k: 0.8 + 0.2 * rnd(), dec: 1.4 + 1.2 * rnd() }); k++; }); }
  const landAll = flyers.length ? Math.max(...flyers.map(f => f.at + f.dur)) : FLY_AT;
  const READ_AT = landAll + 0.9, READ_GAP = 0.2;            // la lumière parcourt la colonne
  const CURSOR_AT = READ_AT + flyers.length * READ_GAP * 0.6 + 0.4;
  const INTRO_END = Math.max(CURSOR_AT + 1, CARD_MOVE[1], SHEET_IN[1]);
  // curseur : une espace après la première lettre, sur sa ligne de base (mm, face lue)
  const first = chars.findIndex(c => c !== ' ');
  const cursorMM = first >= 0 ? { x: COL_X + nameR.adv(chars[first]) * emT + TYPE.pitch * 1.2, y: baseOf(first) - 0.5 } : { x: COL_X, y: 0 };

  // ---- la commande ----
  const orders = ORDERS.map((o, k) => {
    const v = { seed: rnd() * 100, paperXf: [rnd.range(-2.5, 2.5), rnd.range(-1.5, 1.5), rnd() < 0.5 ? 0 : Math.PI, 0], logoOff: [rnd.range(-0.15, 0.15), rnd.range(-0.15, 0.15)],
      warp: [rnd.range(0.05, 0.35), rnd.range(-0.2, 0.05), rnd.range(-0.12, 0.12)], jx: rnd.range(-1.5, 1.5), jr: rnd.range(-0.025, 0.025) };
    return { ...o, k, v, ink: card.makeInk(makeInkMap(o.label, Math.floor(v.seed * 1000) + 5).canvas), anim: null, a: 0, press: 0, bph: rnd() * 6.28 };
  });
  let soonInk = null;
  const oTop = (C ? C_POSE.y - CARD.h / 2 : -SHEET.h / 2) - 22;
  const oPose = o => ({ x: O_X + o.v.jx, y: SY + oTop - CARD.h / 2 - o.k * (CARD.h + O_GAP), rz: o.v.jr });

  // ---- caméra : départ = celle de la scène des cartes ; A = la feuille et sa carte ; B = la commande ----
  const frames = { A: null, B: null, AN: null };
  function frameFor(y0, y1, x0, x1, wantW, W, H) {
    const Hw = Math.max((y1 - y0) * 1.1, Math.max(wantW, (x1 - x0) * 1.08) * H / W);
    return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, D: Hw / (2 * TF), Hw };
  }
  function layout(W, H) {
    const cBot = C ? C_POSE.y - CARD.h / 2 : -SHEET.h / 2;
    frames.A = frameFor(SY + cBot - 8, SY + SHEET.h / 2 + 4, -SHEET.w / 2, SHEET.w / 2, SHEET.w * 1.1, W, H);
    // tant que les lettres sont en haut : la feuille et le prénom au-dessus
    frames.AN = frameFor(SY + cBot - 8, Math.max(SY + SHEET.h / 2 + 4, nameTop + 8), -SHEET.w / 2, SHEET.w / 2, SHEET.w * 1.1, W, H);
    const oBot = oTop - 2 * CARD.h - O_GAP;
    const x0 = O_X - CARD.w / 2 - 2, x1 = Math.max(O_X + CARD.w / 2, C ? C_POSE.x + CARD.w / 2 : 0) + 2;
    frames.B = frameFor(SY + oBot - 6, SY + (C ? C_POSE.y + CARD.h / 2 : -SHEET.h / 2 + 30) + 6, x0, x1, CARD.w / 0.78, W, H);
  }

  // ---- état ----
  let t0 = -1, lastT = 0, backing = null, done = false, lastGesture = -99;
  let sv = 0, sT = 0, svV = 0;                               // 0 = la feuille, 1 = la commande
  let orderAt = -1, chosen = null;
  const camS = { cx: 0, cy: from.cam.cy, D: from.cam.D };
  const lamp = { ...from.lamp };
  const ap = { x: from.ap.x, y: from.ap.y, vx: 0, vy: 0 };
  const tilt = { x: 0, y: 0 }, ts = { x: from.ts?.x || 0, y: from.ts?.y || 0 };
  let vp = null, eye = null, W = 1, H = 1, lastMsheet = T(0, 0, 0);
  const quads = {};

  // τ : temps de la scène ; au retour il redescend (le temps remonte)
  const SLOW = +(new URLSearchParams(location.search).get('lent') || 1) || 1;   // captures : temps ralenti
  function tau(t) {
    if (!backing) return (t - t0) / SLOW;
    return Math.max(0, backing.tau0 - (t - backing.t0) * 2.4 / SLOW);
  }

  // ---- lumière (celle de la scène des cartes) ----
  const CAM_AZ = -Math.PI / 2, wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
  function stepLight(dt, t) {
    const kk = Math.min(1, dt * 3); ts.x += (tilt.x - ts.x) * kk; ts.y += (tilt.y - ts.y) * kk;
    const backDir = CAM_AZ + Math.PI, lim = Math.PI - L.lampGap;
    const bAz = Number.isFinite(L.breathFixAz) ? L.breathFixAz : L.breathAz * (0.72 * Math.sin(t * 0.33) + 0.28 * Math.sin(t * 0.69 + 1.3));
    const bEl = Number.isFinite(L.breathFixEl) ? L.breathFixEl : L.breathEl * (0.7 * Math.sin(t * 0.27 + 2.1) + 0.3 * Math.sin(t * 0.61 + 0.4));
    let rel = wrapA(L.lightAz + bAz + 1.2 * L.tiltAmp * L.lightVar * ts.x - backDir);
    rel = lim * Math.tanh(rel / lim);
    const mid = (L.elMin + L.elMax) / 2, half = (L.elMax - L.elMin) / 2;
    let e = L.elBase + bEl + ts.y * L.elevAmp * L.lightVar;
    e = mid + half * Math.tanh((e - mid) / half);
    const w = 2.2, z = 0.85, da = wrapA(backDir + rel - lamp.a);
    lamp.va += (w * w * da - 2 * z * w * lamp.va) * dt; lamp.a += lamp.va * dt;
    lamp.ve += (w * w * (e - lamp.e) - 2 * z * w * lamp.ve) * dt; lamp.e += lamp.ve * dt;
  }

  // respiration d'un objet (celle des cartes) ; wt = 1 : en focus (suit l'inclinaison), 0 : respire seul
  function group(px, py, ph, wt, tiltK, t) {
    const sw = (reduced ? 0 : L.sway) * 0.5 * (1 - wt) * tiltK;
    const crx = -ts.y * L.cardTilt * tiltK, cry = ts.x * L.cardTilt * tiltK;
    const rx = crx * wt + sw * (0.6 * Math.sin(t * 0.61 + ph) + 0.4 * Math.sin(t * 1.37 + 2.1 * ph));
    const ry = cry * wt + sw * 1.2 * (0.6 * Math.sin(t * 0.47 + 1.7 * ph) + 0.4 * Math.sin(t * 1.13 + 0.6 * ph));
    const dz = sw * 12 * Math.sin(t * 0.29 + ph);
    return M4.mul(M4.mul(T(px, py, dz), M4.model(rx, ry, 0)), T(-px, -py, 0));
  }

  function frame(t, dt, w, h) {
    if (t0 < 0) t0 = t;
    lastT = t; W = w; H = h;
    layout(W, H);
    const tu = tau(t);
    if (backing && tu <= 0 && !backing.fired) { backing.fired = true; emit('back', {}); }

    // passage automatique vers la commande : le curseur posé, et jamais moins de 3 s après le dernier geste
    if (!backing && orderAt < 0 && tu > CURSOR_AT + 1.6 && t - lastGesture > 3) showOrders(t);
    if (backing) sT = 0;
    // ressort de la vue (feuille ↔ commande)
    { const w2 = reduced ? 30 : 2.4; svV += (w2 * w2 * (sT - sv) - 2 * w2 * svV) * dt; sv += svV * dt; }
    const s = clamp01(sv);

    // caméra : de celle des cartes à la feuille (τ), puis feuille ↔ commande (s)
    const ci = reduced ? sstep(0, 0.6, tu) : ease(clamp01(tu / CAM_T));
    const fB = frames.B, an = sstep(landAll - 0.5, landAll + 1.9, tu);
    const fA = { cx: lerp(frames.AN.cx, frames.A.cx, an), cy: lerp(frames.AN.cy, frames.A.cy, an), D: Math.exp(lerp(Math.log(frames.AN.D), Math.log(frames.A.D), an)) };
    const es = ease(s);
    const cxAB = lerp(fA.cx, fB.cx, es), cyAB = lerp(fA.cy, fB.cy, es), DAB = Math.exp(lerp(Math.log(fA.D), Math.log(fB.D), es));
    camS.cx = lerp(0, cxAB, ci); camS.cy = lerp(from.cam.cy, cyAB, ci); camS.D = Math.exp(lerp(Math.log(from.cam.D), Math.log(DAB), ci));
    const cx = camS.cx, cy = camS.cy, D = camS.D, Hw = 2 * D * TF;
    eye = [cx, cy - D * Math.sin(TILT), D * Math.cos(TILT)];
    vp = M4.mul(M4.perspective(FOV, W / H, D * 0.25, D * 3), M4.lookAt(eye, [cx, cy, 0], [0, 1, 0]));

    // lumière : la lampe suit ce qu'on regarde (la feuille, puis la commande)
    stepLight(dt, t);
    const fy = SY + lerp(0, oTop - CARD.h, s), fxT = lerp(0, O_X, s);
    { const w2 = 1.8; for (const [k, v, tg] of [['x', 'vx', fxT], ['y', 'vy', fy]]) { ap[v] += (w2 * w2 * (tg - ap[k]) - 2 * w2 * ap[v]) * dt; ap[k] += ap[v] * dt; } }
    const k = Hw / 235;
    const R = L.lightR0 * Hw, Z = L.lightZ * k, D0 = Math.hypot(R, Z), el0 = Math.atan2(Z, R), el = lamp.e;
    const lightPos = [ap.x + Math.cos(lamp.a) * D0 * Math.cos(el), ap.y + Math.sin(lamp.a) * D0 * Math.cos(el), D0 * Math.sin(el)];
    const light = L.light * k * k * Math.sin(el0) / Math.sin(el);
    const spotPos = [ap.x, ap.y + 0.35 * Hw, D * 0.55];
    const sd = [ap.x - spotPos[0], ap.y - spotPos[1], -spotPos[2]], sl = Math.hypot(...sd);
    const P = { ...L, lightPos, light, spotPos, spotDir: sd.map(x => x / sl), spotI: L.spot * k * k * (sl / 300) ** 2,
      spotCosOut: Math.cos(Math.atan(0.62 * CARD.w / sl)), spotCosIn: Math.cos(Math.atan(0.4 * CARD.w / sl)) };

    gl.enable(gl.DEPTH_TEST);
    const live = reduced ? 0 : sstep(1.2, 3.5, tu);
    // ---- la feuille : arrive du fond, un peu d'en dessous ; en focus tant qu'on la regarde ----
    const sIn = reduced ? sstep(SHEET_IN[0], SHEET_IN[0] + 0.8, tu) : ease(span(SHEET_IN, tu));
    const Gs = group(0, SY, 0.7, 1 - s, 0.45 * live, t);
    const Msheet = M4.mul(T(0, -70 * (1 - sIn), -60 * (1 - sIn)), M4.mul(Gs, T(0, SY, 0)));
    lastMsheet = Msheet;
    const dimS = 1 - L.unfocusDim * s;
    // ---- la carte ----
    let Mc = null, cFade = 1;
    if (C) {
      const target = M4.mul(Msheet, T(C_POSE.x + C.v.jx, C_POSE.y + C.v.jy * 2, 2.2));
      const target2 = M4.mul(target, M4.model(0, 0, C_POSE.rz));
      const u = reduced ? sstep(CARD_MOVE[0], CARD_MOVE[0] + 0.5, tu) : span(CARD_MOVE, tu);
      const e = ease(u), sw = Math.sin(Math.PI * sstep(0.2, 0.8, u));
      // retournement : demi-tour (réponse) dans la partie haute du trajet ; toucher = un demi-tour de plus
      if (C.flipT0 >= 0) { C.flipA = clamp01((t - C.flipT0) / 1.1); if (C.flipA >= 1) { C.flips = C.flipTo; C.flipT0 = -1; } }
      const fl = C.flipT0 >= 0 ? lerp(C.flips, C.flipTo, ease(C.flipA)) : C.flips;
      const phi = lerp(C.phi0, C.phi1, reduced ? (u > 0.5 ? 1 : 0) : sstep(0.22, 0.78, u)) + Math.PI * fl;
      const lift = (reduced ? 0 : (CARD.w / 2 + 10) * sw) + (C.flipT0 >= 0 ? (CARD.w / 2 + 6) * Math.sin(Math.PI * C.flipA) * (reduced ? 0 : 1) : 0);
      // M0 contient déjà le demi-tour de la question (ry = π) : on l'en retire, on interpole, on le remet
      const unflip = M4.mul(C.M0, M4.model(0, -Math.PI, 0));
      Mc = M4.mul(blendM(unflip, target2, e, [0, 0, lift]), M4.model(-0.12 * sw, phi, 0));
      // ombre de la carte sur la feuille
      C.occ = u > 0.9 && C.flipT0 < 0 ? (p => ({ x: p[0], y: p[1], z: p[2], rz: C_POSE.rz }))(posOf(target2)) : null;
    }
    // ---- la feuille, puis la carte (dessus) ----
    if (sIn > 0.004) card.draw(vp, eye, P, { model: Msheet, lod: 'sheet', fade: sIn, shade: dimS, occ: C?.occ || null, ...sheetV,
      ...(cursorOn(tu) > 0 ? { cursor: [cursorMM.x, cursorMM.y, TYPE.size * 0.92, cursorOn(tu) * (0.55 + 0.4 * Math.sin(t * 2.4))], cursorFace: 0 } : {}) });
    if (C && from.answer && tu < MERGE[1] + 0.05) {
      // la carte réponse se glisse exactement sous la question et s'y fond
      const u = span(MERGE, tu), under = M4.mul(Mc, M4.model(0, 0, 0, 0, 0, 0.9));
      card.draw(vp, eye, P, { model: lerpM(C.A0, under, ease(u)), lod: 'fine', ink: null, fade: 1 - sstep(0.15, 1, u), shade: 1, ...C.av });
    }
    if (C) {
      card.draw(vp, eye, P, { model: Mc, lod: 'fine', ink: C.front, inkBack: C.back, fade: cFade, shade: dimS, ...C.v });
      quads.C = screenQuad(Mc);
    }
    // ---- la commande ----
    for (const o of orders) {
      const appear = orderAt < 0 ? 0 : reduced ? sstep(0, 0.6, t - orderAt - o.k * 0.2) : ease(clamp01((t - orderAt - 0.35 - o.k * 0.3) / 1.3));
      const away = backing ? 1 - sstep(0, 0.5, t - backing.t0) : 1;
      let fade = appear * away;
      if (chosen && chosen.o !== o) fade *= 1 - sstep(0, 0.6, t - chosen.t0) * 0.75;
      o.a = fade;
      if (fade < 0.004) { quads[o.id] = null; continue; }
      const p = oPose(o);
      let dz = 0, ry = Math.PI;
      if (o.anim) {                               // lien d'attente : un demi-tour (« bientôt »), puis retour
        const tf = t - o.anim.t0, u1 = clamp01(tf / 1.3), u2 = clamp01((tf - 1.3 - 2.2) / 1.3);
        ry += Math.PI * (sstep(0.15, 0.85, u1) - sstep(0.15, 0.85, u2));
        dz += (CARD.w / 2 + 8) * (Math.sin(Math.PI * u1) + Math.sin(Math.PI * u2)) * (reduced ? 0 : 1);
        if (tf > 1.3 * 2 + 2.2) o.anim = null;
      }
      // invitation : la première sautille deux ou trois fois, quand rien ne bouge
      const idle = t - Math.max(orderAt + 2.6, lastGesture + 1.5);
      if (!chosen && !reduced && o.k === 0 && idle > 0 && idle < 4.5 * 3) dz += hop(idle % 4.5);
      o.press += ((o === pressO ? 1 : 0) - o.press) * Math.min(1, dt * 14);
      const Go = group(p.x, p.y, o.bph, s, 1, t);
      const M = M4.mul(M4.mul(T(0, -24 * (1 - appear), -30 * (1 - appear)), Go), M4.model(0, ry, p.rz, p.x, p.y, 1 + dz - 0.5 * o.press));
      card.draw(vp, eye, P, { model: M, lod: 'fine', ink: o.ink, inkBack: o.anim ? soonInk : null, fade, shade: 1 - L.unfocusDim * (1 - s), ...o.v });
      quads[o.id] = appear > 0.6 && !backing ? screenQuad(M) : null;
    }

    // ---- les lettres : de leur place en haut jusqu'à leur ligne sur la feuille ----
    const list = [];
    for (const f of flyers) {
      const u = reduced ? (tu > f.at ? 1 : 0) : clamp01((tu - f.at) / f.dur);
      const end = M4.mul(Msheet, M4.mul(T(COL_X, baseOf(f.i), SHEET.t / 2 + 0.3), S(emT)));
      const start = M4.mul(starts[f.i], S(from.em));
      let M, alpha = 1;
      if (u <= 0) M = start;
      else if (u >= 1) M = end;
      else {
        // départ doux, arrivée franche ; légère courbe, la lettre se soulève un peu en route
        // elle descend à droite de la colonne, puis glisse dans sa ligne par la droite (comme le chariot d'une
        // machine) : elle ne passe jamais sur les lettres déjà posées
        const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2.2) / 2;
        const a = posOf(start), b = posOf(end);
        const c = [b[0] + f.side, b[1], (a[2] + b[2]) / 2];
        const q = [0, 1, 2].map(j => (1 - e) * (1 - e) * a[j] + 2 * (1 - e) * e * c[j] + e * e * b[j]);
        const L0 = lerp(a[0], b[0], e), L1 = lerp(a[1], b[1], e), L2 = lerp(a[2], b[2], e);
        M = blendM(start, end, e, [q[0] - L0, q[1] - L1, q[2] - L2 + f.lift * Math.sin(Math.PI * e)]);
      }
      if (reduced && u > 0 && u < 1) alpha = 1;
      // clarté : celle qu'elle avait (allumée), qui se calme en route ; à l'arrivée elle s'allume un peu (absorbée),
      // puis la lumière parcourt la colonne de haut en bas
      const land = tu - (f.at + f.dur);
      let g = u < 1 ? lerp(f.g0, 0.3, sstep(0, 1, u)) : 0.3 * Math.exp(-land / 0.5);
      if (land > 0) g += f.k * 0.55 * sstep(0, 0.35, land) * Math.exp(-Math.max(0, land - 0.35) / f.dec);
      const rk = tu - (READ_AT + flyers.indexOf(f) * READ_GAP);
      if (rk > 0) g += 0.5 * sstep(0, 0.5, rk) * Math.exp(-Math.max(0, rk - 0.5) / 1.6);
      // vue « commande » : la colonne passe au second plan
      list.push({ i: f.i, model: M, glow: g * (1 - 0.8 * s), alpha: alpha * (1 - 0.75 * s) });
    }
    gl.disable(gl.DEPTH_TEST);
    nameR.drawLetters(vp, eye, P, L, list, t);
    gl.enable(gl.DEPTH_TEST);
  }
  function cursorOn(tu) { return first < 0 ? 0 : sstep(CURSOR_AT, CURSOR_AT + 0.9, tu); }

  function screenQuad(M) {
    const mvp = M4.mul(vp, M);
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
      const x = sx * CARD.w / 2, y = sy * CARD.h / 2;
      const cx = mvp[0] * x + mvp[4] * y + mvp[12], cy = mvp[1] * x + mvp[5] * y + mvp[13], cw = mvp[3] * x + mvp[7] * y + mvp[15];
      return [(cx / cw * 0.5 + 0.5) * W, (0.5 - cy / cw * 0.5) * H];
    });
  }
  const inside = (q, x, y) => {
    if (!q) return false;
    let s = 0;
    for (let i = 0; i < 4; i++) {
      const [ax, ay] = q[i], [bx, by] = q[(i + 1) % 4], c = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
      if (c !== 0) { if (s === 0) s = Math.sign(c); else if (Math.sign(c) !== s) return false; }
    }
    return true;
  };
  const rectOf = q => { const xs = q.map(p => p[0]), ys = q.map(p => p[1]); return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) }; };

  function showOrders(t) { if (orderAt < 0) orderAt = t; sT = 1; }
  let pressO = null;
  function hit(x, y) {
    for (const o of orders) if (inside(quads[o.id], x, y)) return o;
    if (C && inside(quads.C, x, y)) return 'card';
    return null;
  }
  function gesture(t) { lastGesture = t; }
  function tap(x, y, t) {
    gesture(t);
    if (backing) return { type: null };
    const h = hit(x, y);
    if (h === 'card') {
      if (tau(t) < CARD_MOVE[1] || C.flipT0 >= 0) return { type: null };
      C.flipTo = C.flips + 1; C.flipT0 = t; C.flipA = 0;
      return { type: 'flip' };
    }
    if (h && typeof h === 'object') {
      if (h.anim) return { type: null };
      chosen = { id: h.id, o: h, t0: t };
      const detail = { name: from.name, kind: from.kind, id: from.id, text: from.text, mode: h.id };
      try { if (typeof window.onOrder === 'function') window.onOrder(detail); } catch (e) { console.error(e); }
      window.dispatchEvent(new CustomEvent('singulies:order', { detail }));
      emit('order', detail);
      const url = ORDER_LINKS[h.id];
      if (url) { setTimeout(() => { location.href = url; }, 400); return { type: 'order' }; }
      if (!soonInk) soonInk = card.makeInk(makeInkMap('bientôt', 77).canvas);
      h.anim = { t0: t };
      setTimeout(() => { if (chosen && chosen.o === h) chosen = null; }, 4800);
      return { type: 'order' };
    }
    return { type: null };
  }
  function press(x, y) { const h = hit(x, y); pressO = h && typeof h === 'object' ? h : null; }
  function release() { pressO = null; }
  // glisser / molette : d < 0 = descendre vers la commande, d > 0 = remonter vers la feuille
  function scroll(d, t) {
    gesture(t);
    if (backing || tau(t) < CURSOR_AT * 0.6) return;
    if (d < 0) showOrders(t); else sT = 0;
  }
  function back(t) {
    if (backing) return false;
    gesture(t);
    backing = { t0: t, tau0: Math.min(tau(t), INTRO_END), fired: false };
    if (C && C.flips % 2) { C.flipTo = C.flips + 1; C.flipT0 = t; C.flipA = 0; }   // la carte revient côté question
    return true;
  }
  function setTilt(x, y) { tilt.x = Math.max(-1, Math.min(1, x)); tilt.y = Math.max(-1, Math.min(1, y)); }
  function free() {
    for (const o of orders) card.freeInk(o.ink);
    if (C) { if (C.ownBack) card.freeInk(C.back); if (C.ownFront) card.freeInk(C.front); }
    if (soonInk) card.freeInk(soonInk);
  }
  // rectangle écran de ce que le pointeur incline (la feuille ou la commande) : souris dessus = droit
  function focusRect() {
    if (!vp) return null;
    if (sv > 0.5) { const qs = orders.map(o => quads[o.id]).filter(Boolean); if (qs.length) return rectOf(qs.flat()); }
    const mvp = M4.mul(vp, lastMsheet);
    const c = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
      const x = sx * SHEET.w / 2, y = sy * SHEET.h / 2;
      const cx = mvp[0] * x + mvp[4] * y + mvp[12], cy = mvp[1] * x + mvp[5] * y + mvp[13], cw = mvp[3] * x + mvp[7] * y + mvp[15];
      return [(cx / cw * 0.5 + 0.5) * W, (0.5 - cy / cw * 0.5) * H];
    });
    return rectOf(c);
  }
  return {
    frame, tap, press, release, scroll, back, setTilt, free, focusRect, gesture,
    state: () => ({ tau: tau(lastT), view: sv > 0.5 ? 'commande' : 'feuille', orders: orderAt >= 0, backing: !!backing, cursor: cursorOn(tau(lastT)) > 0.5, chosen: chosen ? chosen.id : null }),
    // tests / captures
    showOrders: () => showOrders(lastT), choose: id => { const o = orders.find(x => x.id === id); const q = quads[id]; if (o && q) { const r = rectOf(q); return tap((r.left + r.right) / 2, (r.top + r.bottom) / 2, lastT); } return null; },
    timing: { landAll, CURSOR_AT, INTRO_END },
    debug: () => ({ quads, C: C && { flips: C.flips, flipT0: C.flipT0, phi0: C.phi0, phi1: C.phi1 }, SY }),
  };
}
