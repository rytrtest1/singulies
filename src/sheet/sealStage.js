// Banc du cachet (09/10) : /cachet.html — l'enveloppe (côté cachet, rabat fermé) et le cachet seuls, même moteur et
// même lampe que le parcours (sheet.js), sans les cartes ni l'animation. Panneau de curseurs dessous ; glisser sur
// l'image = tourner l'enveloppe ; la ligne des valeurs changées se recopie (et se passe dans l'adresse : ?s.albedo=…).
import { createCardRenderer, M4, CARD } from '../cards/cardRenderer.js';
import { LOOK } from '../cards/scene.js';
import { ENV, ENV_BACK_H, FLAP_H, SEAL_D, SEAL_K, SEAL_IN, SEAL_WOB, SEAL_LOOK0, SEAL_SHAPE0 } from './envelope.js';

const FOV = 26 * Math.PI / 180, TILT = 0.22, TF = Math.tan(FOV / 2), CAM_AZ = -Math.PI / 2;
const P = new URLSearchParams(location.search);
const canvas = document.getElementById('c');
const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, depth: true });
const T = (x, y, z) => M4.model(0, 0, 0, x, y, z);
const sstep = (a, b, x) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };

const look = { ...SEAL_LOOK0 };
const shape = { ...SEAL_SHAPE0, zoom: 0.35, rotX: 0, rotY: 0, breath: 1 };
for (const [k, v] of P) if (k.startsWith('s.')) { const n = k.slice(2); if (n in look) look[n] = +v; else if (n in shape) shape[n] = +v; }

