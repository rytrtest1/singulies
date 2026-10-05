// Portail (05/10) : la première page, avant tout choix. ETERNEL tapé à la machine en silence (en haut), pendant
// que les cartes se préparent ; puis quatre cartes du jeu, face visible, de même rang (le poème d'abord) :
// ton prénom, ton poème · une lettre chez toi, chaque mois · mes livres · le jeu (le paquet lui-même).
// Toucher le poème : le champ de prénoms (la page ouvre le clavier dans le même geste, iPhone) ; les autres : leur
// lien (liens d'attente pour l'instant : la carte se retourne, « bientôt », puis revient).
// Même carte, même papier, même lumière que la scène des cartes (cardRenderer, encre frappée).
import { createCardRenderer, M4, CARD } from '../cards/cardRenderer.js';
import { loadTypeFont, makeInkMap } from '../cards/ink.js';
import { LOOK } from '../cards/scene.js';
import { createRng } from '../field/rng.js';

// liens de sortie : null = lien d'attente (la carte se retourne, « bientôt »)
export const LINKS = { lettre: null, livres: null, jeu: null };
const ITEMS = [
  { id: 'poeme', label: 'ton prénom, ton poème' },
  { id: 'lettre', label: 'une lettre chez toi, chaque mois' },
  { id: 'livres', label: 'mes livres' },
  { id: 'jeu', label: 'le jeu', deck: 9 },
];
const SIG = 'ETERNEL';
const FOV = 26 * Math.PI / 180, TILT = 0.1, PITCH = 0.15;
const INTRO = 0.9, STAGGER = 0.12, FLIP = 1.1, HOLD = 2.2, LEAVE = 0.9;

const CSS = `
#portal { position: fixed; inset: 0; z-index: 20; background: #060606; transition: opacity .9s ease; touch-action: pinch-zoom; }
#portal.off { opacity: 0; pointer-events: none; }
#portal canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
#portal .pt-sig { position: absolute; left: 0; right: 0; text-align: center; white-space: pre; pointer-events: none;
  font: 15px/1 'SG Machine', monospace; letter-spacing: .55em; padding-left: .55em; color: rgb(217,217,217); }
#portal .pt-sig span { display: inline-block; }
#portal button { position: absolute; margin: 0; padding: 0; border: 0; background: transparent; color: transparent;
  cursor: pointer; -webkit-tap-highlight-color: transparent; touch-action: manipulation; font-size: 1px; outline: none; }
#portal button:focus-visible { outline: 1px solid rgba(255,255,255,.35); outline-offset: 4px; }
`;

const clamp01 = u => Math.min(1, Math.max(0, u));
const sstep = (a, b, x) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const ease = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;

