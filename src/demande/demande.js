// La demande, telle que la personne l'a laissée (ouverte depuis l'email : demande.html#…). Tout est dans le lien
// (la partie après « # » n'est jamais envoyée au serveur) : prénom, question / réponse ou thème, mode, adresse.
// Le vrai moteur des cartes, figé en nature morte : la feuille A5 noire et son acrostiche, la carte posée dessus
// (côté réponse), l'enveloppe et son adresse tapée. La lampe respire, la souris / le téléphone inclinent la scène.
// Toucher la feuille, la carte ou l'enveloppe : on s'en approche ; toucher la carte de près : elle se retourne ;
// toucher ailleurs : l'ensemble.
import { createCardRenderer, M4, CARD } from '../cards/cardRenderer.js';
import { loadTypeFont, makeInkMap, makeAnswerInk, TYPE } from '../cards/ink.js';
import { createNameRelief } from '../cards/nameRelief.js';
import { LOOK } from '../cards/scene.js';
import { SHEET, ENV, LOGO_Y, LOGO_K, COL_X, C_POSE, addressInk } from '../sheet/sheet.js';
import { createRng } from '../field/rng.js';
import QUESTIONS from '../cards/questions.json';

const FOV = 26 * Math.PI / 180, TILT = 0.22, TF = Math.tan(FOV / 2);
const clamp01 = u => Math.min(1, Math.max(0, u));
const sstep = (a, b, x) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const ease = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
const T = (x, y, z) => M4.model(0, 0, 0, x, y, z);
const S = k => new Float32Array([k, 0, 0, 0, 0, k, 0, 0, 0, 0, k, 0, 0, 0, 0, 1]);

export { encodeDemande, decodeDemande } from './lien.js';

