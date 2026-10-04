// Scène 2 — le paquet de cartes questions. Monde en mm, cartes dans le plan XY face à la caméra.
// Disposition : prénom en haut (dessiné ailleurs), paquet au centre, carte vierge dessous.
// Toucher le paquet = piocher : la carte du dessus se soulève, se retourne et se pose, question
// visible, sur le paquet. Toucher la question (ou le paquet) = la défausser : elle s'en va et la
// suivante se retourne aussitôt. Lumière neutre, direction fixe ; le téléphone incliné (ou la souris) la
// fait varier un peu, jamais sa force.
import { createCardRenderer, M4, CARD } from './cardRenderer.js';
import { loadTypeFont, makeInkMap } from './ink.js';
import { createNameRelief } from './nameRelief.js';
import { createRng } from '../field/rng.js';
import QUESTIONS from './questions.json';

// matière et lumière (calage du banc, éclairage du site : neutre, venant d'en haut à gauche, devant)
export const LOOK = {
  // réglé par Maxence sur téléphone (04/10). Cartes noires ; lampe principale dont l'inclinaison du téléphone
  // (ou la souris, ou le doigt en repli) fait tourner la direction (pas de lumière de reflet : grisait les cartes) ;
  // la carte retournée projette son ombre douce sur le paquet ; les bords cassés accrochent la lumière.
  light: 0.111, lightR: 400, env: 0.28, albedo: 0.029, exposure: 0.74, lightAz: 0.67, lightR0: 1.0, lightZ: 210, tiltAmp: 1.45,
  h: 0.19, b: 1.32, crease: 0, fiber: 0.06, foot: 0.76, footW: 0.165, parallax: 0,
  rough: 0.64, spec: 3.1, sheen: 0, glint: 0.35, edge: 3, grain: 1.25, diffRough: 0.65, envSpec: 0.32, toe: 0.0078,
  nameAlb: 0.5, nameRelief: 0.05, nameBevel: 0.07, nameSpec: 0.4,
  inkAlb: 0.35, inkPress: 0.1, inkWear: 3, inkThr: 0.35, inkVar: 0.6, inkPaper: 11.5, inkOrg: 0,
};
const FOV = 26 * Math.PI / 180;
const TILT = 0.3;                  // la caméra regarde un peu d'en haut : les cartes fuient légèrement
const STACK = 12;                   // cartes visibles dans la pile
const PITCH = 0.15;                 // pas d'une carte dans la pile (mm) : carte 0,125 + air
const DRAW_T = 1.3, DISCARD_T = 0.9;
const REDRAW_DELAY = DISCARD_T * 0.88;   // la suivante ne part qu'une fois la place libre au-dessus du paquet
const FLIP_H = CARD.w / 2 + 7;          // hauteur de retournement : la demi-carte qui plonge ne touche jamais le paquet
const sstep = (a, b, x) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };

const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k], norm3 = a => mul3(a, 1 / Math.hypot(...a));
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const ease = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
const easeIn = u => u * u * u;
const clamp01 = u => Math.min(1, Math.max(0, u));