// opts : { base, reduced, onPoem() (dans le geste : la page ouvre le clavier), onReady?() }
export async function mountPortal(opts = {}) {
  const { base = './', reduced = false } = opts;
  if (!document.getElementById('pt-style')) {
    const st = document.createElement('style'); st.id = 'pt-style'; st.textContent = CSS; document.head.appendChild(st);
  }
  const root = document.createElement('div'); root.id = 'portal';
  const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true');
  const sig = document.createElement('div'); sig.className = 'pt-sig'; sig.setAttribute('aria-label', SIG);
  root.append(canvas, sig);
  document.body.appendChild(root);
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, depth: true });
  if (!gl) { root.remove(); return null; }
  gl.clearColor(6 / 255, 6 / 255, 6 / 255, 1); gl.clear(gl.COLOR_BUFFER_BIT);

  const t0 = performance.now(), now = () => (performance.now() - t0) / 1000;
  const rnd = createRng();

  // ---- ETERNEL, tapé à la machine en silence, dès que la police (locale, légère) est là ----
  const fontP = loadTypeFont(base);
  fontP.then(() => {
    let i = 0;
    const strike = () => {
      if (i >= SIG.length) return;
      const s = document.createElement('span'); s.textContent = SIG[i++];
      // chaque frappe un peu différente : pression, petit décalage, légère rotation
      s.style.opacity = (reduced ? 0.6 : rnd.range(0.48, 0.66)).toFixed(2);
      if (!reduced) s.style.transform = `translateY(${rnd.range(-0.6, 0.6).toFixed(2)}px) rotate(${rnd.range(-1.2, 1.2).toFixed(2)}deg)`;
      sig.appendChild(s);
      setTimeout(strike, reduced ? 0 : rnd.range(90, 190));
    };
    setTimeout(strike, reduced ? 0 : 250);
  });

  // ---- cartes : papier, relief, encre (au plus vite) ----
  const [card] = await Promise.all([createCardRenderer(gl, base), fontP]);
  const L = { ...LOOK };
  const variant = (k = 1) => ({
    seed: rnd() * 100,
    paperXf: [rnd.range(-2.5, 2.5), rnd.range(-1.5, 1.5), rnd() < 0.5 ? 0 : Math.PI, 0],
    logoOff: [rnd.range(-0.15, 0.15), rnd.range(-0.15, 0.15)],
    warp: [rnd.range(0.05, 0.35), rnd.range(-0.2, 0.05), rnd.range(-0.12, 0.12)],
    jx: rnd.range(-0.5, 0.5) * k, jy: rnd.range(-0.4, 0.4) * k, jr: rnd.range(-0.012, 0.012) * k,
  });
  const inkOf = (s, v) => card.makeInk(makeInkMap(s, Math.floor(v.seed * 1000) + 7).canvas);
  let soonInk = null;
  const cards = ITEMS.map((it, i) => {
    const v = variant();
    const c = { ...it, i, v, ink: inkOf(it.label, v), labelInk: null, hover: 0, press: 0, flip: null, under: [] };
    c.labelInk = c.ink;
    if (it.deck) c.under = Array.from({ length: it.deck }, () => variant(1.6));
    return c;
  });

  // ---- disposition (px écran → mm du monde) ----
  const lay = { W: 1, H: 1, D: 300, s: 1, rects: [] };
  function layout(W, H) {
    lay.W = W; lay.H = H;
    const asp = CARD.w / CARD.h, portrait = W < H * 1.1;
    const top = H * (portrait ? 0.11 : 0.13), bot = H * 0.97, zone = bot - top;
    let h, cols, gx, gy;
    if (portrait) { cols = 1; h = Math.min(W * 0.74 / asp, zone / 4.48); gy = 0.16 * h; gx = 0; }
    else { cols = 2; h = Math.min(zone * 0.42, W * 0.34 / asp); gy = 0.2 * h; gx = 0.18 * h * asp; }
    const w = h * asp, rows = Math.ceil(ITEMS.length / cols);
    const bw = cols * w + (cols - 1) * gx, bh = rows * h + (rows - 1) * gy;
    const x0 = (W - bw) / 2, y0 = top + (zone - bh) / 2;
    lay.s = CARD.w / w;
    lay.D = lay.s * (H / 2) / Math.tan(FOV / 2);
    lay.Hw = H * lay.s;
    lay.pos = ITEMS.map((_, i) => {
      const r = Math.floor(i / cols), cI = i % cols;
      const px = x0 + cI * (w + gx) + w / 2, py = y0 + r * (h + gy) + h / 2;
      return { x: (px - W / 2) * lay.s, y: (H / 2 - py) * lay.s };
    });
    sig.style.top = `calc(max(env(safe-area-inset-top), 0px) + ${(top * 0.48).toFixed(0)}px)`;
    sig.style.transform = 'translateY(-50%)';
  }

  // ---- pointeur : légère inclinaison de l'ensemble (souris), lumière qui suit ; survol / appui par carte ----
  const ptr = { x: 0, y: 0 }, ts = { x: 0, y: 0 };
  const lp = { x: Math.cos(L.lightAz), y: Math.sin(L.lightAz), vx: 0, vy: 0 };
  function stepLight(dt, tilt) {
    const kk = Math.min(1, dt * 3); ts.x += (tilt.x - ts.x) * kk; ts.y += (tilt.y - ts.y) * kk;
    let tx = Math.cos(L.lightAz) + L.tiltAmp * tilt.x * L.lightVar, ty = Math.sin(L.lightAz);
    const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const w = 2.2, z = 0.85;
    for (const [k, v, tg] of [['x', 'vx', tx], ['y', 'vy', ty]]) {
      const acc = -2 * z * w * lp[v] - w * w * (lp[k] - tg);
      lp[v] += acc * dt; lp[k] += lp[v] * dt;
    }
  }
  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || !lay.W) return;
    ptr.x = Math.max(-1, Math.min(1, (e.clientX / lay.W - 0.5) * 2)); ptr.y = Math.max(-1, Math.min(1, -(e.clientY / lay.H - 0.5) * 2));
  });

  // ---- boutons (accessibles, posés sur les cartes) ----
  const buttons = cards.map(c => {
    const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', c.label); b.textContent = c.label;
    b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') c.hoverOn = true; });
    b.addEventListener('pointerleave', () => { c.hoverOn = false; c.pressOn = false; });
    b.addEventListener('pointerdown', () => { c.pressOn = true; });
    b.addEventListener('pointerup', () => { c.pressOn = false; });
    b.addEventListener('pointercancel', () => { c.pressOn = false; });
    b.addEventListener('click', e => { e.stopPropagation(); choose(c); });
    root.appendChild(b);
    return b;
  });

  let shownAt = null, leaving = null, visible = true, raf = 0, last = 0, vp = null;
  function choose(c) {
    if (leaving || shownAt == null) return;
    const t = now();
    if (c.id === 'poeme') {
      leaving = { c, t0: t };
      root.classList.add('off'); root.inert = true;
      opts.onPoem?.();                  // dans le geste : la page ouvre le clavier
      setTimeout(() => { if (leaving) { visible = false; stop(); } }, LEAVE * 1000 + 100);
      return;
    }
    const url = LINKS[c.id];
    if (url) { location.href = url; return; }
    // lien d'attente : la carte se retourne, « bientôt », puis revient
    if (c.flip && t - c.flip.t0 < 2 * FLIP + HOLD) return;
    if (!soonInk) soonInk = inkOf('bientôt', c.v);
    c.flip = { t0: t };
  }

  // ---- image ----
  function project(m, x, y) {
    const cx = m[0] * x + m[4] * y + m[12], cy = m[1] * x + m[5] * y + m[13], cw = m[3] * x + m[7] * y + m[15];
    return [(cx / cw * 0.5 + 0.5) * lay.W, (0.5 - cy / cw * 0.5) * lay.H];
  }
  function frame(n) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, last ? (n - last) / 1000 : 0.016); last = n;
    const t = now();
    const dpr = Math.min(2, devicePixelRatio || 1), W = innerWidth, H = innerHeight;
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
    layout(W, H);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(6 / 255, 6 / 255, 6 / 255, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (shownAt == null) shownAt = t;
    const ti = t - shownAt;

    // respiration (le vivant) + souris
    const br = reduced ? { x: 0, y: 0 } : { x: 0.16 * Math.sin(t * 0.676) + 0.07 * Math.sin(t * 1.1 + 1), y: 0.12 * Math.sin(t * 0.566 + 2) + 0.05 * Math.sin(t * 0.91) };
    const tilt = reduced ? { x: 0, y: 0 } : { x: ptr.x * 0.6 + br.x, y: ptr.y * 0.6 + br.y };
    stepLight(dt, tilt);

    const D = lay.D, eye = [0, -D * Math.sin(TILT), D * Math.cos(TILT)];
    vp = M4.mul(M4.perspective(FOV, W / H, D * 0.3, D * 3), M4.lookAt(eye, [0, 0, 0], [0, 1, 0]));
    const k = lay.Hw / 235;
    const R = L.lightR0 * lay.Hw * 0.6, Z = L.lightZ * k, D0 = Math.hypot(R, Z), el0 = Math.atan2(Z, R), ln = Math.hypot(lp.x, lp.y) || 1;
    const el = Math.min(1.35, Math.max(0.18, el0 + ts.y * L.elevAmp * L.lightVar));
    const lightPos = [lp.x / ln * D0 * Math.cos(el), lp.y / ln * D0 * Math.cos(el), D0 * Math.sin(el)];
    const light = L.light * k * k * Math.sin(el0) / Math.sin(el);
    const spotPos = [0, 0.35 * lay.Hw, D * 0.55], sl = Math.hypot(...spotPos);
    const P = { ...L, lightPos, light, spotPos, spotDir: spotPos.map(x => -x / sl), spotI: L.spot * k * k * (sl / 300) ** 2,
      spotCosOut: Math.cos(Math.atan(1.4 * CARD.w / sl)), spotCosIn: Math.cos(Math.atan(0.9 * CARD.w / sl)) };
    const crx = -ts.y * L.cardTilt * 0.5, cry = ts.x * L.cardTilt * 0.5;
    gl.enable(gl.DEPTH_TEST);

    for (const c of cards) {
      const p0 = lay.pos[c.i];
      c.hover += ((c.hoverOn ? 1 : 0) - c.hover) * Math.min(1, dt * 6);
      c.press += ((c.pressOn ? 1 : 0) - c.press) * Math.min(1, dt * 14);
      // arrivée : fondu depuis le fond, l'une après l'autre ; départ (le poème) : la carte choisie monte, les autres reculent
      const ui = reduced ? sstep(0, INTRO, ti - c.i * STAGGER) : ease(clamp01((ti - c.i * STAGGER) / INTRO));
      let fade = ui, dz = -30 * (1 - ui) + 3 * c.hover - 1.5 * c.press, ry = Math.PI, lift = 0;
      if (leaving) {
        const u = clamp01((t - leaving.t0) / LEAVE);
        if (c === leaving.c) { dz += 26 * ease(u); fade *= 1 - sstep(0.3, 1, u); }
        else { dz -= 40 * ease(u); fade *= 1 - sstep(0, 0.6, u); }
      }
      if (c.flip) {
        const tf = t - c.flip.t0, u1 = clamp01(tf / FLIP), u2 = clamp01((tf - FLIP - HOLD) / FLIP);
        if (tf > 2 * FLIP + HOLD) { c.flip = null; c.ink = c.labelInk; }
        else if (reduced) c.ink = tf < FLIP + HOLD ? soonInk : c.labelInk;
        else {
          ry = Math.PI + 2 * Math.PI * (ease(u1) + ease(u2));
          lift = 14 * (Math.sin(Math.PI * u1) + Math.sin(Math.PI * u2));
          // l'encre change quand le recto est caché
          c.ink = (u1 > 0.5 && u2 < 0.5) ? soonInk : c.labelInk;
        }
      }
      if (fade < 0.01) continue;
      const G = M4.mul(M4.model(0, 0, 0, p0.x, p0.y, dz + lift), M4.model(crx, cry, 0));
      const sw = reduced ? 0 : L.sway * 0.25;
      const G2 = M4.mul(G, M4.model(sw * Math.sin(t * 0.61 + c.i * 1.7), sw * 1.2 * Math.sin(t * 0.47 + c.i * 2.3), 0));
      const v = c.v;
      const m = M4.mul(G2, M4.model(0, ry, v.jr, v.jx, v.jy, 0));
      card.draw(vp, eye, P, { model: m, lod: 'fine', ink: c.ink, shade: 1, fade, ...v });
      // le paquet : quelques cartes dessous, un peu désalignées (on voit que c'est un jeu) ; dessinées après la
      // carte du dessus : le test de profondeur écarte tout ce qu'elle cache (seuls les bords sont calculés)
      for (let j = c.under.length - 1; j >= 0; j--) {
        const u = c.under[j], mu = M4.mul(G2, M4.model(0, Math.PI, u.jr, u.jx, u.jy, -(c.under.length - j) * PITCH));
        card.draw(vp, eye, P, { model: mu, lod: 'coarse', shade: 0.55 + 0.45 * j / c.under.length, fade, ...u });
      }
      // bouton : rectangle écran de la carte au repos
      const q = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => project(M4.mul(vp, M4.mul(G, M4.model(0, Math.PI, v.jr, v.jx, v.jy, 0))), sx * CARD.w / 2, sy * CARD.h / 2));
      const xs = q.map(a => a[0]), ys = q.map(a => a[1]), b = buttons[c.i];
      Object.assign(b.style, { left: Math.min(...xs) + 'px', top: Math.min(...ys) + 'px', width: (Math.max(...xs) - Math.min(...xs)) + 'px', height: (Math.max(...ys) - Math.min(...ys)) + 'px' });
    }
    if (shownAt === t) opts.onReady?.();
  }
  function start() { if (!raf && visible) { last = 0; raf = requestAnimationFrame(frame); } }
  function stop() { cancelAnimationFrame(raf); raf = 0; }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (visible && !leaving) start(); });

  const api = {
    root, canvas, now,
    get shown() { return visible && !leaving; },
    // retour depuis le champ : le portail revient, les cartes arrivent de nouveau
    show() {
      leaving = null; visible = true; shownAt = null;
      for (const c of cards) { c.flip = null; c.ink = c.labelInk; c.hoverOn = c.pressOn = false; }
      root.classList.remove('off'); root.inert = false; start();
    },
    hide() { visible = false; root.classList.add('off'); root.inert = true; stop(); },
    // tests : toucher une carte par son id
    choose: id => choose(cards.find(c => c.id === id)),
    rect: id => buttons[cards.findIndex(c => c.id === id)].getBoundingClientRect(),
  };
  start();
  return api;
}
