// Les autres poèmes, en direct (12/10, Maxence : « ce sont vraiment des rendus 3D dans l'environnement, qui réagissent
// à la lumière et aux mouvements, pas des images ») : chaque feuille du défilé est dessinée par le moteur de la feuille
// (même papier, même lampe rasante, lettres en relief, vers tapés à la machine, la carte question posée dessus à sa
// taille réelle sur l'A4). Un seul canvas transparent, fixé sur l'écran, sous le bandeau du bas : il dessine chaque
// feuille exactement à la place de sa figure (exemples.js garde la mise en page, les gestes et l'image de repli).
// Lire : la feuille du milieu vient de sa place jusqu'à remplir l'écran (ouvrir) ; toucher sa carte = la carte de près ;
// glisser de côté = le poème voisin, toujours ouvert.
import { createCardRenderer, M4, CARD } from '../cards/cardRenderer.js';
import { loadTypeFont, makeInkMap, TYPE } from '../cards/ink.js';
import { createNameRelief } from '../cards/nameRelief.js';
import { LOOK } from '../cards/scene.js';
import { SHEET, LOGO_Y, LOGO_K, CARD_S } from '../sheet/sheet.js';
import { typeLines } from '../sheet/typewriter.js';
import { stageLamp } from '../livres/book3d.js';
import QUESTIONS from '../cards/questions.json';

const FOV = 26 * Math.PI / 180, TF = Math.tan(FOV / 2), TILT = 0.05;
const T = (x, y, z) => M4.model(0, 0, 0, x, y, z);
const S = k => new Float32Array([k, 0, 0, 0, 0, k, 0, 0, 0, 0, k, 0, 0, 0, 0, 1]);
const PX = 10;                                     // px par unité de l'encre de la feuille (les petits vers restent nets)
const CW = CARD.w * CARD_S, CH = CARD.h * CARD_S;
const SHEET_IN_IMG = 0.88;                         // la feuille occupe 88 % de la largeur de l'image de repli
const clamp01 = u => Math.min(1, Math.max(0, u));
const ease = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
const lerp = (a, b, u) => a + (b - a) * u;

