// Page de développement de la scène 2 (non publiée) : /scene-cartes.html?prenom=LEA&seed=3
// Reproduit le haut de la scène (prénom) en HTML ; le vrai prénom viendra du rendu de la scène 1.
import { createCardScene } from './scene.js';

const P = new URLSearchParams(location.search);
document.getElementById('name').textContent = (P.get('prenom') || 'LEA').toUpperCase();
const log = document.getElementById('log');
const canvas = document.getElementById('c');
const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, depth: true, preserveDrawingBuffer: P.has('shot') });
import { LOOK } from './scene.js';
const look = {}; for (const k in LOOK) if (P.has(k)) look[k] = +P.get(k);
const scene = await createCardScene(gl, { base: './', seed: P.has('seed') ? +P.get('seed') : undefined, look });
window.__scene = { scene, ready: true, frames: 0 };

let t0 = performance.now(), last = t0;
function frame(now) {
  const t = (now - t0) / 1000, dt = Math.min(0.05, (now - last) / 1000); last = now;
  const dpr = Math.min(2, devicePixelRatio || 1), W = canvas.clientWidth, H = canvas.clientHeight;
  if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(6 / 255, 6 / 255, 6 / 255, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  scene.frame(t, dt, W, H);
  window.__scene.frames++; window.__scene.t = t;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

addEventListener('pointermove', e => scene.pointer(e.clientX, e.clientY));
addEventListener('pointerdown', e => {
  scene.pointer(e.clientX, e.clientY);
  const r = scene.tap(e.clientX, e.clientY, (performance.now() - t0) / 1000);
  if (r.type) log.textContent = r.type + (r.id ? ' ' + r.id : '');
});
// tests : window.__scene.tapAt(fx, fy) en fractions de l'écran
window.__scene.tapAt = (fx, fy) => scene.tap(fx * canvas.clientWidth, fy * canvas.clientHeight, (performance.now() - t0) / 1000);

// mesure (tests) : luminance du papier (médiane) et de l'encre (99e centile) dans la carte retournée
window.__scene.measure = () => {
  const c = document.createElement('canvas'); c.width = canvas.width; c.height = canvas.height;
  const x = c.getContext('2d'); x.drawImage(canvas, 0, 0);
  const lay = scene.layout, k = canvas.width / canvas.clientWidth;
  const cx = canvas.width / 2, cy = 0.42 * canvas.height, w = 0.6 * Math.min(canvas.width, canvas.height * 1.69 * 0.27), h = w / 1.69 * 0.8;
  const d = x.getImageData(Math.round(cx - w / 2), Math.round(cy - h / 2), Math.round(w), Math.round(h)).data;
  const v = []; for (let i = 0; i < d.length; i += 4) v.push(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
  v.sort((a, b) => a - b);
  const bg = x.getImageData(2, Math.round(canvas.height * 0.95), 1, 1).data[0];
  return { papier: Math.round(v[Math.floor(v.length * 0.5)]), papierSombre: Math.round(v[Math.floor(v.length * 0.1)]), encre: Math.round(v[Math.floor(v.length * 0.995)]), fond: bg };
};
