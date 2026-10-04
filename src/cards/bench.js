// Banc d'essai d'une carte (page de développement, non publiée) : rendu à côté de la photo redressée.
//   /banc-carte.html            dos, cadrage « photo » (vue de dessus, quasi orthographique)
//   #ref=IMG_0066               autre photo de référence ; #noref : rendu seul ; #noui : sans réglages
// Molette = zoom vers le curseur ; glisser = se déplacer (zoomé) ou incliner (Maj + glisser, ou sans zoom) ;
// double-clic = vue d'ensemble ; F = retourner ; R = référence ; les réglages sont gardés dans l'adresse.
import { createCardRenderer, M4, CARD } from './cardRenderer.js';
import { loadTypeFont, makeInkMap } from './ink.js';
import QUESTIONS from './questions.json';

// défauts = calage sur la photo IMG_0063 (04/10) : papier 22,9 ± 1,9 (photo 24,9 ± 3,2, gradient de lampe compris)
const DEF = {
  lightAz: -25, lightEl: 35, lightDist: 220, light: 0.025, lightR: 60, env: 0.03, albedo: 0.05, exposure: 1.0,
  h: 0.5, b: 1.0, crease: 0.3, fiber: 0.03, foot: 0.4, footW: 0.12,
  rough: 0.45, spec: 3, sheen: 0.3, glint: 2, edge: 1.0, grain: 3, diffRough: 0.25, parallax: 0, inkAlb: 2.0, inkPress: 0.04, inkWear: 1.4, inkThr: 0.38, inkVar: 1.5, inkPaper: 15, inkOrg: 0.95, q: 33, seed: 1, wx: 0.25, wy: -0.12, wt: 0.1,
  lx: -0.9, ly: 0.3, lsx: 1, lsy: 1.09, rx: 0, ry: 0, fov: 8, zoom: 1, panX: 0, panY: 0,
};
const RANGES = {
  lightAz: [-180, 180, 1], lightEl: [3, 90, 1], lightDist: [80, 1500, 10], light: [0, 0.3, 0.001], lightR: [1, 200, 1],
  env: [0, 1, 0.01], albedo: [0.005, 0.3, 0.001], exposure: [0.2, 4, 0.01], h: [0, 0.8, 0.005], b: [0.05, 2, 0.01],
  crease: [0, 1, 0.01], fiber: [0, 0.06, 0.001], foot: [0, 1, 0.01], footW: [0.02, 0.4, 0.005],
  rough: [0.1, 1, 0.01], spec: [0, 3, 0.01], sheen: [0, 3, 0.01], glint: [0, 5, 0.05], edge: [0, 3, 0.05], grain: [0, 4, 0.05], diffRough: [0, 1, 0.01], parallax: [0, 3, 0.05], inkAlb: [0, 3, 0.01], inkPress: [0, 0.08, 0.001], inkWear: [0, 2, 0.05], inkThr: [0.1, 0.8, 0.01], inkVar: [0, 3, 0.05], inkPaper: [0, 30, 0.1], inkOrg: [0, 3, 0.05], q: [1, 73, 1], seed: [1, 200, 1],
  wx: [-1, 1, 0.01], wy: [-1, 1, 0.01], wt: [-1, 1, 0.01], lx: [-3, 3, 0.05], ly: [-3, 3, 0.05],
  lsx: [0.8, 1.2, 0.005], lsy: [0.8, 1.2, 0.005], fov: [4, 60, 1],
};

const hash = new URLSearchParams(location.hash.slice(1));
const S = { ...DEF };
for (const k in DEF) if (hash.has(k)) S[k] = +hash.get(k);
const refName = hash.get('ref') || 'IMG_0063';
if (hash.has('noref')) document.body.classList.add('noref');
if (hash.has('noui')) document.body.classList.add('noui');
document.getElementById('ref').src = `./ressources/cartes/redresse/${refName}.png`;

const canvas = document.getElementById('c');
const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, preserveDrawingBuffer: true });
const card = await createCardRenderer(gl, './');
await loadTypeFont('./');
let inkTex = null, inkKey = '';
function ensureInk() {
  const key = S.q + ':' + S.seed;
  if (key === inkKey) return;
  if (inkTex) card.freeInk(inkTex);
  const qq = QUESTIONS.find(x => x.id === S.q) || QUESTIONS[0];
  const m = makeInkMap(qq.q, S.seed);
  inkTex = card.makeInk(m.canvas); inkKey = key;
  window.__bench.lines = m.lines;
}
window.__bench = { S, ready: true };

function saveHash() {
  const h = new URLSearchParams();
  for (const k in S) if (S[k] !== DEF[k]) h.set(k, String(+S[k].toFixed(4)));
  if (refName !== 'IMG_0063') h.set('ref', refName);
  if (document.body.classList.contains('noref')) h.set('noref', '');
  if (document.body.classList.contains('noui')) h.set('noui', '');
  history.replaceState(null, '', '#' + h.toString());
}

