// Le paquet du jeu, en direct, au bas de l'écran final (12/10, Maxence) : SINGULIES / le jeu au dos de la carte du
// dessus ; il sautille de temps en temps (touche-moi) ; le toucher, ou le glisser vers le haut : la carte du dessus se
// soulève et se retourne sur une question tirée au hasard — puis l'écran du jeu, avec cette question (onDraw(id)).
// Même moteur, même papier, même lampe que les cartes.
import { createCardRenderer, M4, CARD } from '../cards/cardRenderer.js';
import { LOOK } from '../cards/scene.js';
import { loadTypeFont, makeInkMap } from '../cards/ink.js';
import { stageLamp } from '../livres/book3d.js';
import QUESTIONS from '../cards/questions.json';

const FOV = 26 * Math.PI / 180, TF = Math.tan(FOV / 2), TILT = 0.22, N = 9, PITCH = 0.15;
const clamp01 = u => Math.min(1, Math.max(0, u));
const sstep = (a, b, x) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const ease = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;

export async function mountDeck(box, { base = './', reduced = false, onDraw = () => {} } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'mc-deck-c';
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: true, depth: true, premultipliedAlpha: false });
  if (!gl) return null;
  const card = await createCardRenderer(gl, base);
  await loadTypeFont(base);
  const L = { ...LOOK };
  let sd = (Math.random() * 1e9) >>> 0 || 7; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  const vs = Array.from({ length: N }, () => ({ seed: rnd() * 100, paperXf: [rnd() * 5 - 2.5, rnd() * 3 - 1.5, rnd() < 0.5 ? 0 : Math.PI, 0], logoOff: [0, 0], warp: [0.1 + rnd() * 0.2, -0.1 + rnd() * 0.1, 0], jx: rnd() - 0.5, jy: rnd() * 0.8 - 0.4, jr: (rnd() - 0.5) * 0.024 }));
  const top = vs[N - 1];
  const backInk = card.makeInk(makeInkMap('SINGULIES, le jeu', Math.floor(top.seed * 1000) + 7, ['SINGULIES', 'le jeu'], true).canvas);
  const q = QUESTIONS[Math.floor(rnd() * QUESTIONS.length)];
  const qInk = card.makeInk(makeInkMap(q.q, Math.floor(top.seed * 1000) + q.id).canvas);
  box.appendChild(canvas);
  let raf = 0, t0 = performance.now(), drawT = -1, done = false, gone = false, lastVP = null, lastW = 0;
  const pull = () => { if (drawT >= 0) return; drawT = performance.now(); go(); };
  const frame = now => {
    raf = 0;
    if (!canvas.isConnected) return;
    const dpr = Math.min(devicePixelRatio || 1, 2), cw = box.clientWidth, ch = box.clientHeight;
    const W = Math.max(2, Math.round(cw * dpr)), H = Math.max(2, Math.round(ch * dpr));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const t = (now - t0) / 1000;
    // la vue : le paquet au milieu de sa boîte, une carte ≈ 62 % de la largeur (au plus 250 px)
    const wpx = Math.min(cw * 0.62, 250), Hw = CARD.w / wpx * ch, D = Hw / (2 * TF), cy = 0;
    const eye = [0, cy - D * Math.sin(TILT), D * Math.cos(TILT)];
    const vp = M4.mul(M4.perspective(FOV, cw / ch, D * 0.2, D * 4), M4.lookAt(eye, [0, cy, 0], [0, 1, 0]));
    const P = stageLamp(L, { Hw: Hw * 1.6 }, reduced ? 0 : t, { x: 0, y: 0 }, 1.25, 0.1);
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    lastVP = vp; lastW = wpx; lastP = P;
    if (gone) { if (!document.hidden) raf = requestAnimationFrame(frame); return; }
    const u = drawT < 0 ? 0 : clamp01((now - drawT) / 1300);
    for (let i = 0; i < N; i++) {
      const v = vs[i];
      let x = v.jx, y = v.jy, z = i * PITCH, ry = 0, rx = 0;
      if (i === N - 1) {
        // touche-moi : un petit saut toutes les 4,5 s ; tirée : elle se soulève, se retourne, monte
        const ph = (t % 4.5);
        if (drawT < 0 && !reduced) z += 3.2 * sstep(0, 0.16, ph) * (1 - sstep(0.16, 0.45, ph)) + 1.1 * sstep(0.45, 0.57, ph) * (1 - sstep(0.57, 0.85, ph));
        const up = sstep(0, 0.35, u), e = ease(u);
        z += (CARD.w / 2 + 8) * up * (1 - 0.4 * sstep(0.7, 1, u)); ry = Math.PI * sstep(0.2, 0.75, u); rx = -0.12 * up;
        y += 6 * e;
      }
      card.draw(vp, eye, P, { model: M4.model(rx, ry, v.jr, x, y, z), lod: i === N - 1 ? 'fine' : 'coarse', shade: 0.55 + 0.45 * (i + 1) / N, ...(i === N - 1 ? { ink: qInk, inkBack: backInk } : {}), ...v });
    }
    if (u >= 1 && !done) { done = true; setTimeout(() => onDraw(q.id), reduced ? 0 : 250); }
    if (!document.hidden) raf = requestAnimationFrame(frame);
  };
  const go = () => { if (!raf) raf = requestAnimationFrame(frame); };
  // (12/10) le relais vers la page du jeu (jeu.js, relay) : où est la carte du dessus à l'écran, sa largeur, son papier ;
  // la page du jeu la prend (giveDeck : on cesse de la dessiner) et la rend au retour (takeDeck)
  let lastP = null;
  function deckScreen() {
    if (!lastVP) return null;
    const v = top, z = (N - 1) * PITCH, m = lastVP, w = m[3] * v.jx + m[7] * v.jy + m[11] * z + m[15];
    const r = box.getBoundingClientRect(), x = (m[0] * v.jx + m[4] * v.jy + m[8] * z + m[12]) / w, y = (m[1] * v.jx + m[5] * v.jy + m[9] * z + m[13]) / w;
    return { x: r.left + (x * 0.5 + 0.5) * r.width, y: r.top + (0.5 - y * 0.5) * r.height, w: lastW, v: { ...v, jx: 0, jy: 0 } };
  }

  document.addEventListener('visibilitychange', () => { if (!document.hidden) go(); });
  go();
  return { pull, qid: q.id, deckScreen, lightNow: () => null, giveDeck: () => { gone = true; }, takeDeck: () => { gone = false; drawT = -1; done = false; go(); } };
}
