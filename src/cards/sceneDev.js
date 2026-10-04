// Page de développement de la scène 2 (non publiée) : /scene-cartes.html?prenom=LEA&seed=3
// Reproduit le haut de la scène (prénom) en HTML ; le vrai prénom viendra du rendu de la scène 1.
import { createCardScene } from './scene.js';

const P = new URLSearchParams(location.search);
document.getElementById('name').textContent = (P.get('prenom') || 'LEA').toUpperCase();
const log = document.getElementById('log');
const canvas = document.getElementById('c');
const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, depth: true, preserveDrawingBuffer: P.has('shot') });
const scene = await createCardScene(gl, { base: './', seed: P.has('seed') ? +P.get('seed') : undefined });
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
