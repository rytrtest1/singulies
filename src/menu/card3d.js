// La carte d'écriture en vraie 3D (17/10, Maxence : « la carte n'est qu'une image : elle doit être vraiment en 3D, respirer,
// avec juste un curseur dessus ») : la carte vierge du jeu, rendue par le moteur des cartes (même papier, même lampe
// rasante), qui respire d'elle-même, s'incline avec la souris, et sur laquelle ce qu'on tape s'imprime à la machine
// (mêmes frappes que les cartes du poème). Sans invitation : un curseur qui respire. Utilisée par « me contacter ».
import { createCardRenderer, M4, CARD } from '../cards/cardRenderer.js';
import { LOOK } from '../cards/scene.js';
import { loadTypeFont, makeAnswerInk, CTYPE } from '../cards/ink.js';
import { stageLamp } from '../livres/book3d.js';

const FOV = 26 * Math.PI / 180, TF = Math.tan(FOV / 2), TILT = 0.22;

// box : l'élément qui porte la carte ; faceFrac : la part de sa largeur que la carte occupe (le reste : l'air autour, pour
// l'inclinaison et l'ombre) ; renvoie null sans WebGL2
export async function mountWriteCard(box, { base = './', reduced = false, faceFrac = 0.86 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'ct-3d'; canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: true, depth: true, premultipliedAlpha: false });
  if (!gl) return null;
  const card = await createCardRenderer(gl, base);
  await loadTypeFont(base);
  const L = { ...LOOK };
  let sd = (Math.random() * 1e9) >>> 0 || 7; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  const v = { seed: rnd() * 100, paperXf: [rnd() * 5 - 2.5, rnd() * 3 - 1.5, rnd() < 0.5 ? 0 : Math.PI, 0], logoOff: [0, 0], warp: [0.15, -0.05, 0] };
  let text = '', ink = null, cursorMM = null;
  const render = () => {
    const m = makeAnswerInk(text, Math.floor(v.seed * 1000) + 7, 3, null, undefined, null);
    if (ink) card.freeInk(ink);
    ink = card.makeInk(m.canvas, false); cursorMM = m.cursor;
  };
  render();
  box.appendChild(canvas);
  let raf = 0, flyT = -1, last = 0, alive = true;
  const tilt = { x: 0, y: 0 }, tgt = { x: 0, y: 0 };
  const t0 = performance.now();
  const frame = now => {
    raf = 0;
    if (!alive || !canvas.isConnected) return;
    const dpr = Math.min(devicePixelRatio || 1, 2), cw = box.clientWidth, ch = box.clientHeight;
    if (cw < 2 || ch < 2) { raf = requestAnimationFrame(frame); return; }
    const W = Math.round(cw * dpr), H = Math.round(ch * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const t = (now - t0) / 1000, dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016); last = now;
    const k = 1 - Math.exp(-dt * 4); tilt.x += (tgt.x - tilt.x) * k; tilt.y += (tgt.y - tilt.y) * k;
    // la vue : la carte occupe faceFrac de la largeur de la boîte
    const wpx = cw * faceFrac, Hw = CARD.w / wpx * ch, D = Hw / (2 * TF);
    const eye = [0, -D * Math.sin(TILT), D * Math.cos(TILT)];
    const vp = M4.mul(M4.perspective(FOV, cw / ch, D * 0.2, D * 4), M4.lookAt(eye, [0, 0, 0], [0, 1, 0]));
    const P = stageLamp(L, { Hw: Hw * 1.6 }, reduced ? 0 : t, tilt, 1.25, 0.1);
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    // elle respire (deux sinus lents non accordés), s'incline avec la souris ; envoyée : elle s'envole
    const fly = flyT < 0 ? 0 : Math.min(1, (now - flyT) / 900);
    const sw = reduced ? 0 : 0.55 * Math.sin(t * 0.52) + 0.2 * Math.sin(t * 0.97 + 1), bw = reduced ? 0 : 0.5 * Math.sin(t * 0.41 + 2) + 0.2 * Math.sin(t * 0.83);
    const rx = -0.05 * bw - 0.16 * tilt.y - 0.5 * fly, ry = Math.PI + 0.1 * sw + 0.22 * tilt.x, rz = 0.01 * Math.sin(t * 0.29) - 0.05 * fly;
    const y = fly * Hw * 0.7, a = 0.55 + 0.4 * Math.sin(t * 2.4), cm = cursorMM;
    card.draw(vp, eye, P, { model: M4.model(rx, ry, rz, 0, y, 0), lod: 'fine', ink, shade: 1, fade: 1 - fly, ...v,
      ...(cm && !fly ? { cursor: [CARD.w / 2 - cm.x, CARD.h / 2 - cm.y - 0.8, CTYPE.size * 0.92, a], cursorFace: 1 } : {}) });
    if (!document.hidden) raf = requestAnimationFrame(frame);
  };
  const go = () => { if (!raf && alive) raf = requestAnimationFrame(frame); };
  const onVis = () => { if (!document.hidden) go(); };
  document.addEventListener('visibilitychange', onVis);
  // la souris incline la carte (jamais le téléphone : plus d'orientation du téléphone sur le site)
  const onMove = e => {
    if (e.pointerType !== 'mouse') return;
    const r = box.getBoundingClientRect();
    tgt.x = Math.max(-1, Math.min(1, (e.clientX - r.left - r.width / 2) / (innerWidth * 0.35)));
    tgt.y = Math.max(-1, Math.min(1, -(e.clientY - r.top - r.height / 2) / (innerHeight * 0.35)));
  };
  if (!reduced) addEventListener('pointermove', onMove, { passive: true });
  go();
  return {
    canvas,
    setText(s) {
      const t = String(s).toLowerCase().replace(/[’‘`´]/g, "'").replace(/[\r\n\t]/g, ' ').replace(/ {2,}/g, ' ');
      if (t === text) return;
      text = t; render(); go();
    },
    fly() { flyT = performance.now(); go(); },
    dispose() {
      alive = false; cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis); removeEventListener('pointermove', onMove);
      try { gl.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* */ }
      canvas.remove();
    },
  };
}
