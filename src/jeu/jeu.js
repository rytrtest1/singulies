// « le jeu » (proposition de la nuit du 05 au 06/10) : la page du paquet, depuis le portail. Même monde que le portail
// et la scène des cartes (papier, lumière, gestes). Le paquet arrive du fond et tire pour la personne : la carte du
// dessus se soulève, se retourne en l'air et se pose à côté, question visible — on goûte le jeu. Toucher le paquet ou
// glisser la question de côté : la suivante (la précédente part de son côté). Sous le paquet, une carte « le
// commander » (lien JEU_LINK ; lien d'attente pour l'instant : un demi-tour, « bientôt », puis retour) ; après la
// troisième question elle sautille (touche-moi). Retour (flèche, Échap) : le portail.
import { createCardRenderer, M4, CARD } from '../cards/cardRenderer.js';
import { loadTypeFont, makeInkMap } from '../cards/ink.js';
import { LOOK } from '../cards/scene.js';
import { createRng } from '../field/rng.js';
import QUESTIONS from '../cards/questions.json';
import { dpr3d } from '../app/perf.js';

export const JEU_LINK = null;                     // page d'achat du jeu (null = « bientôt »)
const BUY = 'le commander';
const FOV = 26 * Math.PI / 180, TILT = 0.22, TF = Math.tan(FOV / 2);
const STACK = 12, PITCH = 0.15;
const DRAW_T = 1.5, DISCARD_T = 0.6, FLIP_T = 1.3, HOLD = 2.2;

const CSS = `
#jeu { position: fixed; inset: 0; z-index: 22; background: #060606; opacity: 0; transition: opacity .9s ease; touch-action: pinch-zoom; }
#jeu.on { opacity: 1; }
#jeu canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
#jeu button { position: absolute; margin: 0; padding: 0; border: 0; background: transparent; color: transparent; font-size: 1px;
  cursor: pointer; -webkit-tap-highlight-color: transparent; outline: none; }
#jeu button:focus-visible { outline: 1px solid rgba(255,255,255,.35); outline-offset: 4px; }
#jeu .jeu-back { left: max(6px, env(safe-area-inset-left)); top: max(6px, env(safe-area-inset-top)); width: 44px; height: 44px;
  color: #fff; opacity: 0; transition: opacity .8s; display: flex; align-items: center; justify-content: center; font-size: 0; }
#jeu .jeu-back.on { opacity: .44; }
#jeu .jeu-back.on:hover { opacity: .6; }
`;

const clamp01 = u => Math.min(1, Math.max(0, u));
const sstep = (a, b, x) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const ease = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
const lerp = (a, b, u) => a + (b - a) * u;
const lerpPose = (a, b, u) => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), z: lerp(a.z, b.z, u), rx: lerp(a.rx, b.rx, u), ry: lerp(a.ry, b.ry, u), rz: lerp(a.rz, b.rz, u) });
const hop = ph => 3.2 * sstep(0, 0.16, ph) * (1 - sstep(0.16, 0.45, ph)) + 1.1 * sstep(0.45, 0.57, ph) * (1 - sstep(0.57, 0.85, ph));

