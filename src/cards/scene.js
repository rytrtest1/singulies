// Scène 2 — le paquet de cartes questions. Monde en mm, cartes dans le plan XY face à la caméra.
// Disposition : prénom en haut (dessiné ailleurs), paquet au centre, carte vierge dessous.
// Toucher le paquet = piocher : la carte du dessus se soulève, se retourne et se pose, question
// visible, sur le paquet. Toucher la question (ou le paquet) = la défausser : elle s'en va et la
// suivante se retourne aussitôt. Lumière neutre qui suit doucement le pointeur (ressort amorti).
import { createCardRenderer, M4, CARD } from './cardRenderer.js';
import { loadTypeFont, makeInkMap } from './ink.js';
import { createRng } from '../field/rng.js';
import QUESTIONS from './questions.json';

// matière et lumière (calage du banc, éclairage du site : neutre, venant d'en haut à gauche, devant)
export const LOOK = {
  light: 0.012, lightR: 70, env: 0.03, albedo: 0.05, exposure: 1.0,
  h: 0.5, b: 1.0, crease: 0.3, fiber: 0.03, foot: 0.4, footW: 0.12, parallax: 0,
  rough: 0.45, spec: 3, sheen: 0.3, glint: 2, edge: 1.0, grain: 3, diffRough: 0.25,
  inkAlb: 2.0, inkPress: 0.04, inkWear: 1.4, inkThr: 0.38, inkVar: 1.5, inkPaper: 15, inkOrg: 0.95,
};
const FOV = 26 * Math.PI / 180;
const TILT = 0.3;                  // la caméra regarde un peu d'en haut : les cartes fuient légèrement
const STACK = 12;                   // cartes visibles dans la pile
const PITCH = 0.27;                 // épaisseur d'une carte dans la pile (mm)
const DRAW_T = 1.05, DISCARD_T = 0.75, REDRAW_DELAY = 0.12;

const ease = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
const easeIn = u => u * u * u;
const clamp01 = u => Math.min(1, Math.max(0, u));

export async function createCardScene(gl, { base = './', seed = (Math.random() * 1e9) >>> 0, look = {} } = {}) {
  const card = await createCardRenderer(gl, base);
  await loadTypeFont(base);
  const L = { ...LOOK, ...look };
  const rnd = createRng(seed);

  // paquet : ordre tiré au hasard ; chaque carte a ses variations (papier, gondolage, logo)
  const order = QUESTIONS.map(q => q.id);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const variant = () => ({
    seed: rnd() * 100,
    paperXf: [rnd.range(-12, 12), rnd.range(-8, 8), rnd() < 0.5 ? 0 : Math.PI, 0],
    logoOff: [-0.9 + rnd.range(-0.4, 0.4), 0.3 + rnd.range(-0.4, 0.4)],
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
  const facePose = v => ({ x: v.jx * 3 + 1.2, y: lay.yDeck + v.jy * 2 - 0.8, z: STACK * PITCH + 0.6, rx: 0, ry: Math.PI, rz: v.jr * 1.5 });
  const visibleStack = () => Math.max(0, Math.min(STACK, QUESTIONS.length - next));

  function poseAt(c, t) {
    if (c.kind === 'draw') {
      const u = clamp01((t - c.t0) / DRAW_T), e = ease(u), a = c.from, b = facePose(c.v);
      const lift = Math.sin(Math.PI * e);
      return {
        x: a.x + (b.x - a.x) * e - lift * 6, y: a.y + (b.y - a.y) * e + lift * 8, z: a.z + (b.z - a.z) * e + lift * 22,
        rx: -lift * 0.25, ry: Math.PI * ease(clamp01(u * 1.15 - 0.05)), rz: a.rz + (b.rz - a.rz) * e,
      };
    }
    if (c.kind === 'discard') {
      const u = clamp01((t - c.t0) / DISCARD_T), e = easeIn(u), a = c.from;
      return { x: a.x - e * lay.Ww * 0.9, y: a.y - e * 18, z: a.z + Math.sin(Math.PI * u) * 12, rx: 0, ry: Math.PI, rz: a.rz + e * 0.35 };
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
  const ptr = { x: 0.5, y: 0.35 }, lp = { x: 0, y: 0, vx: 0, vy: 0 };
  function stepLight(dt, t) {
    const tx = (ptr.x - 0.5) * lay.Ww * 0.9 - lay.Ww * 0.25 + Math.sin(t * 0.13) * 6;
    const ty = (0.5 - ptr.y) * lay.Hw * 0.7 + lay.Hw * 0.35 + Math.sin(t * 0.09 + 1) * 5;
    const w = 2.2, z = 0.85;
    for (const [k, v, tg] of [['x', 'vx', tx], ['y', 'vy', ty]]) {
      const a = -2 * z * w * lp[v] - w * w * (lp[k] - tg);
      lp[v] += a * dt; lp[k] += lp[v] * dt;
    }
  }

  let vp = null, eye = null;
  function frame(t, dt, W, H) {
    layout(W, H);
    if (pendingDraw >= 0 && t >= pendingDraw) { pendingDraw = -1; draw(t); }
    if (face && face.kind === 'draw' && t - face.t0 >= DRAW_T) face.kind = 'idle';
    leaving = leaving.filter(c => { if (t - c.t0 < DISCARD_T) return true; card.freeInk(c.ink); return false; });
    stepLight(dt, t);
    const cy = (lay.yDeck + lay.yBlank) / 2;
    eye = [0, cy - lay.D * Math.sin(TILT), lay.D * Math.cos(TILT)];
    const target = [0, cy, 0];
    const aspect = W / H;
    vp = M4.mul(M4.perspective(FOV, aspect, lay.D * 0.3, lay.D * 3), M4.lookAt(eye, target, [0, 1, 0]));
    const lightPos = [lp.x, lp.y, 260];
    const P = { ...L, lightPos };
    gl.enable(gl.DEPTH_TEST);
    // pile (maillage léger, de plus en plus dans l'ombre vers le bas) ; dessus en maillage fin
    const n = visibleStack();
    for (let i = 0; i < n; i++) {
      const v = stack[STACK - n + i], p = stackPose(i, v), top = i === n - 1;
      card.draw(vp, eye, P, { model: M4.model(p.rx, p.ry, p.rz, p.x, p.y, p.z), lod: top ? 'fine' : 'coarse', shade: 0.55 + 0.45 * (i + 1) / n, ...v });
    }
    for (const c of [...leaving, ...(face ? [face] : [])]) {
      const p = poseAt(c, t);
      card.draw(vp, eye, P, { model: M4.model(p.rx, p.ry, p.rz, p.x, p.y, p.z), lod: 'fine', ink: c.ink, ...c.v });
    }
    // carte vierge (recto vers la caméra, sans texte)
    card.draw(vp, eye, P, { model: M4.model(0, Math.PI, blank.jr, blank.jx, lay.yBlank, 0), lod: 'fine', ...blank });
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
  function pointer(x, y) { ptr.x = x / lay.W; ptr.y = y / lay.H; }
  const current = () => (face ? face.id : null);
  return { frame, tap, pointer, current, layout: lay };
}
