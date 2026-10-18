// Un objet en direct dans une boîte (18/10, boutique) : le livre, l'enveloppe, le paquet de cartes — le vrai moteur des
// cartes, la même lampe, le même papier — dessinés dans la galerie d'une fiche, à la place de l'écran entier des pages du
// site (mountStage, book3d.js). Le monde 3D est cadré sur la boîte (stageOverride : plus de réserve en haut ni en bas).
// Il respire tout seul, s'incline avec la souris ; il ne se dessine que vu (IntersectionObserver) et s'arrête onglet caché.
import { stageOverride } from '../app/stage.js';


// make(gl) → scène { frame(W, H, cw, ch, t, tilt, spin, p, pT), … }
// → { canvas, scene, setP(p), go(), destroy() } ou null (pas de WebGL2, scène en échec)
export async function mountLive(box, make, { reduced = false, p = 0, zoom = 0.9, lift = 0 } = {}) {
  stageOverride({ top: 0, bottom: 0, zoom, lift });   // (une seule scène par page : le cadrage est celui de cet objet)
  const canvas = document.createElement('canvas');
  canvas.className = 'gal-live';
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: true, depth: true, premultipliedAlpha: false });
  if (!gl) return null;
  let scene;
  try { scene = await make(gl); } catch (e) { console.warn('objet', e); return null; }
  if (!box.isConnected) return null;
  box.insertBefore(canvas, box.firstChild);
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  let raf = 0, t0 = performance.now(), last = t0, lost = false, visible = true, shown = false, cur = p, want = p, dead = false;
  if (!reduced && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    addEventListener('pointermove', onMove, { passive: true });
  }
  function onMove(e) {
    if (e.pointerType !== 'mouse') return;
    tilt.tx = Math.max(-1, Math.min(1, (e.clientX / innerWidth) * 2 - 1)); tilt.ty = Math.max(-1, Math.min(1, (e.clientY / innerHeight) * 2 - 1));
  }
  const spin = { x: 0, y: 0 };
  const draw = now => {
    raf = 0;
    if (lost || dead) return;
    const dpr = Math.min(devicePixelRatio || 1, 2), cw = box.clientWidth, ch = box.clientHeight;
    if (!cw || !ch) { raf = requestAnimationFrame(draw); return; }
    const W = Math.max(2, Math.round(cw * dpr)), H = Math.max(2, Math.round(ch * dpr));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const k = Math.min(1, dt * 1.6); tilt.x += (tilt.tx - tilt.x) * k; tilt.y += (tilt.ty - tilt.y) * k;
    // l'étape voulue : l'objet y glisse (le livre d'un livre à l'autre)
    cur += (want - cur) * Math.min(1, dt * 3.2); if (Math.abs(want - cur) < 1e-3) cur = want;
    const live = scene.frame(W, H, cw, ch, reduced ? 0 : (now - t0) / 1000, tilt, spin, cur, want);
    if (!shown) { shown = true; canvas.classList.add('on'); box.classList.add('live-on'); }
    // au repos (mouvement réduit, rien qui bouge) : on s'arrête
    if (!document.hidden && visible && (!reduced || live === true || cur !== want)) raf = requestAnimationFrame(draw);
  };
  const go = () => { if (!raf && !lost && !dead && visible) raf = requestAnimationFrame(draw); };
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) go(); }) : null;
  io?.observe(box);
  const vis = () => { if (!document.hidden) go(); };
  document.addEventListener('visibilitychange', vis);
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; canvas.remove(); box.classList.remove('live-on'); });
  go();
  return {
    canvas, scene, go,
    setP(v) { want = v; go(); },
    destroy() { dead = true; cancelAnimationFrame(raf); io?.disconnect(); removeEventListener('pointermove', onMove); document.removeEventListener('visibilitychange', vis); canvas.remove(); try { gl.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* */ } },
  };
}

// les scènes (chargées à la demande : la page n'embarque le moteur que pour une fiche qui en a besoin)
export const SCENES = {
  livre: { zoom: 1.0, lift: 0.075, make: base => gl => import('../livres/book3d.js').then(m => m.createBook(gl, base, m.BOOKS)) },
  enveloppe: { zoom: 1.0, make: base => gl => import('../lettre/env3d.js').then(m => m.createEnvelope(gl, base)) },
};