export async function createCardScene(gl, { base = './', seed = (Math.random() * 1e9) >>> 0, look = {} } = {}) {
  // look : surcharge de LOOK (page de dev : ?light=…&env=…)
  const card = await createCardRenderer(gl, base);
  const nameR = await createNameRelief(gl);
  let nameText = '', nameKey = '';
  await loadTypeFont(base);
  const L = { ...LOOK, ...look };
  const rnd = createRng(seed);

  // paquet : ordre tiré au hasard ; chaque carte a ses variations (papier, gondolage, logo)
  const order = QUESTIONS.map(q => q.id);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const variant = () => ({
    seed: rnd() * 100,
    paperXf: [rnd.range(-2.5, 2.5), rnd.range(-1.5, 1.5), rnd() < 0.5 ? 0 : Math.PI, 0],
    logoOff: [rnd.range(-0.15, 0.15), rnd.range(-0.15, 0.15)],   // logo centré (marquage : ±0,15 mm)
    warp: [rnd.range(0.05, 0.35), rnd.range(-0.2, 0.05), rnd.range(-0.12, 0.12)],
    jx: rnd.range(-0.5, 0.5), jy: rnd.range(-0.4, 0.4), jr: rnd.range(-0.012, 0.012),
  });
  const stack = Array.from({ length: STACK }, variant);           // de bas en haut
  const blank = { ...variant(), jr: rnd.range(-0.01, 0.01) };
  let next = 0;                    // prochaine question à tirer dans order
  let face = null;                 // carte retournée sur le paquet : { id, ink, v, t0, from }
  let leaving = [];                // cartes défaussées en train de partir
  let pendingDraw = -1;            // instant où repiocher (après une défausse)

  // disposition (recalculée à chaque image)
  const lay = { W: 1, H: 1, D: 300, Hw: 100, Ww: 100, yDeck: 0, yBlank: -60 };
  function layout(W, H) {
    const portrait = W < H;
    const cardHpx = portrait ? Math.min(W * 0.80 / (CARD.w / CARD.h), H * 0.27) : H * 0.27;
    const cardWpx = cardHpx * CARD.w / CARD.h;
    lay.W = W; lay.H = H;
    lay.D = (CARD.w / cardWpx) * (H / 2) / Math.tan(FOV / 2);
    lay.Hw = 2 * lay.D * Math.tan(FOV / 2); lay.Ww = lay.Hw * W / H;
    lay.yDeck = (0.5 - 0.42) * lay.Hw;
    lay.yBlank = (0.5 - 0.76) * lay.Hw;
  }

  // poses (position mm + rotations) ; ry = π : face question vers la caméra
  const stackPose = (i, v) => ({ x: v.jx, y: lay.yDeck + v.jy, z: i * PITCH, rx: 0, ry: 0, rz: v.jr });
  const facePose = v => ({ x: v.jx * 3 + 1.2, y: lay.yDeck + v.jy * 2 - 0.8, z: STACK * PITCH + 1.4, /* au-dessus du gaufrage de la carte du dessous */ rx: 0, ry: Math.PI, rz: v.jr * 1.5 });
  const visibleStack = () => Math.max(0, Math.min(STACK, QUESTIONS.length - next));

  function poseAt(c, t) {
    if (c.kind === 'draw') {
      // on soulève la carte (assez haut pour qu'en tournant sa moitié ne touche pas le paquet), on la
      // retourne en l'air, puis on la repose, question visible, sur le paquet
      const u = clamp01((t - c.t0) / DRAW_T), a = c.from, b = facePose(c.v);
      const up = sstep(0, 0.36, u), down = sstep(0.64, 1, u), e = ease(u);
      return {
        x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e + 4 * (up - down),
        z: a.z + FLIP_H * (up - down) + (b.z - a.z) * down,
        rx: -0.1 * (up - down), ry: Math.PI * sstep(0.24, 0.76, u), rz: a.rz + (b.rz - a.rz) * e,
      };
    }
    if (c.kind === 'discard') {
      // la carte glisse hors du cadre en accélérant, à peine soulevée, en pivotant un peu
      const u = clamp01((t - c.t0) / DISCARD_T), e = Math.pow(u, 2.2), a = c.from;
      return { x: a.x - e * (lay.Ww / 2 + CARD.w * 1.1), y: a.y - 10 * u, z: a.z + 3 * sstep(0, 0.3, u), rx: 0, ry: Math.PI, rz: a.rz + 0.28 * e };
    }
    return facePose(c.v);
  }

  function draw(t) {
    if (next >= QUESTIONS.length) return false;
    const id = order[next++];
    const v = stack.pop(); stack.unshift(variant());            // la pile garde la même hauteur visible
    const q = QUESTIONS.find(x => x.id === id);
    const ink = card.makeInk(makeInkMap(q.q, Math.floor(v.seed * 1000) + id).canvas);
    face = { id, ink, v, kind: 'draw', t0: t, from: stackPose(STACK - 1, v) };
    return id;
  }
  function discard(t) {
    if (!face) return null;
    const out = { ...face, kind: 'discard', t0: t, from: poseAt(face, t) };
    leaving.push(out); face = null;
    pendingDraw = t + REDRAW_DELAY;
    return out.id;
  }

  // lumière : suit le pointeur (ressort ω 2,2 ζ 0,85), petite dérive au repos
  // lumière : direction fixe (en haut à gauche) ; seules l'inclinaison du téléphone et, sur ordinateur, la
  // position de la souris la font varier un peu (comme un reflet sur du verre) — jamais sa force.
  // tilt : décalage normalisé [-1, 1] (x à droite, y en haut), fourni par la page (gyroscope ou souris).
  const tilt = { x: 0, y: 0 }, ts = { x: 0, y: 0 };   // ts : inclinaison lissée (≈ 0,35 s)
  const lp = { x: Math.cos(L.lightAz), y: Math.sin(L.lightAz), vx: 0, vy: 0 };
  function stepLight(dt) {
    const kk = Math.min(1, dt * 3); ts.x += (tilt.x - ts.x) * kk; ts.y += (tilt.y - ts.y) * kk;
    let tx = Math.cos(L.lightAz) + L.tiltAmp * tilt.x, ty = Math.sin(L.lightAz) + L.tiltAmp * tilt.y;
    const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const w = 2.2, z = 0.85;
    for (const [k, v, tg] of [['x', 'vx', tx], ['y', 'vy', ty]]) {
      const acc = -2 * z * w * lp[v] - w * w * (lp[k] - tg);
      lp[v] += acc * dt; lp[k] += lp[v] * dt;
    }
  }

  let vp = null, eye = null;
  function frame(t, dt, W, H) {
    layout(W, H);
    if (pendingDraw >= 0 && t >= pendingDraw) { pendingDraw = -1; draw(t); }
    if (face && face.kind === 'draw' && t - face.t0 >= DRAW_T) face.kind = 'idle';
    leaving = leaving.filter(c => { if (t - c.t0 < DISCARD_T) return true; card.freeInk(c.ink); return false; });
    stepLight(dt);
    const cy = (lay.yDeck + lay.yBlank) / 2;
    eye = [0, cy - lay.D * Math.sin(TILT), lay.D * Math.cos(TILT)];
    const target = [0, cy, 0];
    const aspect = W / H;
    vp = M4.mul(M4.perspective(FOV, aspect, lay.D * 0.3, lay.D * 3), M4.lookAt(eye, target, [0, 1, 0]));
    // toute la lumière à l'échelle de la scène (réglée pour une scène de 235 mm de haut, téléphone) :
    // même rendu quel que soit le format
    const k = lay.Hw / 235;
    const ln = Math.hypot(lp.x, lp.y) || 1, cyL = (lay.yDeck + lay.yBlank) / 2;
    const lightPos = [lp.x / ln * L.lightR0 * lay.Hw, cyL + lp.y / ln * L.lightR0 * lay.Hw, L.lightZ * k];
    const P = { ...L, lightPos, light: L.light * k * k };
    gl.enable(gl.DEPTH_TEST);
    // pile (maillage léger, de plus en plus dans l'ombre vers le bas) ; dessus en maillage fin
    // la carte retournée (ou en train de l'être) projette son ombre sur le paquet
    const fp = face ? poseAt(face, t) : null, occ = fp ? { x: fp.x, y: fp.y, z: fp.z, rz: fp.rz } : null;
    const n = visibleStack();
    for (let i = 0; i < n; i++) {
      const v = stack[STACK - n + i], p = stackPose(i, v), top = i === n - 1;
      card.draw(vp, eye, P, { model: M4.model(p.rx, p.ry, p.rz, p.x, p.y, p.z), lod: top ? 'fine' : 'coarse', shade: 0.55 + 0.45 * (i + 1) / n, occ, ...v });
    }
    for (const c of [...leaving, ...(face ? [face] : [])]) {
      const p = poseAt(c, t);
      card.draw(vp, eye, P, { model: M4.model(p.rx, p.ry, p.rz, p.x, p.y, p.z), lod: 'fine', ink: c.ink, ...c.v });
    }
    // prénom en relief, en haut (dans le plan z = 0, à 13 % de la hauteur de l'écran)
    if (nameText) {
      const key = nameText + W + 'x' + H;
      if (key !== nameKey) {
        const fy = 0.135, ndcY = 1 - 2 * fy, tf = Math.tan(FOV / 2);
        const fwd = norm3(sub3([0, cy, 0], eye)), right = norm3(cross3(fwd, [0, 1, 0])), up = cross3(right, fwd);
        const dir = norm3(add3(fwd, mul3(up, ndcY * tf)));
        const s = -eye[2] / dir[2], py = eye[1] + dir[1] * s;
        const capPx = Math.min(52, Math.max(26, 0.052 * H)) * 0.66, capMm = capPx * lay.Hw / H;
        nameR.layout(nameText, 0, py, capMm, lay.Ww * 0.86);
        nameKey = key;
      }
    }
    // carte vierge (recto vers la caméra, sans texte)
    card.draw(vp, eye, P, { model: M4.model(0, Math.PI, blank.jr, blank.jx, lay.yBlank, 0), lod: 'fine', ...blank });
    if (nameText) nameR.draw(vp, eye, P, L);
  }

  // sélection : coins de la carte projetés à l'écran (px CSS), point dans le quadrilatère
  function screenQuad(p) {
    const m = M4.model(p.rx, p.ry, p.rz, p.x, p.y, p.z), mvp = M4.mul(vp, m);
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

  // toucher : renvoie ce qui s'est passé ({ type: 'draw' | 'discard' | 'blank' | null, id })
  function tap(x, y, t) {
    if (!vp) return { type: null };
    if (face && inside(screenQuad(poseAt(face, t)), x, y)) {
      if (face.kind !== 'idle') return { type: null };
      return { type: 'discard', id: discard(t) };
    }
    const n = visibleStack();
    if (n && inside(screenQuad(stackPose(n - 1, stack[STACK - 1])), x, y)) {
      if (face) { if (face.kind !== 'idle') return { type: null }; return { type: 'discard', id: discard(t) }; }
      if (pendingDraw >= 0) return { type: null };
      return { type: 'draw', id: draw(t) };
    }
    if (inside(screenQuad({ x: blank.jx, y: lay.yBlank, z: 0, rx: 0, ry: Math.PI, rz: blank.jr }), x, y)) return { type: 'blank' };
    return { type: null };
  }
  function setName(s) { nameText = s || ''; nameKey = ''; }
  function setTilt(x, y) { tilt.x = Math.max(-1, Math.min(1, x)); tilt.y = Math.max(-1, Math.min(1, y)); }
  const current = () => (face ? face.id : null);
  // direction (unitaire, écran : x à droite, y en haut) d'où vient la lumière — le prénom s'en sert
  const lightDir = () => { const l = Math.hypot(lp.x, lp.y) || 1; return [lp.x / l, lp.y / l]; };
  return { frame, tap, setTilt, setName, current, lightDir, look: L, layout: lay };
}
