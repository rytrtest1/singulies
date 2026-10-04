// Page de développement de la scène 2 (non publiée) : /scene-cartes.html?prenom=LEA&seed=3
// Reproduit le haut de la scène (prénom) en HTML ; le vrai prénom viendra du rendu de la scène 1.
import { createCardScene } from './scene.js';

const P = new URLSearchParams(location.search);
const PRENOM = (P.get('prenom') || 'LEA').toUpperCase();   // dessiné en relief par la scène
const log = document.getElementById('log');
const canvas = document.getElementById('c');
const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, depth: true, preserveDrawingBuffer: P.has('shot') });
import { LOOK } from './scene.js';
const look = {}; for (const k in LOOK) if (P.has(k)) look[k] = +P.get(k);
// (pas d'await au niveau du module : cible Safari 14)
createCardScene(gl, { base: './', seed: P.has('seed') ? +P.get('seed') : undefined, look }).then(start);
function start(scene) {
scene.setName(PRENOM);
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

// lumière : la souris la fait varier un peu (micro-variation) ; sur téléphone, l'inclinaison de l'appareil
// (par rapport à la position de départ), comme un reflet sur du verre. Le doigt ne sert qu'à toucher.
// repli sans gyroscope (refusé, absent) : le doigt qui glisse fait comme la souris
let gyroLive = false;
addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse' && gyroLive) return;
  scene.setTilt((e.clientX / innerWidth - 0.5) * 0.7, (0.5 - e.clientY / innerHeight) * 0.7);
});
let g0 = null;
function onOrient(e) {
  if (e.beta == null || e.gamma == null) return;
  if (!g0) g0 = { b: e.beta, g: e.gamma };
  gyroLive = true;
  scene.setTilt((e.gamma - g0.g) / 25, -(e.beta - g0.b) / 25);
}
let orientAsked = false;
function askOrientation() {
  if (orientAsked) return; orientAsked = true;
  const DO = window.DeviceOrientationEvent;
  if (DO && typeof DO.requestPermission === 'function') {      // iPhone : demande système, au premier toucher
    DO.requestPermission().then(s => { if (s === 'granted') addEventListener('deviceorientation', onOrient); }).catch(() => {});
  } else addEventListener('deviceorientation', onOrient);
}
if (!(window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function')) askOrientation();
// iPhone : la demande d'accès au mouvement n'est acceptée qu'après un vrai geste (doigt relevé)
addEventListener('touchend', askOrientation, { passive: true });
addEventListener('click', askOrientation);
addEventListener('pointerdown', e => {
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

  // réglages à la main (&reglages) : tous les paramètres de la carte, panneau repliable ; la ligne de
  // valeurs (seulement celles changées) se recopie, et se passe aussi dans l'adresse
  if (P.has('reglages')) {
    const R = {
      light: [0, 0.3, 0.001, 'lampe : force'], lightAz: [0, 6.28, 0.01, 'lampe : direction'], lightZ: [20, 600, 5, 'lampe : hauteur'],
      lightR0: [0.2, 3, 0.05, 'lampe : distance'], lightR: [5, 400, 5, 'lampe : taille (ombres douces)'], tiltAmp: [0, 2, 0.05, 'variation (inclinaison)'],
      env: [0, 1, 0.01, 'lumière de face'], envSpec: [0, 0.5, 0.005, 'reflet de la pièce'], exposure: [0.2, 3, 0.01, 'exposition'], toe: [0, 0.015, 0.0002, 'noir du papier'],
      albedo: [0.005, 0.1, 0.001, 'papier : clarté'], grain: [0, 4, 0.05, 'papier : grain'], fiber: [0, 0.06, 0.001, 'papier : relief des fibres'],
      glint: [0, 4, 0.05, 'papier : scintillement'], rough: [0.1, 1, 0.01, 'papier : rugosité'], spec: [0, 4, 0.05, 'papier : reflet'],
      sheen: [0, 2, 0.01, 'papier : lustre rasant'], diffRough: [0, 1, 0.01, 'papier : mat'], edge: [0, 3, 0.05, 'bords cassés'],
      h: [0, 1, 0.01, 'gaufrage : hauteur'], b: [0.1, 2, 0.01, 'gaufrage : arrondi'], foot: [0, 1, 0.01, 'gaufrage : pli net'],
      footW: [0.02, 0.4, 0.005, 'gaufrage : largeur du pli'], crease: [0, 1, 0.01, 'gaufrage : trait sombre'],
      inkAlb: [0, 4, 0.05, 'encre : blancheur'], inkThr: [0.15, 0.7, 0.01, 'encre : finesse du trait'], inkVar: [0, 3, 0.05, 'encre : variations'],
      inkPaper: [0, 30, 0.5, 'encre : papier visible'], inkOrg: [0, 3, 0.05, 'encre : contours irréguliers'], inkWear: [0, 3, 0.05, 'encre : usure'],
      inkPress: [0, 0.1, 0.002, 'encre : creusement'],
      nameAlb: [0, 2, 0.01, 'prénom : clarté'], nameRelief: [0, 0.3, 0.005, 'prénom : relief'], nameBevel: [0.01, 0.2, 0.005, 'prénom : arrondi'], nameSpec: [0, 3, 0.05, 'prénom : brillance'],
    };
    const init = { ...scene.look };
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;left:6px;right:6px;bottom:6px;z-index:5;font:12px system-ui;color:#999';
    const btn = document.createElement('button');
    btn.textContent = 'réglages'; btn.style.cssText = 'background:#222;color:#bbb;border:0;border-radius:6px;padding:6px 10px;font:12px system-ui';
    const box = document.createElement('div');
    box.style.cssText = 'display:none;margin-top:6px;max-height:48vh;overflow:auto;background:rgba(0,0,0,.85);padding:8px;border-radius:8px';
    const out = document.createElement('div'); out.style.cssText = 'margin:4px 0 8px;color:#ddd;user-select:all;word-break:break-all';
    const show = () => { out.textContent = Object.keys(R).filter(k => scene.look[k] !== init[k]).map(k => k + '=' + scene.look[k]).join('&') || '(rien de changé)'; };
    box.appendChild(out);
    for (const k in R) {
      const [a, b, st, label] = R[k];
      const l = document.createElement('label'); l.style.cssText = 'display:grid;grid-template-columns:44% 1fr 52px;gap:6px;align-items:center;margin:3px 0';
      l.innerHTML = `<span>${label}</span><input type=range min=${a} max=${b} step=${st} value=${scene.look[k]}><span>${scene.look[k]}</span>`;
      const inp = l.children[1], v = l.children[2];
      inp.oninput = () => { scene.look[k] = +inp.value; v.textContent = inp.value; show(); };
      box.appendChild(l);
    }
    btn.onclick = () => { box.style.display = box.style.display === 'none' ? 'block' : 'none'; };
    wrap.append(btn, box);
    wrap.addEventListener('pointerdown', e => e.stopPropagation());
    show(); document.body.appendChild(wrap);
  }
}