// o : { root (où poser le canvas), slots [{ f, k }], exemples [{ vers }], reduced }
export async function mountSheets3d(o) {
  const canvas = document.createElement('canvas');
  canvas.className = 'ex-cv';
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: true, depth: true, premultipliedAlpha: false });
  if (!gl) return null;
  const base = new URL('./', document.baseURI).href;
  const card = await createCardRenderer(gl, base);
  await Promise.all([document.fonts.load('500 64px "SG Garamond"'), loadTypeFont(base)]);
  const nameR = await createNameRelief(gl, card.paperTex);
  const AZ = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
  nameR.letters(AZ);
  card.addShape('sheet', { ...SHEET, fine: [10, 10, 0.25, 0, LOGO_Y] });
  const L = { ...LOOK };

  // ---- chaque poème : l'encre de la feuille (les vers), la carte (une question au hasard, la même à chaque visite) ----
  let sd = 20261010;
  const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  const CY = -SHEET.h / 2 + CH / 2 + 12;                       // la carte, posée sur le bas de la feuille, centrée
  const poems = o.exemples.map((ex, n) => {
    const seed = n + 1, vers = ex.vers.filter(v => v !== ''), chars = vers.map(v => v[0].toUpperCase());
    const colTop = SHEET.h / 2 - 32, colBot = CY + CH / 2 + 10, nn = chars.length;
    const lead = nn > 1 ? Math.min(10.5, (colTop - colBot - 14) / (nn - 1)) : 10.5;
    const cap = Math.min(6.4, lead * 0.6), emT = cap / nameR.capHeight, yc = (colTop + colBot) / 2 + cap / 2 + 4;
    const baseOf = k => yc + ((nn - 1) / 2 - k) * lead - cap / 2;
    // les vers, tapés à la machine juste après la lettre (la machine n'a pas de « œ » : « oe ») ; le bloc centré
    const rests = vers.map(v => v.slice(2).replace(/œ/g, 'oe').replace(/Œ/g, 'OE'));
    const lw = Math.max(...chars.map(c => nameR.adv(c))) * emT, gap = TYPE.pitch * 0.9, long = Math.max(...rests.map(r => r.length)) * TYPE.pitch;
    const k = Math.min(1, (SHEET.w - 24 - lw - gap) / long);
    const colX = -(lw + gap + long * k) / 2, x0 = colX + lw + gap;
    const full = new OffscreenCanvas(Math.round(SHEET.w * PX), Math.round(SHEET.h * PX)), fx = full.getContext('2d');
    fx.fillStyle = '#000'; fx.fillRect(0, 0, full.width, full.height);
    rests.forEach((r, i) => typeLines(fx, PX * k, [r], (SHEET.w / 2 + x0) / k, (SHEET.h / 2 - baseOf(i)) / k, 0, seed * 31 + i * 7, 1, '#fff'));
    const qid = QUESTIONS[Math.floor(rnd() * QUESTIONS.length)].id, q = QUESTIONS.find(x => x.id === qid).q.toLowerCase();
    return {
      sheetInk: card.makeInk(full, true), cardInk: card.makeInk(makeInkMap(q, seed * 13 + 5).canvas),
      letters: chars.map((ch, i) => ({ i: AZ.indexOf(ch), m: M4.mul(T(colX + (lw - nameR.adv(ch) * emT) / 2, baseOf(i), SHEET.t / 2 + 1), S(emT)) })),
      block: { x: colX + (lw + gap + long * k) / 2, y: (baseOf(0) + cap + baseOf(nn - 1)) / 2, w: lw + gap + long * k + 6, h: baseOf(0) + cap - baseOf(nn - 1) + 6 },
      seed, cardV: { seed: (seed * 7) % 97, paperXf: [0.6, -0.4, 0, 0], warp: [0.18, -0.08, 0.04], logoOff: [0, 0] },
      sheetV: { seed: 40 + seed, paperXf: [1.2, -0.6, 0, 0], warp: [0.4, -0.22, 0.05], logoOff: [0, LOGO_Y], logoScale: [LOGO_K, LOGO_K], paperTile: 0.6 * CARD.w / 0.7, paperLo: 0.35 },
    };
  });

  // ---- l'inclinaison : la souris, le téléphone penché ----
  const reduced = !!o.reduced;
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!reduced) {
    addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; tilt.tx = Math.max(-1, Math.min(1, e.clientX / innerWidth * 2 - 1)); tilt.ty = Math.max(-1, Math.min(1, e.clientY / innerHeight * 2 - 1)); }, { passive: true });
    let b0 = null, g0 = 0;
    addEventListener('deviceorientation', e => {
      if (e.beta == null || e.gamma == null) return;
      if (b0 == null) { b0 = e.beta; g0 = e.gamma; }
      b0 += (e.beta - b0) * 0.02; g0 += (e.gamma - g0) * 0.02;
      tilt.tx = Math.tanh((e.gamma - g0) / 16); tilt.ty = -Math.tanh((e.beta - b0) / 16);
    });
  }

  // ---- lire : r 0 → 1 (la feuille du milieu vient remplir l'écran) ; zc 0 → 1 (sa carte de près) ----
  const rd = { on: false, r: 0, zc: 0, zcT: 0, what: 'card' };
  const insets = () => { const sf = o.safe || (() => 0); return { top: 52 + sf('top'), bot: 38 + sf('bottom') }; };

  // la vue : 1 unité du monde = 1 px CSS sur le plan z = 0 (les feuilles se posent exactement sur leurs figures)
  let raf = 0, last = 0, t0 = performance.now(), lastRects = [];
  const stateV = {};
  const draw = now => {
    raf = 0;
    if (!canvas.isConnected) return;
    const cw = innerWidth, ch = innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
    const W = Math.round(cw * dpr), H = Math.round(ch * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const dt = Math.min(0.1, (now - (last || now)) / 1000); last = now;
    const t = reduced ? 0 : (now - t0) / 1000;
    const kt = Math.min(1, dt * 2.2); tilt.x += (tilt.tx - tilt.x) * kt; tilt.y += (tilt.ty - tilt.y) * kt;
    rd.r += ((rd.on ? 1 : 0) - rd.r) * (reduced ? 1 : Math.min(1, dt * 5));
    rd.zc += (rd.zcT - rd.zc) * (reduced ? 1 : Math.min(1, dt * 5));
    if (!rd.on && rd.r < 0.002) { rd.r = 0; canvas.classList.remove('reading'); }
    const D = ch / (2 * TF), eye = [0, -D * Math.sin(TILT), D * Math.cos(TILT)];
    const vp = M4.mul(M4.perspective(FOV, cw / ch, D * 0.3, D * 3), M4.lookAt(eye, [0, 0, 0], [0, 1, 0]));
    const P = stageLamp(L, { Hw: ch * 0.9 }, t, tilt, 1.25, 0.2);
    gl.viewport(0, 0, W, H);
    gl.disable(gl.SCISSOR_TEST);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    const { top, bot } = insets(), Ht = ch - top - bot;
    // ouverte : rien ne passe sur le bandeau ni sous SINGULIES
    if (rd.r > 0.02) { gl.enable(gl.SCISSOR_TEST); gl.scissor(0, Math.round(bot * dpr), W, Math.round(Ht * dpr)); }
    // la feuille ouverte : entière entre le bandeau et SINGULIES ; la carte de près : elle remplit la largeur
    const bigK = Math.min(Ht * 0.94 / SHEET.h, cw * 0.94 / SHEET.w), bigY = ch / 2 - (top + Ht / 2);
    lastRects = [];
    const order = [...o.slots].sort((a, b) => Math.abs(b.k) - Math.abs(a.k));     // les plus loin d'abord
    for (const s of order) {
      const i = +s.f.dataset.i, pm = poems[i];
      if (!pm) continue;
      const rc = s.f.getBoundingClientRect(), op = +(s.f.style.opacity || 1);
      if (rc.width < 2 || rc.bottom < -50 || rc.top > ch + 50) continue;
      // à sa place dans le défilé
      let k = rc.width * SHEET_IN_IMG / SHEET.w, x = rc.left + rc.width / 2 - cw / 2, y = ch / 2 - (rc.top + rc.height / 2), z = 0, fade = op;
      // ouverte : celle du milieu vient au centre, en grand ; les autres s'effacent
      if (rd.r > 0.001) {
        const u = ease(clamp01(rd.r));
        if (s.k === 0) { k = lerp(k, bigK, u); x = lerp(x, 0, u); y = lerp(y, bigY, u); z = 2 * u; }
        else fade *= 1 - u;
      }
      if (fade < 0.01) continue;
      const ph = s.k * 1.9 + pm.seed;
      const bx = 0.6 * Math.sin(t * 0.47 + ph) + 0.4 * Math.sin(t * 1.07 + ph * 1.3), by = 0.6 * Math.sin(t * 0.39 + ph * 0.7) + 0.4 * Math.sin(t * 0.93 + ph);
      const near = s.k === 0 ? rd.r : 0, still = 1 - 0.7 * near;
      const rx = (-0.06 * tilt.y + 0.016 * by) * still, ry = (0.08 * tilt.x + 0.02 * bx) * still;
      let M = M4.mul(M4.mul(T(x, y, z), M4.model(rx, ry, 0.004 * Math.sin(t * 0.3 + ph))), S(k));
      // de près (la carte, ou le poème) : la feuille glisse et grandit jusqu'à ce qu'il remplisse la vue
      if (s.k === 0 && rd.zc > 0.001) {
        const u = ease(rd.zc), tg = zoomTarget(pm), kz = lerp(1, Math.min(cw * 0.92 / (tg.w * bigK), Ht * 0.8 / (tg.h * bigK)), u);
        M = M4.mul(M4.mul(T(0, bigY, 0), S(kz)), M4.mul(T(-tg.x * bigK * u, -(bigY + tg.y * bigK * u), 0), M));
      }
      // (les vers : une frappe nette, peu d'usure — ils doivent se lire, même petits)
      card.draw(vp, eye, { ...P, inkWear: 0.6, inkThr: 0.28, inkVar: 0.25 }, { model: M, lod: 'sheet', fade, shade: 1, inkBack: pm.sheetInk, inkRG: true, ...pm.sheetV });
      const Mc = M4.mul(M4.mul(M, M4.model(0, 0, -0.02, 0, CY, 1.4)), M4.mul(M4.model(0, Math.PI, 0), S(CARD_S)));
      card.draw(vp, eye, P, { model: Mc, lod: 'fine', ink: pm.cardInk, fade, shade: 1, ...pm.cardV });
      nameR.drawLetters(vp, eye, P, L, pm.letters.map(l => ({ i: l.i, model: M4.mul(M, l.m), glow: 0.16, alpha: fade })), t);
      gl.enable(gl.DEPTH_TEST);
      if (s.k === 0) lastRects = [M];
    }
    if (stateV.v && !document.hidden && (!reduced || Math.abs((rd.on ? 1 : 0) - rd.r) > 1e-3 || Math.abs(rd.zcT - rd.zc) > 1e-3)) raf = requestAnimationFrame(draw);
  };
  const go = () => { if (!raf) raf = requestAnimationFrame(draw); };
  // (seulement quand on voit le défilé)
  // (le défilé à l'écran : on dessine ; la page qui défile relance)
  const seen = () => { if (rd.on || rd.r > 0.002 || !o.watch) return true; const r = o.watch.getBoundingClientRect(); return r.bottom > -40 && r.top < innerHeight + 40 && r.height > 0; };
  Object.defineProperty(stateV, 'v', { get: seen });
  (o.scroller || window).addEventListener('scroll', go, { passive: true });
  addEventListener('resize', go);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) go(); });
  const host = o.root || document.body; host.insertBefore(canvas, host.firstChild);
  go();

  const zoomTarget = pm => (rd.what === 'poem' ? pm.block : { x: 0, y: CY, w: CW, h: CH });
  // ce qu'on touche sur la feuille ouverte (px CSS) : 'card', 'poem' ou rien
  function hitWhat(x, y) {
    const M = lastRects[0]; if (!M || rd.r < 0.9) return null;
    const pm = poems[+o.slots.find(s => s.k === 0)?.f.dataset.i] || poems[0];
    const cw = innerWidth, ch = innerHeight, D = ch / (2 * TF), eye = [0, -D * Math.sin(TILT), D * Math.cos(TILT)];
    const vp = M4.mul(M4.perspective(FOV, cw / ch, D * 0.3, D * 3), M4.lookAt(eye, [0, 0, 0], [0, 1, 0]));
    const pj = (px, py) => { const m = M4.mul(vp, M), w = m[3] * px + m[7] * py + m[15]; return [((m[0] * px + m[4] * py + m[12]) / w * 0.5 + 0.5) * cw, (0.5 - (m[1] * px + m[5] * py + m[13]) / w * 0.5) * ch]; };
    const inR = (r) => { const a = pj(r.x - r.w / 2, r.y + r.h / 2), b = pj(r.x + r.w / 2, r.y - r.h / 2); return x >= Math.min(a[0], b[0]) && x <= Math.max(a[0], b[0]) && y >= Math.min(a[1], b[1]) && y <= Math.max(a[1], b[1]); };
    if (inR({ x: 0, y: CY, w: CW, h: CH })) return 'card';
    if (inR(pm.block)) return 'poem';
    return null;
  }
  function cardHit(x, y) {
    const M = lastRects[0]; if (!M || rd.r < 0.9) return false;
    const cw = innerWidth, ch = innerHeight, D = ch / (2 * TF), eye = [0, -D * Math.sin(TILT), D * Math.cos(TILT)];
    const vp = M4.mul(M4.perspective(FOV, cw / ch, D * 0.3, D * 3), M4.lookAt(eye, [0, 0, 0], [0, 1, 0]));
    const pj = (px, py) => { const m = M4.mul(vp, M), w = m[3] * px + m[7] * py + m[15]; return [((m[0] * px + m[4] * py + m[12]) / w * 0.5 + 0.5) * cw, (0.5 - (m[1] * px + m[5] * py + m[13]) / w * 0.5) * ch]; };
    const a = pj(-CW / 2, CY + CH / 2), b = pj(CW / 2, CY - CH / 2);
    return x >= Math.min(a[0], b[0]) && x <= Math.max(a[0], b[0]) && y >= Math.min(a[1], b[1]) && y <= Math.max(a[1], b[1]);
  }
  return {
    canvas, go,
    open() { rd.on = true; rd.zcT = 0; canvas.classList.add('reading'); go(); },
    close() { rd.on = false; rd.zcT = 0; go(); },
    toggleCard(on) { rd.zcT = on ?? (rd.zcT ? 0 : 1); go(); return !!rd.zcT; },
    zoom(what) { if (what) rd.what = what; rd.zcT = what ? 1 : 0; go(); },
    hitWhat,
    get cardOpen() { return !!rd.zcT; },
    cardHit,
  };
}
