// Page de développement de la scène 2 (non publiée) : /scene-cartes.html?prenom=LEA&seed=3
// Reproduit le haut de la scène (prénom) en HTML ; le vrai prénom viendra du rendu de la scène 1.
import { createCardScene } from './scene.js';

const P = new URLSearchParams(location.search);
// prénom : une lettre par élément, éclairée selon la direction de la lumière de la scène
const nameEl = document.getElementById('name');
const letters = [...(P.get('prenom') || 'LEA').toUpperCase()].map(ch => {
  const s = document.createElement('span'); s.textContent = ch; nameEl.appendChild(s); return s;
});
const log = document.getElementById('log');
const canvas = document.getElementById('c');
const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, depth: true, preserveDrawingBuffer: P.has('shot') });
import { LOOK } from './scene.js';
const look = {}; for (const k in LOOK) if (P.has(k)) look[k] = +P.get(k);
// (pas d'await au niveau du module : cible Safari 14)
createCardScene(gl, { base: './', seed: P.has('seed') ? +P.get('seed') : undefined, look }).then(start);
function start(scene) {
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
  // chaque lettre : un peu plus claire du côté d'où vient la lumière (retrait 0,30–0,52)
  const [lx, ly] = scene.lightDir(), nr = nameEl.getBoundingClientRect();
  for (const s of letters) {
    const r = s.getBoundingClientRect();
    const ox = (r.left + r.width / 2 - (nr.left + nr.width / 2)) / Math.max(1, nr.width / 2);
    const k = 0.5 + 0.5 * (lx * ox * 0.8 + ly * 0.35);
    s.style.color = `rgba(236,236,236,${(0.3 + 0.22 * k).toFixed(3)})`;
  }
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

  // réglages à la main (&reglages) : curseurs, valeurs affichées à recopier
  if (P.has('reglages')) {
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;background:rgba(0,0,0,.8);color:#999;font:12px system-ui;padding:8px;border-radius:8px;z-index:5';
    const rows = [['inkAlb', 0, 3, 0.05, 'blancheur du texte'], ['inkThr', 0.2, 0.6, 0.01, 'finesse du trait'], ['inkVar', 0, 2, 0.05, 'variations'],
      ['toe', 0, 0.012, 0.0002, 'noir du papier'], ['glint', 0, 3, 0.05, 'scintillement'], ['grain', 0, 4, 0.1, 'grain']];
    const out = document.createElement('div'); out.style.cssText = 'margin-top:6px;color:#ccc;user-select:all;word-break:break-all';
    const show = () => { out.textContent = rows.map(([k]) => k + '=' + scene.look[k]).join('&'); };
    for (const [k, a, b, st, label] of rows) {
      const l = document.createElement('label'); l.style.cssText = 'display:grid;grid-template-columns:120px 1fr 50px;gap:6px;align-items:center';
      l.innerHTML = `<span>${label}</span><input type=range min=${a} max=${b} step=${st} value=${scene.look[k]}><span>${scene.look[k]}</span>`;
      const inp = l.children[1], v = l.children[2];
      inp.oninput = () => { scene.look[k] = +inp.value; v.textContent = inp.value; show(); };
      inp.addEventListener('pointerdown', e => e.stopPropagation());
      box.appendChild(l);
    }
    box.addEventListener('pointerdown', e => e.stopPropagation());
    box.appendChild(out); show(); document.body.appendChild(box);
  }
}
