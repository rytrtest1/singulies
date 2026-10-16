// La signature d'ouverture (17/10, Maxence : « teste ») : avant ETERNEL, dans le noir, une carte du jeu — le vrai
// moteur des cartes, son papier, son logo gaufré au dos — et la lampe des cartes qui la balaie une seule fois, très
// rasante, de gauche à droite : le relief du logo s'allume au passage de la lumière, puis retombe dans le noir ; la
// carte s'y perd et la page commence. Une fois par visite ; jamais en mouvement réduit. ?signature=1 (toujours),
// ?signature=0 (jamais).
import { createCardRenderer, M4 } from '../cards/cardRenderer.js';
import { LOOK } from '../cards/scene.js';

const K_SIG = 'sg.sig';
const FOV = 26 * Math.PI / 180, TILT = 0.16;
const clamp01 = u => Math.min(1, Math.max(0, u));
const sstep = (a, b, x) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const ease = u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
export const SIG_T = 3.6;          // s : la durée de la signature (la page commence à SIG_GO)
export const SIG_GO = 2.9;

export function wantSignature(q) {
  if (q.get('signature') === '0' || matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (q.get('signature') === '1') return true;
  try { if (sessionStorage.getItem(K_SIG)) return false; sessionStorage.setItem(K_SIG, '1'); } catch { /* */ }
  return true;
}

// onGo : la page peut commencer (la carte s'éteint) ; rend une promesse résolue à la fin (ou tout de suite en cas d'échec)
export async function playSignature({ base = './', onGo = () => {} } = {}) {
  const cv = document.createElement('canvas');
  cv.className = 'sig';
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:4;pointer-events:none;background:#060606;transition:opacity .7s ease';
  document.body.appendChild(cv);
  let went = false;
  const go = () => { if (!went) { went = true; onGo(); } };
  const done = () => { go(); cv.style.opacity = '0'; setTimeout(() => cv.remove(), 800); };
  const gl = cv.getContext('webgl2', { alpha: false, antialias: true, depth: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  if (!gl) { done(); return; }
  // (au plus 3 s pour préparer la carte, dans le noir de l'ouverture : sinon, pas de signature)
  const tc = performance.now();
  const card = await Promise.race([createCardRenderer(gl, base).catch(e => { console.warn('signature', e); return null; }), new Promise(r => setTimeout(() => r(null), 3000))]);
  if (window.__sgDebug || /signature=1/.test(location.search)) console.warn('signature : carte prête en', Math.round(performance.now() - tc), 'ms', !!card);
  if (!card) { done(); return; }
  const L = { ...LOOK };
  const seed = 11 + Math.floor(Math.random() * 40);
  return new Promise(res => {
    const t0 = performance.now();
    const frame = () => {
      const t = (performance.now() - t0) / 1000;
      const dpr = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
      // la carte (87 × 52) occupe ≈ 74 % de la largeur sur téléphone, 34 % de la hauteur sur ordinateur
      const cw = 87, need = W < H ? cw / 0.74 : (52 / 0.34) * W / H, Hw = need * H / W;
      const D = Hw / (2 * Math.tan(FOV / 2)), eye = [0, -D * Math.sin(TILT), D * Math.cos(TILT)];
      const vp = M4.mul(M4.perspective(FOV, W / H, D * 0.3, D * 3), M4.lookAt(eye, [0, 0, 0], [0, 1, 0]));
      // la lampe : rasante (≈ 17–22°, la hauteur des cartes), elle passe au-dessus de la carte, du fond gauche au fond droit ; sa force monte
      // puis retombe ; la carte, presque invisible sans elle (une lumière ambiante à peine)
      const u = ease(clamp01((t - 0.25) / 2.7)), az = Math.PI * (1.02 - 1.04 * u), el = 0.3 + 0.08 * Math.sin(Math.PI * u);
      const R = 260, lightPos = [Math.cos(az) * R * Math.cos(el), Math.sin(az) * R * Math.cos(el) + 30, R * Math.sin(el)];
      const on = sstep(0.25, 1.0, t) * (1 - sstep(2.35, 3.05, t));
      const P = { ...L, lightPos, light: L.light * 1.25 * on, env: L.env * (0.15 + 0.6 * on), spotI: 0 };
      const fade = 1 - sstep(2.9, SIG_T, t);
      // elle respire à peine (elle est posée, pas suspendue)
      const M = M4.model(0.03 * Math.sin(t * 0.7), -0.04 + 0.03 * Math.sin(t * 0.5), 0.004 * Math.sin(t * 0.4), 0, 0, 0);
      gl.viewport(0, 0, cv.width, cv.height);
      gl.clearColor(6 / 255, 6 / 255, 6 / 255, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      card.draw(vp, eye, P, { model: M, lod: 'fine', seed, fade, noLogo: false });
      if (t >= SIG_GO) go();
      if (t < SIG_T) requestAnimationFrame(frame);
      else { done(); res(); }
    };
    requestAnimationFrame(frame);
  });
}