// opts : { base, reduced, onBack() }
export async function mountJeu(opts = {}) {
  const { base = './', reduced = false } = opts;
  if (!document.getElementById('jeu-style')) {
    const st = document.createElement('style'); st.id = 'jeu-style'; st.textContent = CSS; document.head.appendChild(st);
  }
  const root = document.createElement('div'); root.id = 'jeu';
  const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true');
  const backEl = document.createElement('button'); backEl.className = 'jeu-back'; backEl.type = 'button'; backEl.setAttribute('aria-label', 'Retour');
  backEl.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M14.5 6 L8.5 12 L14.5 18" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>';
  const deckBtn = document.createElement('button'); deckBtn.type = 'button'; deckBtn.textContent = 'une autre question'; deckBtn.setAttribute('aria-label', 'une autre question');
  const buyBtn = document.createElement('button'); buyBtn.type = 'button'; buyBtn.textContent = BUY; buyBtn.setAttribute('aria-label', BUY);
  const live = document.createElement('div'); live.setAttribute('aria-live', 'polite');
  live.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)';
  root.append(canvas, deckBtn, buyBtn, backEl, live);
  document.body.appendChild(root);
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, depth: true });
  if (!gl) { root.remove(); return null; }
  gl.clearColor(6 / 255, 6 / 255, 6 / 255, 1); gl.clear(gl.COLOR_BUFFER_BIT);
  requestAnimationFrame(() => root.classList.add('on'));

  const t0 = performance.now();
  let vclock = null;
  const now = () => vclock ?? (performance.now() - t0) / 1000;
  const rnd = createRng();
  const [card] = await Promise.all([createCardRenderer(gl, base), loadTypeFont(base)]);
  const L = { ...LOOK };
  const variant = () => ({
    seed: rnd() * 100, paperXf: [rnd.range(-2.5, 2.5), rnd.range(-1.5, 1.5), rnd() < 0.5 ? 0 : Math.PI, 0],
    logoOff: [rnd.range(-0.15, 0.15), rnd.range(-0.15, 0.15)],
    warp: [rnd.range(0.05, 0.35), rnd.range(-0.2, 0.05), rnd.range(-0.12, 0.12)],
    jx: rnd.range(-0.5, 0.5), jy: rnd.range(-0.4, 0.4), jr: rnd.range(-0.012, 0.012),
  });
  const stack = Array.from({ length: STACK }, variant);
  const order = QUESTIONS.map(q => q.q);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  let next = 0, shown = 0;
  const buy = { v: variant(), anim: null, press: 0 };
  buy.ink = card.makeInk(makeInkMap(BUY, Math.floor(buy.v.seed * 1000) + 5).canvas);
  let soonInk = null;

  // ---- disposition : le paquet (et la question posée dessus) au centre, « le commander » dessous ----
  const lay = { W: 1, H: 1, D: 300, Hw: 100, yDeck: 0, yBuy: -60 };
  function layout(W, H) {
    const portrait = W < H;
    const cardHpx = portrait ? Math.min(W * 0.78 / (CARD.w / CARD.h), H * 0.24) : H * 0.25;
    lay.W = W; lay.H = H;
    lay.D = (CARD.h / cardHpx) * (H / 2) / TF;
    lay.Hw = 2 * lay.D * TF;
    lay.yDeck = (0.5 - 0.4) * lay.Hw;
    lay.yBuy = (0.5 - 0.77) * lay.Hw / Math.cos(TILT);
  }
  const deckPose = (i, v) => ({ x: v.jx, y: lay.yDeck + v.jy, z: i * PITCH, rx: 0, ry: 0, rz: v.jr });
  const FACE_Z = STACK * PITCH + 1.4;
  const facePose = (v, dx = 0) => ({ x: v.jx * 3 + 1.2 + dx, y: lay.yDeck + v.jy * 2 - 0.8, z: FACE_Z, rx: 0, ry: Math.PI, rz: v.jr * 1.5 + dx * 0.0015 });
  const buyPose = () => ({ x: buy.v.jx * 2, y: lay.yBuy + buy.v.jy, z: 0, rx: 0, ry: Math.PI, rz: buy.v.jr * 2 - 0.02 });

  // ---- questions : la carte du dessus se soulève, se retourne en l'air, se pose (celle de la scène des cartes) ----
  let question = null, leaving = [], pendingDraw = -1, startT = 0, lastGesture = -99, dragX = 0, dragging = false;
  const busy = (c, t) => !!(c && c.anim && t - c.t0 < c.dur);
  function draw(t) {
    if (next >= order.length) next = 0;
    const v = stack.pop(); stack.unshift(variant());
    const q = order[next++];
    question = { q, v, ink: card.makeInk(makeInkMap(q, Math.floor(v.seed * 1000) + next).canvas), anim: 'draw', t0: t, dur: DRAW_T, from: deckPose(STACK - 1, v) };
    shown++;
    live.textContent = q;
  }
  function discard(t, dir = -1) {
    if (!question || busy(question, t)) return false;
    leaving.push({ ...question, anim: 'discard', t0: t, dur: DISCARD_T, dir, from: poseOf(question, t) });
    question = null; pendingDraw = t + DISCARD_T * 0.45;
    return true;
  }
  function poseOf(c, t) {
    const u = clamp01((t - c.t0) / c.dur);
    if (c.anim === 'draw') {
      const a = c.from, b = facePose(c.v), up = sstep(0, 0.35, u), down = sstep(0.6, 1, u), e = ease(u);
      const p = lerpPose(a, b, e);
      p.z += (CARD.w / 2 + 8) * (up - down) * 0.9; p.ry = Math.PI * sstep(0.2, 0.7, u); p.rx = -0.12 * (up - down);
      return p;
    }
    if (c.anim === 'discard') {
      const a = c.from, e = Math.pow(u, 1.8), s = c.dir;
      return { ...a, x: a.x + s * e * (lay.W / lay.H * lay.Hw / 2 + CARD.w * 1.2), y: a.y - 8 * u, z: a.z + 4 * sstep(0, 0.3, u), rz: a.rz + s * 0.3 * e };
    }
    return facePose(c.v, dragging && c === question ? dragX : 0);
  }
  function buyNow(t) {
    lastGesture = t;
    if (JEU_LINK) { location.href = JEU_LINK; return; }
    if (buy.anim) return;
    if (!soonInk) soonInk = card.makeInk(makeInkMap('bientôt', 77).canvas);
    buy.anim = { t0: t };
  }

  // ---- lumière (celle de la scène des cartes : lampe rasante, de côté, qui respire) + inclinaison ----
  const ptr = { x: 0, y: 0 }, tilt = { x: 0, y: 0 }, ts = { x: 0, y: 0 };
  const lamp = { a: L.lightAz, va: 0, e: L.elBase, ve: 0 };
  const CAM_AZ = -Math.PI / 2, wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
  function stepLight(dt, t) {
    const kk = Math.min(1, dt * 3); ts.x += (tilt.x - ts.x) * kk; ts.y += (tilt.y - ts.y) * kk;
    const backDir = CAM_AZ + Math.PI, lim = Math.PI - L.lampGap;
    let rel = wrapA(L.lightAz + L.breathAz * (0.72 * Math.sin(t * 0.33) + 0.28 * Math.sin(t * 0.69 + 1.3)) + 1.2 * L.tiltAmp * L.lightVar * ts.x - backDir);
    rel = lim * Math.tanh(rel / lim);
    const mid = (L.elMin + L.elMax) / 2, half = (L.elMax - L.elMin) / 2;
    let e = L.elBase + L.breathEl * (0.7 * Math.sin(t * 0.27 + 2.1) + 0.3 * Math.sin(t * 0.61 + 0.4)) + ts.y * L.elevAmp * L.lightVar;
    e = mid + half * Math.tanh((e - mid) / half);
    const w = 2.2, z = 0.85, da = wrapA(backDir + rel - lamp.a);
    lamp.va += (w * w * da - 2 * z * w * lamp.va) * dt; lamp.a += lamp.va * dt;
    lamp.ve += (w * w * (e - lamp.e) - 2 * z * w * lamp.ve) * dt; lamp.e += lamp.ve * dt;
  }
  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || !lay.W) return;
    ptr.x = Math.max(-1, Math.min(1, (e.clientX / lay.W - 0.5) * 2)); ptr.y = Math.max(-1, Math.min(1, -(e.clientY / lay.H - 0.5) * 2));
  });
  function onOrient(e) { if (e.beta != null && e.gamma != null) { ptr.x = Math.max(-1, Math.min(1, e.gamma / 25)); ptr.y = Math.max(-1, Math.min(1, -(e.beta - 50) / 25)); } }
  const DO = window.DeviceOrientationEvent;
  if (DO && typeof DO.requestPermission !== 'function') addEventListener('deviceorientation', onOrient);
  let asked = false;
  root.addEventListener('touchend', () => {
    if (asked || !DO || typeof DO.requestPermission !== 'function') return;
    asked = true; DO.requestPermission().then(r => { if (r === 'granted') addEventListener('deviceorientation', onOrient); }).catch(() => { asked = false; });
  }, { passive: true });

  // ---- image ----
  let vp = null, eye = null, raf = 0, last = 0, visible = true;
  const quads = {};
  function screenQuad(p) {
    const mvp = M4.mul(vp, M4.model(p.rx, p.ry, p.rz, p.x, p.y, p.z));
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
      const x = sx * CARD.w / 2, y = sy * CARD.h / 2;
      const cx = mvp[0] * x + mvp[4] * y + mvp[12], cy = mvp[1] * x + mvp[5] * y + mvp[13], cw = mvp[3] * x + mvp[7] * y + mvp[15];
      return [(cx / cw * 0.5 + 0.5) * lay.W, (0.5 - cy / cw * 0.5) * lay.H];
    });
  }
  function place(b, q) {
    if (!q) { b.style.width = '0px'; return; }
    const xs = q.map(p => p[0]), ys = q.map(p => p[1]), x0 = Math.min(...xs), y0 = Math.min(...ys);
    Object.assign(b.style, { left: x0 + 'px', top: y0 + 'px', width: (Math.max(...xs) - x0) + 'px', height: (Math.max(...ys) - y0) + 'px' });
  }
  function frame(n, manualDt) {
    if (vclock != null && manualDt == null) return;
    if (manualDt == null) raf = requestAnimationFrame(frame);
    const dt = manualDt ?? Math.min(0.05, last ? (n - last) / 1000 : 0.016); last = n;
    const t = now();
    const dpr = dpr3d(), W = innerWidth, H = innerHeight;
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
    layout(W, H);
    if (pendingDraw >= 0 && t >= pendingDraw) { pendingDraw = -1; draw(t); }
    if (question && question.anim && t - question.t0 >= question.dur) question.anim = null;
    leaving = leaving.filter(c => { if (t - c.t0 < c.dur) return true; card.freeInk(c.ink); return false; });
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(6 / 255, 6 / 255, 6 / 255, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const br = reduced ? { x: 0, y: 0 } : { x: 0.42 * Math.sin(t * 0.52) + 0.16 * Math.sin(t * 0.97 + 1), y: 0.32 * Math.sin(t * 0.41 + 2) + 0.12 * Math.sin(t * 0.83) };
    tilt.x = Math.max(-1, Math.min(1, ptr.x + 0.4 * br.x)); tilt.y = Math.max(-1, Math.min(1, ptr.y + 0.4 * br.y));
    stepLight(dt, t);

    const D = lay.D, cy = (lay.yDeck + lay.yBuy) / 2 + 4;
    eye = [0, cy - D * Math.sin(TILT), D * Math.cos(TILT)];
    vp = M4.mul(M4.perspective(FOV, W / H, D * 0.3, D * 3), M4.lookAt(eye, [0, cy, 0], [0, 1, 0]));
    const k = lay.Hw / 235;
    const R = L.lightR0 * lay.Hw, Z = L.lightZ * k, D0 = Math.hypot(R, Z), el0 = Math.atan2(Z, R), el = lamp.e;
    const ap = { x: 0, y: lay.yDeck };
    const lightPos = [ap.x + Math.cos(lamp.a) * D0 * Math.cos(el), ap.y + Math.sin(lamp.a) * D0 * Math.cos(el), D0 * Math.sin(el)];
    const P = { ...L, lightPos, light: L.light * k * k * Math.sin(el0) / Math.sin(el), spotI: 0 };

    // le paquet (avec la question posée dessus) s'incline vers la souris / le téléphone ; « le commander » respire
    const intro = reduced ? sstep(0, 0.8, t - startT) : ease(clamp01((t - startT) / 1.4));
    const crx = -ts.y * L.cardTilt, cry = ts.x * L.cardTilt;
    const group = (py, ph, wt) => {
      const sw = (reduced ? 0 : L.sway) * 0.5 * (1 - wt), tt = t;
      const rx = crx * wt + sw * (0.6 * Math.sin(tt * 0.61 + ph) + 0.4 * Math.sin(tt * 1.37 + 2.1 * ph));
      const ry = cry * wt + sw * 1.2 * (0.6 * Math.sin(tt * 0.47 + 1.7 * ph) + 0.4 * Math.sin(tt * 1.13 + 0.6 * ph));
      return M4.mul(M4.mul(M4.model(0, 0, 0, 0, py, 0), M4.model(rx, ry, 0)), M4.model(0, 0, 0, 0, -py, 0));
    };
    const Gin = M4.model(0, 0, 0, 0, 0, -30 * (1 - intro));
    const Gq = M4.mul(Gin, group(lay.yDeck, 0, 1));
    const Gb = M4.mul(Gin, group(lay.yBuy, 2.3, 0));
    const model = (G, p) => M4.mul(G, M4.model(p.rx, p.ry, p.rz, p.x, p.y, p.z));
    gl.enable(gl.DEPTH_TEST);
    const qp = question ? poseOf(question, t) : null;
    const occ = question && !question.anim ? { x: qp.x, y: qp.y, z: qp.z, rz: qp.rz } : null;
    for (let i = 0; i < STACK; i++) card.draw(vp, eye, P, { model: model(Gq, deckPose(i, stack[i])), lod: i === STACK - 1 ? 'fine' : 'coarse', shade: 0.55 + 0.45 * (i + 1) / STACK, fade: intro, occ, ...stack[i] });
    for (const c of leaving) card.draw(vp, eye, P, { model: model(Gq, poseOf(c, t)), lod: 'fine', ink: c.ink, fade: intro, ...c.v });
    if (question) card.draw(vp, eye, P, { model: model(Gq, qp), lod: 'fine', ink: question.ink, fade: intro, ...question.v });
    // « le commander » : apparaît après la première question ; sautille après la troisième (quand rien ne bouge)
    const bIn = shown >= 1 ? ease(clamp01((t - firstAt - 1.2) / 1.2)) : 0;
    let bp = buyPose(), dz = 0;
    if (buy.anim) {
      const tf = t - buy.anim.t0, u1 = clamp01(tf / FLIP_T), u2 = clamp01((tf - FLIP_T - HOLD) / FLIP_T);
      bp.ry += Math.PI * (sstep(0.15, 0.85, u1) - sstep(0.15, 0.85, u2));
      dz += (CARD.w / 2 + 8) * (Math.sin(Math.PI * u1) + Math.sin(Math.PI * u2)) * (reduced ? 0 : 1);
      if (tf > 2 * FLIP_T + HOLD) buy.anim = null;
    }
    const idle = t - Math.max(lastGesture + 2, firstAt + 3);
    if (!reduced && !buy.anim && shown >= 3 && idle > 0) dz += hop(idle % 5);
    buy.press += ((pressBuy ? 1 : 0) - buy.press) * Math.min(1, dt * 14);
    bp = { ...bp, y: bp.y - 20 * (1 - bIn), z: bp.z + dz - 0.5 * buy.press - 20 * (1 - bIn) };
    if (bIn > 0.004) card.draw(vp, eye, P, { model: model(Gb, bp), lod: 'fine', ink: buy.ink, inkBack: buy.anim ? soonInk : null, fade: intro * bIn, shade: 1 - L.unfocusDim * 0.5, ...buy.v });
    quads.deck = screenQuad({ ...deckPose(STACK - 1, stack[STACK - 1]), z: FACE_Z });
    quads.buy = bIn > 0.6 ? screenQuad(buyPose()) : null;
    place(deckBtn, quads.deck); place(buyBtn, quads.buy);
    backEl.classList.toggle('on', t - startT > 1.5);
  }
  let firstAt = 1e9, pressBuy = false;
  const inside = (q, x, y) => {
    if (!q) return false;
    let s = 0;
    for (let i = 0; i < 4; i++) {
      const [ax, ay] = q[i], [bx, by] = q[(i + 1) % 4], c = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
      if (c !== 0) { if (s === 0) s = Math.sign(c); else if (Math.sign(c) !== s) return false; }
    }
    return true;
  };

  // ---- gestes : toucher le paquet = une autre ; glisser la question de côté = une autre ; « le commander » ----
  let down = null;
  canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, moved: false }; pressBuy = inside(quads.buy, e.clientX, e.clientY); });
  addEventListener('pointermove', e => {
    if (!down || !visible) return;
    const dx = e.clientX - down.x;
    if (!down.moved && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(e.clientY - down.y)) down.moved = true;
    if (down.moved && question && !busy(question, now())) { dragging = true; dragX = dx * lay.Hw / lay.H; }
  });
  canvas.addEventListener('pointerup', e => {
    if (!down) return;
    const dx = e.clientX - down.x, moved = down.moved; down = null; pressBuy = false;
    const t = now(); lastGesture = t;
    if (moved) { dragging = false; dragX = 0; if (Math.abs(dx) > lay.W * 0.2) discard(t, Math.sign(dx)); return; }
    if (inside(quads.buy, e.clientX, e.clientY)) { buyNow(t); return; }
    if (inside(quads.deck, e.clientX, e.clientY)) discard(t, -1);
  });
  // boutons accessibles (clavier, lecteur d'écran) ; le toucher passe au canvas
  for (const b of [deckBtn, buyBtn]) b.style.pointerEvents = 'none';
  deckBtn.addEventListener('click', () => { lastGesture = now(); discard(now(), -1); });
  buyBtn.addEventListener('click', () => buyNow(now()));
  function leave() { visible = false; root.classList.remove('on'); setTimeout(() => { stop(); root.remove(); opts.onBack?.(); }, 900); }
  backEl.addEventListener('click', leave);
  addEventListener('keydown', e => { if (visible && e.key === 'Escape') leave(); });

  function start() { if (!raf && visible) { last = 0; raf = requestAnimationFrame(frame); } }
  function stop() { cancelAnimationFrame(raf); raf = 0; }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
  startT = now(); pendingDraw = startT + 1.1; firstAt = startT + 1.1 + DRAW_T;
  start();
  return {
    root, leave,
    manual: on => { if (on) { vclock = now(); stop(); } else { vclock = null; start(); } },
    advance: (sec, fps = 30) => { for (let i = 0; i < Math.round(sec * fps); i++) { vclock += 1 / fps; frame(0, 1 / fps); } },
    next: () => discard(now(), -1), buy: () => buyNow(now()), state: () => ({ shown, question: question?.q || null }),
  };
}