export async function mountDemande(canvas, d, { base = './', reduced = false } = {}) {
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, depth: true });
  if (!gl) return null;
  const card = await createCardRenderer(gl, base);
  const nameR = await createNameRelief(gl, card.paperTex);
  await loadTypeFont(base);
  const L = { ...LOOK };
  const rnd = createRng(7);
  card.addShape('sheet', { ...SHEET, fine: [10, 10, 0.25, 0, LOGO_Y] });
  card.addShape('env', { ...ENV, fine: null });
  const pv = (logo = false) => ({ seed: rnd() * 100, paperXf: [rnd.range(-2.5, 2.5), rnd.range(-1.5, 1.5), 0, 0], warp: [0.3, -0.2, 0.08] });
  const sheetV = { ...pv(), logoOff: [0, LOGO_Y], logoScale: [LOGO_K, LOGO_K], paperTile: 0.6 * CARD.w / 0.7, paperLo: 0.35 };
  const envV = { ...pv(), noLogo: true, paperTile: 0.6 * CARD.w / 0.7, paperLo: 0.35, warp: [0.15, -0.06, 0] };

  // ---- la carte : réponse au dos de la question ; carte blanche : le thème ----
  let C = null;
  if (d.kind === 'reponse') {
    const q = QUESTIONS.find(x => x.id === d.id)?.q || '';
    const v = { ...pv(), logoOff: [0, 0] };
    C = { v, front: card.makeInk(makeInkMap(q, 31).canvas), back: card.makeInk(makeAnswerInk(d.text, 41, 3, 0).canvas), phi: 0 };
  } else if (d.kind === 'theme') {
    const v = { ...pv(), noLogo: true };
    C = { v, front: card.makeInk(makeAnswerInk(d.text, 37, 3, 0).canvas), back: card.makeInk(makeInkMap('carte blanche', 3).canvas), phi: Math.PI };
  }
  if (C) { C.turns = 0; C.flipT0 = -1; }
  const hasEnv = d.mode !== 'direct' && d.address.length > 0;
  const envInk = hasEnv ? card.makeInk(addressInk(d.address.join('\n'), 991).canvas) : null;

  // ---- l'acrostiche (même mise en page que la scène de la feuille) ----
  const chars = [...d.name];
  nameR.letters(chars);
  const n = chars.length, lead = n > 1 ? Math.min(10.5, 148 / (n - 1)) : 10.5;
  const cap = Math.min(6.4, lead * 0.6), emT = cap / nameR.capHeight, yc = C ? -6 : 0;
  const baseOf = k => yc + ((n - 1) / 2 - k) * lead - cap / 2;

  // ---- disposition : une nature morte, posée de travers ----
  const lay = { portrait: true, sheet: null, env: null, frames: {} };
  function layout(W, H) {
    const portrait = W < H * 1.05;
    lay.portrait = portrait;
    lay.sheet = portrait ? { x: -6, y: 58, rz: 0.03 } : { x: -78, y: 6, rz: 0.03 };
    lay.env = portrait ? { x: 8, y: -168, rz: -0.04 } : { x: 98, y: -24, rz: -0.035 };
    const fr = (x0, x1, y0, y1) => { const Hw = Math.max((y1 - y0) * 1.1, (x1 - x0) * 1.1 * H / W); return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, D: Hw / (2 * TF) }; };
    const s = lay.sheet, e = lay.env;
    const sx0 = s.x - SHEET.w / 2, sx1 = s.x + SHEET.w / 2, sy0 = s.y - SHEET.h / 2 - (C ? 40 : 0), sy1 = s.y + SHEET.h / 2;
    const ex0 = e.x - ENV.w / 2, ex1 = e.x + ENV.w / 2, ey0 = e.y - ENV.h / 2, ey1 = e.y + ENV.h / 2;
    lay.frames.all = hasEnv ? fr(Math.min(sx0, ex0), Math.max(sx1, ex1), Math.min(sy0, ey0), Math.max(sy1, ey1)) : fr(sx0, sx1, sy0, sy1);
    lay.frames.sheet = fr(sx0, sx1, sy0, sy1);
    lay.frames.env = fr(ex0, ex1, ey0, ey1);
    const cw = C ? (() => { const p = cardWorld(); return fr(p[0] - CARD.w / 2, p[0] + CARD.w / 2, p[1] - CARD.h / 2, p[1] + CARD.h / 2); })() : null;
    lay.frames.card = cw;
  }
  const cardWorld = () => { const s = lay.sheet; const c = Math.cos(s.rz), sn = Math.sin(s.rz); return [s.x + c * C_POSE.x - sn * C_POSE.y, s.y + sn * C_POSE.x + c * C_POSE.y]; };

  // ---- lumière (celle des cartes, lampe éloignée : grandes surfaces) + inclinaison ----
  const ptr = { x: 0, y: 0 }, ts = { x: 0, y: 0 }, lamp = { a: L.lightAz, va: 0, e: L.elBase, ve: 0 };
  const CAM_AZ = -Math.PI / 2, wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
  function stepLight(dt, t, tx, ty) {
    const kk = Math.min(1, dt * 3); ts.x += (tx - ts.x) * kk; ts.y += (ty - ts.y) * kk;
    const backDir = CAM_AZ + Math.PI, lim = Math.PI - L.lampGap;
    let rel = wrapA(L.lightAz + (reduced ? 0 : L.breathAz * (0.72 * Math.sin(t * 0.33) + 0.28 * Math.sin(t * 0.69 + 1.3))) + 1.2 * L.tiltAmp * L.lightVar * ts.x - backDir);
    rel = lim * Math.tanh(rel / lim);
    const mid = (L.elMin + L.elMax) / 2, half = (L.elMax - L.elMin) / 2;
    let e = L.elBase + (reduced ? 0 : L.breathEl * (0.7 * Math.sin(t * 0.27 + 2.1) + 0.3 * Math.sin(t * 0.61 + 0.4))) + ts.y * L.elevAmp * L.lightVar;
    e = mid + half * Math.tanh((e - mid) / half);
    const w = 2.2, z = 0.85, da = wrapA(backDir + rel - lamp.a);
    lamp.va += (w * w * da - 2 * z * w * lamp.va) * dt; lamp.a += lamp.va * dt;
    lamp.ve += (w * w * (e - lamp.e) - 2 * z * w * lamp.ve) * dt; lamp.e += lamp.ve * dt;
  }
  addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { ptr.x = (e.clientX / innerWidth - 0.5) * 2; ptr.y = -(e.clientY / innerHeight - 0.5) * 2; } });
  const DO = window.DeviceOrientationEvent;
  const onOrient = e => { if (e.beta != null) { ptr.x = Math.max(-1, Math.min(1, e.gamma / 25)); ptr.y = Math.max(-1, Math.min(1, -(e.beta - 50) / 25)); } };
  if (DO && typeof DO.requestPermission !== 'function') addEventListener('deviceorientation', onOrient);
  let asked = false;
  addEventListener('touchend', () => { if (!asked && DO && typeof DO.requestPermission === 'function') { asked = true; DO.requestPermission().then(r => { if (r === 'granted') addEventListener('deviceorientation', onOrient); }).catch(() => { asked = false; }); } }, { passive: true });

  // ---- caméra : l'ensemble, ou de près (ressort) ----
  let focus = 'all';
  const cam = { cx: 0, cy: 0, D: 600, init: false };
  let vp = null, eye = null, W = 1, H = 1, t0 = performance.now(), last = 0;
  const quads = {};
  function screenQuad(M, w, h) {
    const mvp = M4.mul(vp, M);
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
      const x = sx * w / 2, y = sy * h / 2;
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

  function frame(nw) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, last ? (nw - last) / 1000 : 0.016); last = nw;
    const t = (performance.now() - t0) / 1000;
    const dpr = Math.min(2, devicePixelRatio || 1); W = canvas.clientWidth; H = canvas.clientHeight;
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
    layout(W, H);
    const f = lay.frames[focus] || lay.frames.all;
    if (!cam.init) { Object.assign(cam, f, { init: true }); }
    const k1 = reduced ? 1 : Math.min(1, dt * 2.6);
    cam.cx += (f.cx - cam.cx) * k1; cam.cy += (f.cy - cam.cy) * k1; cam.D = Math.exp(Math.log(cam.D) + (Math.log(f.D) - Math.log(cam.D)) * k1);
    const D = cam.D, Hw = 2 * D * TF;
    eye = [cam.cx, cam.cy - D * Math.sin(TILT), D * Math.cos(TILT)];
    vp = M4.mul(M4.perspective(FOV, W / H, D * 0.25, D * 3), M4.lookAt(eye, [cam.cx, cam.cy, 0], [0, 1, 0]));
    const br = reduced ? { x: 0, y: 0 } : { x: 0.42 * Math.sin(t * 0.52) + 0.16 * Math.sin(t * 0.97 + 1), y: 0.32 * Math.sin(t * 0.41 + 2) + 0.12 * Math.sin(t * 0.83) };
    stepLight(dt, t, Math.max(-1, Math.min(1, ptr.x + 0.4 * br.x)), Math.max(-1, Math.min(1, ptr.y + 0.4 * br.y)));
    const kf = 2.2, k = Hw / 235 * kf;
    const R = L.lightR0 * Hw * kf, Z = L.lightZ * k, D0 = Math.hypot(R, Z), el0 = Math.atan2(Z, R), el = lamp.e;
    const lightPos = [cam.cx + Math.cos(lamp.a) * D0 * Math.cos(el), cam.cy + Math.sin(lamp.a) * D0 * Math.cos(el), D0 * Math.sin(el)];
    const P = { ...L, lightPos, light: L.light * k * k * Math.sin(el0) / Math.sin(el), spotI: 0 };

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(6 / 255, 6 / 255, 6 / 255, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    const fade = reduced ? 1 : ease(clamp01(t / 1.6));
    // toute la table s'incline un peu (souris / téléphone)
    const G = M4.mul(T(0, 0, -30 * (1 - fade)), M4.model(-ts.y * L.cardTilt * 0.35, ts.x * L.cardTilt * 0.35, 0));
    const s = lay.sheet, e = lay.env;
    if (hasEnv) {
      const Me = M4.mul(G, M4.model(0, Math.PI, e.rz, e.x, e.y, -1.5));
      card.draw(vp, eye, P, { model: Me, lod: 'env', ink: envInk, fade, ...envV });
      quads.env = screenQuad(Me, ENV.w, ENV.h);
    }
    const Ms = M4.mul(G, M4.model(0, 0, s.rz, s.x, s.y, 0));
    card.draw(vp, eye, P, { model: Ms, lod: 'sheet', fade, ...sheetV });
    quads.sheet = screenQuad(Ms, SHEET.w, SHEET.h);
    if (C) {
      let phi = C.phi + Math.PI * C.turns, lift = 0;
      if (C.flipT0 >= 0) {
        const u = clamp01((t - C.flipT0) / 1.1);
        phi += Math.PI * sstep(0.1, 0.9, u); lift = (CARD.w / 2 + 6) * Math.sin(Math.PI * u);
        if (u >= 1) { C.turns++; C.flipT0 = -1; phi = C.phi + Math.PI * C.turns; lift = 0; }
      }
      const Mc = M4.mul(M4.mul(Ms, M4.model(0, 0, C_POSE.rz, C_POSE.x, C_POSE.y, 2.2 + lift)), M4.model(0, phi, 0));
      card.draw(vp, eye, P, { model: Mc, lod: 'fine', ink: C.front, inkBack: C.back, fade, ...C.v });
      quads.card = screenQuad(Mc, CARD.w, CARD.h);
    }
    const list = [];
    chars.forEach((ch, i) => { if (ch !== ' ') list.push({ i, model: M4.mul(Ms, M4.mul(T(COL_X, baseOf(i), SHEET.t / 2 + 1), S(emT))), glow: 0.12 + 0.1 * Math.sin(t * 0.7 + i * 0.9), alpha: fade }); });
    nameR.drawLetters(vp, eye, P, L, list, t);
  }
  canvas.addEventListener('click', ev => {
    const x = ev.clientX, y = ev.clientY;
    if (C && inside(quads.card, x, y)) {
      if (focus === 'card' && C.flipT0 < 0) C.flipT0 = (performance.now() - t0) / 1000;
      focus = 'card'; return;
    }
    if (inside(quads.env, x, y)) { focus = focus === 'env' ? 'all' : 'env'; return; }
    if (inside(quads.sheet, x, y)) { focus = focus === 'sheet' ? 'all' : 'sheet'; return; }
    focus = 'all';
  });
  addEventListener('keydown', e => { if (e.key === 'Escape') focus = 'all'; });
  requestAnimationFrame(frame);
  return { focus: f => { focus = f; } };
}