async function main() {
const card = await createCardRenderer(gl, './');
card.addShape('env', { ...ENV, fine: null });
card.addShape('envBack', { ...ENV, h: ENV_BACK_H, fine: null });
card.addShape('flap', { ...ENV, h: FLAP_H, fine: null });
card.addShape('botFlap', { ...ENV, fine: null });
card.addShape('seal', { w: SEAL_D, h: SEAL_D, r: SEAL_D / 2, t: 0.2, fine: [SEAL_D / 2 + 1, SEAL_D / 2 + 1, 0.2, 0, 0], seg: 48, wobble: SEAL_WOB });
let sd = 7;
const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
const pv = () => ({ seed: rnd() * 100, paperXf: [rnd() * 5 - 2.5, rnd() * 3 - 1.5, rnd() < 0.5 ? 0 : Math.PI, 0], warp: [0.05 + rnd() * 0.1, -rnd() * 0.08, 0], paperTile: 0.6 * CARD.w / 0.7, paperLo: 0.35, noLogo: true });
const front = pv(), back = pv(), flapV = { ...pv(), warp: [0, 0, 0] }, botV = { ...pv(), warp: [0, 0, 0] };
const sealV = { seed: rnd() * 100, paperXf: [0, 0, 0, 0], logoOff: [0, 0], logoScale: [SEAL_K, -SEAL_K], warp: [0, 0, 0], seal: [1, SEAL_IN, SEAL_D / 2, SEAL_WOB] };

const SY = ENV.h / 2 - FLAP_H + 7;                         // le cachet, dans le repère de l'enveloppe
const t0 = performance.now();
function frame() {
  const t = (performance.now() - t0) / 1000;
  const dpr = Math.min(2, devicePixelRatio || 1), W = canvas.clientWidth, H = canvas.clientHeight;
  if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(6 / 255, 6 / 255, 6 / 255, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  // la vue : l'enveloppe entière (zoom 1) ↔ le cachet de près ; centrée sur le cachet quand on s'approche
  const fit = Math.max(ENV.w * 1.12 / (W / H), ENV.h * 1.15);
  const D = fit / (2 * TF) * shape.zoom, cx = 0, cy = SY * (1 - sstep(0.4, 1, shape.zoom));
  const eye = [cx, cy - D * Math.sin(TILT), D * Math.cos(TILT)];
  const vp = M4.mul(M4.perspective(FOV, W / H, D * 0.1, D * 4), M4.lookAt(eye, [cx, cy, 0], [0, 1, 0]));
  // la lampe du parcours sur l'enveloppe : direction envAz (+ un peu de respiration), hauteur qui respire, distance lamp
  const L = LOOK, br = shape.breath;
  const bAz = br * L.breathAz * (0.72 * Math.sin(t * 0.33) + 0.28 * Math.sin(t * 0.69 + 1.3));
  const bEl = br * L.breathEl * (0.7 * Math.sin(t * 0.27 + 2.1) + 0.3 * Math.sin(t * 0.61 + 0.4));
  const a = CAM_AZ + Math.PI + shape.envAz + 0.35 * bAz, el = L.elBase + bEl;
  const k = shape.lamp, R = L.lightR0 * 235 * k, Z = L.lightZ * k, D0 = Math.hypot(R, Z), el0 = Math.atan2(Z, R);
  const ap = [0, 20];
  const lightPos = [ap[0] + Math.cos(a) * D0 * Math.cos(el), ap[1] + Math.sin(a) * D0 * Math.cos(el), D0 * Math.sin(el)];
  const Pl = { ...L, lightPos, light: L.light * k * k * Math.sin(el0) / Math.sin(el), spotI: 0, spotPos: [0, 0, 1000], spotDir: [0, 0, -1] };
  // l'enveloppe, côté cachet, tournée à la main autour du cachet
  const Menv = M4.mul(T(0, SY, 0), M4.mul(M4.model(shape.rotX, shape.rotY, 0), T(0, -SY, 0)));
  const ao = y => shape.ao > 0 ? [0, y, SEAL_D / 2, shape.ao] : null, sealQ = [shape.pits, shape.cavWall, shape.cavEdge, shape.aoW];
  card.draw(vp, eye, Pl, { model: Menv, lod: 'env', fade: 1, shade: 1, ...front });
  card.draw(vp, eye, Pl, { model: M4.mul(Menv, T(0, -(ENV.h - ENV_BACK_H) / 2, 1.6)), lod: 'envBack', fade: 1, shade: 1, ...back, ao: ao(SY + (ENV.h - ENV_BACK_H) / 2), sealQ });
  card.draw(vp, eye, Pl, { model: M4.mul(Menv, T(0, 0, 1.74)), lod: 'botFlap', fade: 1, shade: 1, ...botV, clip: [1, -ENV.h / 2, ENV.h * 0.58, ENV.w / 2], ao: ao(SY), sealQ });
  const Mf = M4.mul(Menv, M4.mul(M4.mul(T(0, ENV.h / 2, 1.9), M4.model(Math.PI, 0, 0)), T(0, FLAP_H / 2, 0)));
  card.draw(vp, eye, Pl, { model: Mf, lod: 'flap', fade: 1, shade: 1, ...flapV, clip: [1, -FLAP_H / 2, FLAP_H, ENV.w / 2], ao: ao(FLAP_H / 2 - 7), sealQ });
  const Ms = M4.mul(Mf, T(0, FLAP_H / 2 - 7, -0.19));
  card.draw(vp, eye, { ...Pl, ...look }, { model: Ms, lod: 'seal', fade: 1, shade: 1, ...sealV, paperLo: shape.marbre,
    sealP: [shape.hd, shape.hc, shape.crest, shape.ring], sealQ, sealR: [shape.film, shape.sss], blend: true });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
}
main();

// ---- le panneau ----
const R = [
  ['shape', 'zoom', 0.15, 1, 0.01, 'vue : cachet de près ↔ enveloppe entière'],
  ['shape', 'rotY', -1.4, 1.4, 0.01, "tourner (ou glisser sur l'image)"],
  ['shape', 'rotX', -1.4, 1.4, 0.01, 'basculer'],
  ['shape', 'breath', 0, 1, 1, 'lampe qui respire (1) / figée (0)'],
  ['shape', 'envAz', -1.9, 1.9, 0.01, 'lampe : direction (0 = derrière, − = gauche)'],
  ['shape', 'lamp', 0.6, 2.5, 0.05, 'lampe : distance (enveloppe entière)'],
  ['shape', 'film', 0, 2, 0.05, 'cire : bord translucide (épaisseur en mm sous laquelle on voit le papier)'],
  ['shape', 'sss', 0, 1, 0.01, 'cire : diffusion de la lumière dans la cire (ombres douces)'],
  ['look', 'metal', 0, 1, 0.01, 'cire : métal (0 = papier, 1 = argent)'],
  ['look', 'albedo', 0, 0.3, 0.005, 'cire : clarté (diffus)'],
  ['look', 'env', 0, 0.3, 0.002, 'cire : lumière de la pièce (reflets)'],
  ['look', 'spec', 0, 10, 0.1, 'cire : reflet de la lampe'],
  ['look', 'rough', 0.08, 1, 0.01, 'cire : rugosité (net ↔ diffus)'],
  ['look', 'envSpec', 0, 6, 0.05, 'cire : force des reflets de la pièce'],
  ['look', 'grain', 0, 4, 0.05, 'cire : grain'],
  ['look', 'fiber', 0, 0.15, 0.002, 'cire : relief du grain'],
  ['shape', 'marbre', 0, 2, 0.05, 'cire : marbrure'],
  ['look', 'glint', 0, 4, 0.05, 'cire : paillettes'],
  ['shape', 'hc', 0.2, 3, 0.05, 'forme : hauteur du bourrelet (mm)'],
  ['shape', 'hd', 0, 2, 0.05, "forme : hauteur de l'empreinte (mm)"],
  ['shape', 'crest', 0.1, 0.9, 0.01, 'forme : crête (centre ↔ bord)'],
  ['shape', 'ring', 0, 0.4, 0.01, "forme : anneau de l'empreinte"],
  ['shape', 'pits', 0, 6, 0.1, 'forme : piqûres'],
  ['look', 'h', 0, 0.6, 0.01, 'logo : relief'],
  ['look', 'b', 0.05, 1.5, 0.01, 'logo : arrondi'],
  ['look', 'crease', 0, 1, 0.01, 'logo : trait sombre au pied'],
  ['shape', 'cavWall', 0, 1, 0.01, 'ombre : pied du bourrelet'],
  ['shape', 'cavEdge', 0, 1, 0.01, 'ombre : bord de la cire'],
  ['shape', 'ao', 0, 1, 0.01, 'ombre portée : force'],
  ['shape', 'aoW', 0.1, 5, 0.05, 'ombre portée : largeur (mm)'],
];
const G = { look, shape }, init = {}, inputs = {};
const SKIP = ['zoom', 'rotX', 'rotY', 'breath'];
for (const [g, k] of R) init[g + k] = (g === 'look' ? SEAL_LOOK0 : SEAL_SHAPE0)[k] ?? G[g][k];
const panel = document.getElementById('panel'), out = document.getElementById('out');
const show = () => { out.textContent = R.filter(([g, k]) => !SKIP.includes(k) && G[g][k] !== init[g + k]).map(([g, k]) => 's.' + k + '=' + G[g][k]).join('&') || '(rien de changé)'; };
for (const [g, k, a, b, st, label] of R) {
  const l = document.createElement('label');
  l.innerHTML = `<span>${label}</span><input type=range min=${a} max=${b} step=${st} value=${G[g][k]}><span>${G[g][k]}</span>`;
  const inp = l.children[1], v = l.children[2];
  inp.oninput = () => { G[g][k] = +inp.value; v.textContent = inp.value; show(); };
  inputs[k] = [inp, v];
  panel.appendChild(l);
}
document.getElementById('reset').onclick = () => { shape.rotX = shape.rotY = 0; sync(); };
document.getElementById('copy').onclick = async () => { try { await navigator.clipboard.writeText(out.textContent); document.getElementById('copy').textContent = 'copié'; setTimeout(() => { document.getElementById('copy').textContent = 'copier'; }, 1200); } catch (e) { /* sélectionner à la main */ } };
const sync = () => { for (const k of ['rotX', 'rotY']) { const [inp, v] = inputs[k]; inp.value = shape[k]; v.textContent = (+shape[k]).toFixed(2); } };
// glisser sur l'image : tourner l'enveloppe autour du cachet
let drag = null;
const clampR = x => Math.max(-1.4, Math.min(1.4, x));
canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, rx: shape.rotX, ry: shape.rotY }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => { if (!drag) return; shape.rotY = +clampR(drag.ry + (e.clientX - drag.x) * 0.008).toFixed(3); shape.rotX = +clampR(drag.rx + (e.clientY - drag.y) * 0.008).toFixed(3); sync(); });
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('pointercancel', () => { drag = null; });
show();