// réglages
const ui = document.getElementById('ui');
for (const k in RANGES) {
  const [a, b, st] = RANGES[k];
  const l = document.createElement('label');
  l.innerHTML = `<span>${k}</span><input type=range min=${a} max=${b} step=${st} value=${S[k]}><span>${S[k]}</span>`;
  const inp = l.children[1], out = l.children[2];
  inp.oninput = () => { S[k] = +inp.value; out.textContent = inp.value; saveHash(); };
  ui.appendChild(l);
}
const row = document.createElement('div'); row.className = 'row';
row.innerHTML = '<button id=flip>retourner (F)</button><button id=tref>référence (R)</button><button id=reset>défaut</button>';
ui.appendChild(row);
const flip = () => { S.ry = Math.abs(S.ry % (2 * Math.PI)) < 1e-3 ? Math.PI : 0; saveHash(); };
const tref = () => { document.body.classList.toggle('noref'); saveHash(); };
document.getElementById('flip').onclick = flip;
document.getElementById('tref').onclick = tref;
document.getElementById('reset').onclick = () => { history.replaceState(null, '', '#'); location.reload(); };
addEventListener('keydown', e => { if (e.key === 'f') flip(); if (e.key === 'r') tref(); });

// zoom et déplacement : mm par pixel CSS au plan de la carte
const mmPerPx = () => {
  const aspect = canvas.clientWidth / canvas.clientHeight;
  return 2 * Math.max(CARD.h / 2, CARD.w / 2 / aspect) / S.zoom / canvas.clientHeight;
};
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left - r.width / 2, my = e.clientY - r.top - r.height / 2;
  const before = mmPerPx();
  S.zoom = Math.min(20, Math.max(1, S.zoom * Math.exp(-e.deltaY * 0.0015)));
  const after = mmPerPx();
  S.panX += mx * (before - after); S.panY -= my * (before - after);
  if (S.zoom === 1) { S.panX = 0; S.panY = 0; }
  saveHash();
}, { passive: false });
canvas.addEventListener('dblclick', () => { S.zoom = 1; S.panX = 0; S.panY = 0; saveHash(); });
let drag = null;
canvas.addEventListener('pointerdown', e => {
  drag = { x: e.clientX, y: e.clientY, rx: S.rx, ry: S.ry, px: S.panX, py: S.panY, tilt: e.shiftKey || S.zoom <= 1.01 };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (drag.tilt) { S.ry = drag.ry + dx * 0.008; S.rx = drag.rx + dy * 0.008; }
  else { const k = mmPerPx(); S.panX = drag.px - dx * k; S.panY = drag.py + dy * k; }
});
canvas.addEventListener('pointerup', () => { drag = null; saveHash(); });

// rendu à la demande (le rendu logiciel des captures est lent) : seulement si quelque chose a changé
let dirty = true, lastKey = '';
function frame() {
  const key = JSON.stringify(S) + canvas.clientWidth + 'x' + canvas.clientHeight;
  if (key === lastKey && !dirty) { requestAnimationFrame(frame); return; }
  lastKey = key; dirty = false;
  const dpr = Math.min(2, devicePixelRatio || 1);
  const W = Math.round(canvas.clientWidth * dpr), H = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
  gl.viewport(0, 0, W, H);
  gl.clearColor(6 / 255, 6 / 255, 6 / 255, 1);
  gl.enable(gl.DEPTH_TEST);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  // cadrage : la carte remplit le volet comme la photo redressée (object-fit: contain)
  const fov = S.fov * Math.PI / 180, aspect = W / H;
  const halfH = Math.max(CARD.h / 2, CARD.w / 2 / aspect);
  const dist = halfH / Math.tan(fov / 2);
  const dz = dist / S.zoom;
  const eye = [S.panX, S.panY, dz];
  const vp = M4.mul(M4.perspective(fov, aspect, dz * 0.3, dz * 3), M4.lookAt(eye, [S.panX, S.panY, 0], [0, 1, 0]));
  const az = S.lightAz * Math.PI / 180, el = S.lightEl * Math.PI / 180;
  const lightPos = [S.lightDist * Math.cos(el) * Math.cos(az), S.lightDist * Math.cos(el) * Math.sin(az), S.lightDist * Math.sin(el)];
  ensureInk();
  card.draw(vp, eye, { ...S, lightPos }, { model: M4.model(S.rx, S.ry, 0), logoOff: [S.lx, S.ly], logoScale: [S.lsx, S.lsy], warp: [S.wx, S.wy, S.wt], seed: 3.7, paperXf: [0, 0, 0, 0], ink: inkTex });
  window.__bench.frames = (window.__bench.frames || 0) + 1;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
