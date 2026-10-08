// Portail (05/10, v2) : la première page, avant tout choix — les gestes, les valeurs et la lumière de la scène des
// cartes (scene.js), pour que tout soit d'un seul monde.
// Arrivée : ETERNEL tapé à la machine en silence (en haut) ; le paquet arrive depuis le fond (comme la scène des
// questions), puis il distribue : chaque carte se soulève, se retourne en l'air et se pose à sa place (le poème
// d'abord) ; la dernière, « le jeu », se retourne sur le paquet (comme une question posée dessus).
// Invitation : une seule carte dans la lumière (lampe en orbite + projecteur sur elle, les autres baissées, qui
// respirent) — d'abord le poème, longtemps, puis la lumière passe lentement d'une carte à l'autre ; la carte
// éclairée corne son coin de temps en temps (une page qu'on va tourner), le poème sautille (touche-moi). Survol ou
// doigt : la lumière va sur la carte visée, qui s'enfonce sous le doigt.
// Choix : le poème fait un tour sur lui-même et se fond dans le fond, les autres reculent et s'effacent (jamais vers
// le noir) ; le champ apparaît, clavier ouvert dans le même geste (la page). Les autres : leur lien (liens d'attente
// pour l'instant : la carte fait un tour, « bientôt », puis un autre tour).
import { createCardRenderer, M4, CARD } from '../cards/cardRenderer.js';
import { loadTypeFont, makeInkMap } from '../cards/ink.js';
import { LOOK } from '../cards/scene.js';
import { createRng } from '../field/rng.js';

// liens de sortie : null = lien d'attente (« bientôt »)
export const LINKS = { lettre: null, livres: 'https://www.amazon.fr/dp/B0DS8RF83H', jeu: null };
const ITEMS = [
  { id: 'poeme', label: 'ton prénom ton poème, par la poste' },
  { id: 'lettre', label: 'une lettre chez toi, chaque mois' },
  { id: 'livres', label: 'mes livres' },
  { id: 'jeu', label: 'le jeu' },
];
const JEU = 3;
const SIG = 'ETERNEL';
// mêmes valeurs que la scène des cartes
// même caméra que la scène des cartes (pas de table : Maxence 05/10)
const FOV = 26 * Math.PI / 180, TILT = 0.22, PITCH = 0.15, DECK = 10;
// donne : une seule carte en l'air à la fois — la suivante quitte le paquet quand la précédente, presque posée, en
// est loin (sinon leurs vols se croisent et elles se traversent)
const INTRO_T = 1.4, DEAL_AT = 0.7, DEAL_T = 1.3, DEAL_GAP = 1.3 * 0.8, FLIP_T = 1.4, HOLD = 2.4, LEAVE_T = 1.3;
// ordre de la donne : du haut vers le bas, le poème d'abord (08/10) ; empilement (ZR) : chaque carte se glisse SOUS
// la précédente — elle se pose d'abord à côté, à plat, puis glisse dessous (rien ne passe jamais à travers une autre
// carte) ; le paquet ne bouge pas
const RANK = [0, 1, 2, 3], ZR = [2, 1, 0, 3];
// la lumière : d'abord le poème, puis chaque carte à son tour (s)
const DWELL = [6.5, 2.8, 2.8];      // les trois cartes seulement (le paquet ne fait pas signe)

const CSS = `
#portal { position: fixed; inset: 0; z-index: 20; background: #060606; transition: opacity .8s ease; touch-action: pinch-zoom; }
#portal.off { opacity: 0; pointer-events: none; }
#portal.leaving { transition-delay: .55s; }
#portal canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
#portal .pt-sig { position: absolute; left: 0; right: 0; text-align: center; white-space: pre; pointer-events: none;
  font: 500 28px/1 'SG Garamond', serif; letter-spacing: .45em; padding-left: .45em; color: rgb(174,174,174); }
#portal .pt-sig span { display: inline-block; }
#portal button { position: absolute; margin: 0; padding: 0; border: 0; background: transparent; color: transparent;
  cursor: pointer; -webkit-tap-highlight-color: transparent; touch-action: pinch-zoom; font-size: 1px; outline: none; }
#portal button:disabled { cursor: default; }
#portal button:focus-visible { outline: 1px solid rgba(255,255,255,.35); outline-offset: 4px; }
`;

const clamp01 = u => Math.min(1, Math.max(0, u));
const sstep = (a, b, x) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const ease = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
const lerp = (a, b, u) => a + (b - a) * u;
const lerpPose = (a, b, u) => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), z: lerp(a.z, b.z, u), rx: lerp(a.rx, b.rx, u), ry: lerp(a.ry, b.ry, u), rz: lerp(a.rz, b.rz, u) });
// petit saut « touche-moi » (celui de la carte blanche)
const hop = ph => 3.2 * sstep(0, 0.16, ph) * (1 - sstep(0.16, 0.45, ph)) + 1.1 * sstep(0.45, 0.57, ph) * (1 - sstep(0.57, 0.85, ph));

// opts : { base, reduced, onPoem() (dans le geste : la page ouvre le clavier), onReady?(), onJeu?() (la page du jeu) }
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

  const t0 = performance.now();
  let frozen = null;                       // captures : horloge figée (seek)
  const now = () => frozen ?? (performance.now() - t0) / 1000;
  const rnd = createRng();
  let capEm = 0.65, baseEm = 0.8, relayout = null;   // relayout : une fois la mise en page définie

  // ---- ETERNEL, tapé lettre à lettre en silence, exactement comme le prénom des gens ensuite (EB Garamond 500,
  // capitales, interlettrage 0,45 em, clarté 0,62, à la place et à la taille du prénom de la scène des cartes) ----
  const fontP = loadTypeFont(base);
  const garP = (async () => {
    try { const ff = new FontFace('SG Garamond', `url(${base}fonts/EBGaramond-500.woff2)`, { weight: '500' }); document.fonts.add(await ff.load()); } catch (e) { /* repli serif */ }
    // hauteur de capitale de la police (em), pour régler la taille comme le prénom
    const c = document.createElement('canvas').getContext('2d'); c.font = "500 100px 'SG Garamond', serif";
    const m = c.measureText('H');
    capEm = (m.actualBoundingBoxAscent || 65) / 100;
    // ligne de base dans une boîte de hauteur 1 em : (1 − (asc + desc)) / 2 + asc
    if (m.fontBoundingBoxAscent) baseEm = (1 - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent) / 100) / 2 + m.fontBoundingBoxAscent / 100;
    relayout?.();
  })();
  garP.then(() => {
    let i = 0;
    const strike = () => {
      if (i >= SIG.length) return;
      const s = document.createElement('span'); s.textContent = SIG[i++];
      sig.appendChild(s);
      setTimeout(strike, reduced ? 0 : rnd.range(90, 190));
    };
    setTimeout(strike, reduced ? 0 : 250);
  });

  // ---- cartes : papier, relief, encre (celles de la scène des cartes) ----
  const [card] = await Promise.all([createCardRenderer(gl, base), fontP]);
  // les valeurs de la scène des cartes ; seule différence : les cartes hors de la lumière sont moins baissées (ici,
  // il faut pouvoir lire les quatre)
  const L = { ...LOOK };
  const variant = () => ({
    seed: rnd() * 100,
    paperXf: [rnd.range(-2.5, 2.5), rnd.range(-1.5, 1.5), rnd() < 0.5 ? 0 : Math.PI, 0],
    logoOff: [rnd.range(-0.15, 0.15), rnd.range(-0.15, 0.15)],
    warp: [rnd.range(0.05, 0.35), rnd.range(-0.2, 0.05), rnd.range(-0.12, 0.12)],
    jx: rnd.range(-0.5, 0.5), jy: rnd.range(-0.4, 0.4), jr: rnd.range(-0.012, 0.012),
  });
  const inkOf = (s, v) => card.makeInk(makeInkMap(s, Math.floor(v.seed * 1000) + 7).canvas);
  let soonInk = null;
  const deck = Array.from({ length: DECK }, variant);
  const cards = ITEMS.map((it, i) => {
    const v = variant();
    const c = { ...it, i, v, ink: inkOf(it.label, v), w: 0, press: 0, curlA: 0, ph: -1, anim: null };
    c.labelInk = c.ink;
    return c;
  });
  cards[JEU].w = 1;

  // ---- disposition : une donne sur une table, pas une grille (Maxence 05/10). Le paquet en bas, un peu de biais ;
  // chaque carte posée de travers (gauche, droite, en alternance), qui recouvre un peu le bord de la précédente
  // (jamais son texte) et y fait son ombre. Biais et décalages tirés à chaque visite, dans des bornes. ----
  let OV = 0.16;                            // part de la carte précédente recouverte (un peu plus si la place manque)
  const Z_STEP = 2.4;                       // mm : posée sur la précédente (gondolages des deux + respiration < 2,4)
  const side0 = rnd() < 0.5 ? -1 : 1;
  // chaque carte tombe où elle tombe : biais et décalage libres (un côté plus souvent que l'autre, jamais une alternance)
  const lie = ITEMS.map((_, i) => {
    if (i === JEU) return { dx: rnd.range(-0.04, 0.04), dy: 0, rz: rnd.range(-0.05, 0.05) };
    const sd = rnd() < 0.5 ? -1 : 1;
    return { dx: sd * rnd.range(0.0, 0.06), dy: rnd.range(-0.04, 0.04), rz: (rnd() < 0.7 ? -sd : sd) * rnd.range(0.015, 0.08) };
  });
  const lay = { W: 1, H: 1, D: 300, slot: [] };
  relayout = () => { if (lay.H > 1) layout(lay.W, lay.H); };
  // ETERNEL : au milieu, entre le haut de l'écran et le coin le plus haut des trois cartes posées — autant d'espace
  // au-dessus de ses capitales qu'entre elles et la carte (Maxence 06/10)
  function placeSig(base) {
    if (Math.abs(base - lay.sigBase) < 0.5) return;
    lay.sigBase = base;
    sig.style.top = (base - baseEm * lay.sigFs).toFixed(1) + 'px';
  }
  // les trois cartes sont le centre de l'attention ; le paquet, qui les a distribuées, en bas de page, entier, « le
  // jeu » lisible. Tout tient dans l'écran (biais compris), cartes à la taille de la scène des cartes ou moins
  function layout(W, H) {
    lay.W = W; lay.H = H;
    const asp = CARD.w / CARD.h, portrait = W < H * 1.1;
    // ETERNEL : capitales centrées à 11 % du haut, hauteur de capitale du prénom de la scène des cartes ; les cartes dessous
    const sigCap = Math.min(52, Math.max(26, 0.052 * H)) * 0.66;
    const top = Math.max(H * (portrait ? 0.115 : 0.14), H * 0.11 + sigCap / 2 + H * 0.035), bot = H * 0.965;
    // les cartes à la taille de celles de la scène des questions (08/10) ; pour tenir dans l'écran, dans l'ordre :
    // moins d'écart avec le paquet (GAPD), le paquet qui sort un peu par le bas (DS : part visible), un peu plus de
    // recouvrement (OV) ; en dernier recours seulement, des cartes plus petites
    let h = W < H ? Math.min(W * 0.80 / asp, H * 0.27) : H * 0.27, GAPD = 0.34, DS = 1.08;
    OV = 0.16;
    const spanOf = () => 1 + 2 * (1 - OV) + 0.14;             // trois cartes qui se recouvrent + marge des biais
    const avail = bot - top;
    if (portrait) {
      const over = () => (spanOf() + GAPD + DS) * h - avail;
      if (over() > 0) GAPD = Math.max(0.18, GAPD - over() / h);
      if (over() > 0) DS = Math.max(0.72, DS - over() / h);
      if (over() > 0) OV = Math.min(0.3, OV + over() / h / 2);
      if (over() > 0) h = avail / (spanOf() + GAPD + DS);
    } else {
      if (h * asp * spanOf() > W * 0.78) OV = Math.min(0.3, 1 - (W * 0.78 / (h * asp) - 1.14) / 2);
      h = Math.min(h, W * 0.78 / (asp * spanOf()), avail / (1.3 + GAPD + DS));
    }
    const span = spanOf();
    const w = h * asp, s = CARD.w / w;
    lay.D = s * (H / 2) / Math.tan(FOV / 2);
    const deckC = bot - h * (DS - 0.53);                      // centre du paquet (son épaisseur dessous)
    const zoneB = deckC - h * (0.5 + GAPD);                   // bas de la zone des trois cartes
    const len = (portrait ? h : w) * (span - 0.14);
    const a0 = portrait ? top + (zoneB - top - len) / 2 : (W - len) / 2;
    lay.slot = ITEMS.map((_, i) => {
      const o = lie[i];
      let px, py;
      if (i === JEU) { px = W / 2 + o.dx * w; py = deckC; }
      else {
        const along = (portrait ? h : w) * (0.5 + i * (1 - OV));
        px = portrait ? W / 2 + o.dx * w : a0 + along + o.dx * w * 0.3;
        py = portrait ? a0 + along + o.dy * h : (top + zoneB) / 2 + o.dy * h + (i % 2 ? 0.08 : -0.08) * h;
      }
      return { x: (px - W / 2) * s, y: (H / 2 - py) * s / Math.cos(TILT), rz: o.rz, z: i === JEU ? 0 : ZR[i] * Z_STEP };
    });
    const fs = sigCap / capEm;
    sig.style.fontSize = fs.toFixed(2) + 'px'; sig.style.lineHeight = '1';
    lay.sigCap = sigCap; lay.sigFs = fs; lay.sigBase = -1;
    placeSig(H * 0.11 + sigCap / 2);                 // en attendant les cartes : capitales centrées à 11 % du haut
  }
  const deckPose = (j, v) => { const s = lay.slot[JEU]; return { x: s.x + v.jx, y: s.y + v.jy, z: j * PITCH, rx: 0, ry: 0, rz: s.rz + v.jr }; };
  // sur le paquet, dos visible, avant la donne (la première donnée au-dessus)
  const onDeckPose = c => deckPose(DECK + (ITEMS.length - 1 - RANK[c.i]), c.v);
  const restPose = c => {
    const s = lay.slot[c.i], z = c.i === JEU ? DECK * PITCH + 1.4 : s.z;   // au-dessus du paquet, sans le toucher (gondolages)
    return { x: s.x + c.v.jx, y: s.y + c.v.jy, z, rx: 0, ry: Math.PI, rz: s.rz + c.v.jr };
  };
  // glissement qui dégage une carte de toutes celles posées au-dessus d'elle (rectangles au repos, biais compris,
  // 2 mm de marge), sans sortir de l'écran : la plus courte des directions essayées. Une carte qui se retourne ne
  // traverse ainsi jamais rien (vérifié : tools/portal-collisions.mjs)
  const rect = (p, flip) => ({ x: p.x, y: p.y, a: flip ? -p.rz : p.rz });
  function overlap(A, B, m) {
    const ax = [[Math.cos(A.a), Math.sin(A.a)], [-Math.sin(A.a), Math.cos(A.a)], [Math.cos(B.a), Math.sin(B.a)], [-Math.sin(B.a), Math.cos(B.a)]];
    const d = [B.x - A.x, B.y - A.y], hx = CARD.w / 2 + m / 2, hy = CARD.h / 2 + m / 2;
    for (const n of ax) {
      const r = R => hx * Math.abs(Math.cos(R.a) * n[0] + Math.sin(R.a) * n[1]) + hy * Math.abs(-Math.sin(R.a) * n[0] + Math.cos(R.a) * n[1]);
      if (Math.abs(d[0] * n[0] + d[1] * n[1]) > r(A) + r(B)) return false;
    }
    return true;
  }
  function slideFor(c) {
    const me = restPose(c), above = [];
    for (const k of cards) if (k !== c && restPose(k).z > me.z) above.push(rect(restPose(k), true));
    if (c.i !== JEU) above.push(rect(deckPose(DECK - 1, deck[DECK - 1]), false));
    const Hw = 2 * lay.D * Math.tan(FOV / 2), Ww = Hw * lay.W / lay.H;
    const fits = (x, y) => Math.abs(x) < Ww / 2 - CARD.w / 2 - 1 && Math.abs(y * Math.cos(TILT)) < Hw / 2 - CARD.h / 2 - 1;
    // la plus courte qui reste dans l'écran ; à défaut (écran court), la plus courte tout court : dépasser un peu
    // du bord vaut mieux que traverser une carte
    let fit = { d: Infinity }, any = { d: Infinity };
    for (let k = 0; k < 24; k++) {
      const a = k * Math.PI / 12, ux = Math.cos(a), uy = Math.sin(a);
      for (let d = 0; d < 120; d += 0.5) {
        const x = me.x + ux * d, y = me.y + uy * d;
        if (!above.some(A => overlap({ x, y, a: -me.rz }, A, 4))) {
          if (d < any.d) any = { x: ux * d, y: uy * d, d };
          if (fits(x, y) && d < fit.d) fit = { x: ux * d, y: uy * d, d };
          break;
        }
      }
    }
    return fit.d < Infinity ? fit : any;
  }

  // respiration propre à chaque carte (phase et rythme), pour qu'elles vivent séparément
  for (const c of cards) { c.bph = rnd() * 6.28; c.bf = rnd.range(0.8, 1.25); }

  // ---- états ----
  let startT = 0, leaving = null, visible = true, raf = 0, last = 0, vp = null, eye = null, lastGesture = -99;
  let hoverIdx = -1, pressIdx = -1, focusIdx = JEU, snap = false;
  const dealAt = c => startT + DEAL_AT + RANK[c.i] * DEAL_GAP;
  const landed = (c, t) => reduced ? t - startT > 0.3 : t >= dealAt(c) + DEAL_T;
  const dealEnd = () => startT + (reduced ? 0.6 : DEAL_AT + (ITEMS.length - 1) * DEAL_GAP + DEAL_T);

  // retournement organique : la carte se soulève d'abord (assez haut pour ne rien toucher en tournant), tourne en
  // douceur avec un léger roulis, puis se repose ; turns = nombre de demi-tours
  function turn(p, u, turns) {
    const up = sstep(0, 0.3, u), down = sstep(0.66, 1, u), sw = Math.sin(Math.PI * sstep(0.08, 0.92, u));
    p.z += (CARD.w / 2 + 10) * (up - down);
    p.ry += turns * Math.PI * sstep(0.18, 0.8, u);
    p.rz += 0.09 * sw; p.rx += -0.1 * sw;
    return p;
  }
  function poseOf(c, t) {
    const rest = restPose(c);
    if (leaving) {
      const u = clamp01((t - leaving.t0) / LEAVE_T), a = leaving.from[c.i];
      if (c !== leaving.c || reduced) return a;
      // on la prend : elle se soulève vers soi, s'incline à peine, et se fond (aucun tour)
      const e = ease(u), sw = Math.sin(Math.PI * Math.min(1, u * 1.4));
      return { ...a, z: a.z + 46 * e, y: a.y + 6 * e, rx: a.rx - 0.08 * sw, rz: a.rz + 0.04 * sw };
    }
    if (reduced) return rest;
    const td = t - dealAt(c);
    if (td < 0) return onDeckPose(c);
    if (td < DEAL_T) {                 // la donne (le tirage de la scène des cartes) : soulevée, retournée en l'air, posée
      const u = td / DEAL_T, a = onDeckPose(c);
      // sous la précédente : posée juste à côté (hors de son bord), puis glissée dessous, à plat
      if (c.i > 0 && c.i < JEU) {
        const pre = { ...rest, ...(lay.W < lay.H * 1.1 ? { y: rest.y - (OV * CARD.h + 4) } : { x: rest.x + OV * CARD.w + 4 }) };
        const S = 0.78;
        if (u >= S) return lerpPose(pre, rest, ease((u - S) / (1 - S)));
        const p = lerpPose(a, pre, sstep(0.08, 0.95, u / S));
        p.ry = 0;
        return turn(p, u / S, 1);
      }
      const p = lerpPose(a, rest, sstep(0.08, 0.95, u));
      p.ry = 0;
      return turn(p, u, 1);
    }
    if (c.anim) {                      // lien d'attente : un demi-tour (son dos, « bientôt »), puis un demi-tour retour
      // une carte recouverte glisse d'abord (à plat) hors de dessous les cartes posées sur elle, puis se retourne ;
      // au retour, elle se repose d'abord, puis glisse à sa place : les trois temps ne se chevauchent jamais
      const tf = t - c.anim.t0, u1 = clamp01(tf / FLIP_T), u2 = clamp01((tf - FLIP_T - HOLD) / FLIP_T);
      const o = c.anim.off, out = sstep(0, 0.2, u1) - sstep(0.82, 1, u2);
      const q = { ...rest, x: rest.x + o.x * out, y: rest.y + o.y * out };
      return turn(turn(q, clamp01((u1 - 0.2) / 0.8), 1), clamp01(u2 / 0.8), 1);
    }
    return rest;
  }

  // ---- choix ----
  function choose(c) {
    const t = now();
    if (!c || leaving || !landed(c, t)) return;
    lastGesture = t;
    if (c.id === 'poeme') {
      leaving = { c, t0: t, from: cards.map(k => poseOf(k, t)) };
      root.classList.add('off', 'leaving'); root.inert = true;
      opts.onPoem?.();                  // dans le geste : la page ouvre le clavier
      setTimeout(() => { if (leaving) { visible = false; stop(); } }, (LEAVE_T + 0.2) * 1000);
      return;
    }
    const url = LINKS[c.id];
    if (url) { location.href = url; return; }
    // le jeu : sa page, dans le même monde (jeu/jeu.js) — proposition ; la page la recouvre, le portail s'arrête
    if (c.id === 'jeu' && opts.onJeu) { opts.onJeu(); return; }
    if (cards.some(k => k.anim)) return;          // une seule carte se retourne à la fois
    if (!soonInk) soonInk = inkOf('bientôt', c.v);
    c.anim = { t0: t, off: slideFor(c) };
  }

  // ---- boutons (accessibles, posés sur les cartes au repos) ----
  const buttons = cards.map(c => {
    const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', c.label); b.textContent = c.label;
    b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hoverIdx = c.i; lastGesture = now(); } });
    b.addEventListener('pointerleave', () => { if (hoverIdx === c.i) hoverIdx = -1; if (pressIdx === c.i) pressIdx = -1; lastGesture = now(); });
    b.addEventListener('pointerdown', () => { pressIdx = c.i; lastGesture = now(); });
    b.addEventListener('pointerup', () => { if (pressIdx === c.i) pressIdx = -1; });
    b.addEventListener('pointercancel', () => { if (pressIdx === c.i) pressIdx = -1; });
    b.addEventListener('focus', () => { hoverIdx = c.i; });
    b.addEventListener('blur', () => { if (hoverIdx === c.i) hoverIdx = -1; });
    b.style.zIndex = String(1 + ZR[c.i]);             // la carte du dessus reçoit le toucher
    b.addEventListener('click', e => { e.stopPropagation(); askOrientation(); choose(c); });
    root.appendChild(b);
    return b;
  });

  // ---- inclinaison : souris (ordinateur) ; gyroscope : Android sans demande, iPhone au tout premier toucher (Safari
  // n'autorise la demande que dans un geste : touchend / click, jamais pointerdown) ----
  const ptr = { x: 0, y: 0 }, tilt = { x: 0, y: 0 }, ts = { x: 0, y: 0 }, breath = { x: 0, y: 0 };
  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || !lay.W) return;
    ptr.x = Math.max(-1, Math.min(1, (e.clientX / lay.W - 0.5) * 2)); ptr.y = Math.max(-1, Math.min(1, -(e.clientY / lay.H - 0.5) * 2));
  });
  const DO = window.DeviceOrientationEvent;
  let orientOn = false, orientAsked = false;
  function onOrient(e) {
    if (e.beta == null || e.gamma == null) return;
    ptr.x = Math.max(-1, Math.min(1, e.gamma / 25)); ptr.y = Math.max(-1, Math.min(1, -(e.beta - 50) / 25));
  }
  function listenOrient() { if (!orientOn) { orientOn = true; addEventListener('deviceorientation', onOrient); } }
  function askOrientation() {
    if (orientAsked || !DO || typeof DO.requestPermission !== 'function') return;
    orientAsked = true;
    DO.requestPermission().then(r => { if (r === 'granted') listenOrient(); }).catch(() => { orientAsked = false; });
  }
  if (DO && typeof DO.requestPermission !== 'function') listenOrient();
  root.addEventListener('touchend', askOrientation, { passive: true });
  root.addEventListener('click', askOrientation);
  // lampe (manière 1) : stepLight de la scène des cartes
  const lp = { x: Math.cos(L.lightAz), y: Math.sin(L.lightAz), vx: 0, vy: 0 };
  function stepLight(dt) {
    const kk = Math.min(1, dt * 3); ts.x += (tilt.x - ts.x) * kk; ts.y += (tilt.y - ts.y) * kk;
    const ax = (tilt.x + breath.x) * L.lightVar;
    let tx = Math.cos(L.lightAz) + L.tiltAmp * ax, ty = Math.sin(L.lightAz);
    const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const w = 2.2, z = 0.85;
    for (const [k, v, tg] of [['x', 'vx', tx], ['y', 'vy', ty]]) {
      const acc = -2 * z * w * lp[v] - w * w * (lp[k] - tg);
      lp[v] += acc * dt; lp[k] += lp[v] * dt;
    }
  }
  // la lumière va d'une carte à l'autre en douceur (ressort amorti)
  const ap = { x: 0, y: 0, vx: 0, vy: 0, init: false };

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

    // respiration (valeurs de la scène des cartes) + souris / téléphone
    const br = reduced ? { x: 0, y: 0 } : { x: 0.42 * Math.sin(t * 0.52) + 0.16 * Math.sin(t * 0.97 + 1), y: 0.32 * Math.sin(t * 0.41 + 2) + 0.12 * Math.sin(t * 0.83) };
    breath.x = br.x; breath.y = br.y;
    tilt.x = Math.max(-1, Math.min(1, ptr.x + 0.4 * br.x)); tilt.y = Math.max(-1, Math.min(1, ptr.y + 0.4 * br.y));
    stepLight(dt);

    // carte dans la lumière : visée (survol, doigt) ; sinon, pendant la donne le paquet, puis le cycle (le poème
    // d'abord et plus longtemps), repris au poème après chaque geste
    const dEnd = dealEnd();
    for (const c of cards) c.ph = -1;
    if (pressIdx >= 0) focusIdx = pressIdx;
    else if (hoverIdx >= 0) focusIdx = hoverIdx;
    else if (leaving) focusIdx = leaving.c.i;
    else if (t < dEnd) focusIdx = JEU;
    else {
      const total = DWELL.reduce((a, b) => a + b, 0);
      let ph = Math.max(0, t - Math.max(dEnd, lastGesture + 1.5)) % total;
      focusIdx = 0; while (ph > DWELL[focusIdx]) { ph -= DWELL[focusIdx]; focusIdx++; }
      cards[focusIdx].ph = ph;
    }
    const fs = lay.slot[focusIdx];
    if (!ap.init || snap) { ap.x = fs.x; ap.y = fs.y; ap.vx = ap.vy = 0; ap.init = true; }
    { const w = reduced ? 30 : 2.0;
      for (const [k, v, tg] of [['x', 'vx', fs.x], ['y', 'vy', fs.y]]) { const acc = -2 * w * ap[v] - w * w * (ap[k] - tg); ap[v] += acc * dt; ap[k] += ap[v] * dt; } }

    const D = lay.D;
    eye = [0, -D * Math.sin(TILT), D * Math.cos(TILT)];
    vp = M4.mul(M4.perspective(FOV, W / H, D * 0.3, D * 3), M4.lookAt(eye, [0, 0, 0], [0, 1, 0]));
    // lumière : celle de la scène des cartes (mêmes formules, rapportées à l'écran) ; la lampe en orbite autour du
    // milieu (toutes les cartes se lisent), le projecteur sur la carte éclairée (rapporté à la taille d'une carte)
    const Hw = 2 * D * Math.tan(FOV / 2), k = Hw / 235;
    const R = L.lightR0 * Hw, Z = L.lightZ * k, D0 = Math.hypot(R, Z), el0 = Math.atan2(Z, R), ln = Math.hypot(lp.x, lp.y) || 1;
    const el = Math.min(1.35, Math.max(0.18, el0 + (ts.y + breath.y) * L.elevAmp * L.lightVar));
    const lightPos = [lp.x / ln * D0 * Math.cos(el), lp.y / ln * D0 * Math.cos(el), D0 * Math.sin(el)];
    const light = L.light * k * k * Math.sin(el0) / Math.sin(el);
    const ref = CARD.h / 0.27, refD = ref / (2 * Math.tan(FOV / 2)), ks = ref / 235;
    // flaque de lumière douce qui glisse sur la carte éclairée (celle de la scène des cartes) : respiration + inclinaison
    const gx = Math.max(-1, Math.min(1, breath.x + ts.x)), gy = Math.max(-1, Math.min(1, breath.y + ts.y));
    const tgt = [ap.x + gx * 0.42 * CARD.w, ap.y + gy * 0.4 * CARD.h, 0];
    const spotPos = [tgt[0] - gx * 0.08 * ref, tgt[1] + 0.12 * ref, refD * 0.55];
    const sd = [tgt[0] - spotPos[0], tgt[1] - spotPos[1], tgt[2] - spotPos[2]], sl = Math.hypot(...sd);
    // pas de projecteur ici (« lampe de poche », Maxence 05/10) : la lampe seule
    const P = { ...L, lightPos, light, spotPos, spotDir: sd.map(x => x / sl), spotI: 0,
      spotCosOut: Math.cos(Math.atan(L.poolR * CARD.w / sl)), spotCosIn: Math.cos(Math.atan(0.12 * CARD.w / sl)) };

    // la carte éclairée s'incline (souris / téléphone), les autres respirent et sont baissées (group de la scène) ;
    // pendant la donne, tout est posé à plat (rien ne saute quand une carte se pose), puis la vie revient en douceur
    const live = reduced ? 0 : sstep(dEnd, dEnd + 1.6, t);
    const crx = -ts.y * L.cardTilt, cry = ts.x * L.cardTilt;
    // posées : la table entière s'incline (souris / téléphone) ; chaque carte respire à peine, à son rythme (ce qui
    // les distingue), sans jamais toucher celle qui la recouvre
    const Gtable = M4.model(crx * 0.35 * live, cry * 0.35 * live, 0);
    const group = (px, py, ph, wt, f = 1) => {
      const sw = 0.012, tt = t * f;
      const rx = sw * (0.6 * Math.sin(tt * 0.61 + ph) + 0.4 * Math.sin(tt * 1.37 + 2.1 * ph)) * live;
      const ry = sw * (0.6 * Math.sin(tt * 0.47 + 1.7 * ph) + 0.4 * Math.sin(tt * 1.13 + 0.6 * ph)) * live;
      return M4.mul(M4.mul(M4.model(0, 0, 0, px, py, 0), M4.model(rx, ry, 0)), M4.model(0, 0, 0, -px, -py, 0));   // la table : dans Gin
    };
    // arrivée : fondu depuis le fond + petite montée (le paquet de la scène des cartes) ; départ : recul et fondu
    const intro = reduced ? sstep(0, 0.8, t - startT) : ease(clamp01((t - startT) / INTRO_T));
    const lu = leaving ? clamp01((t - leaving.t0) / LEAVE_T) : 0;
    const away = leaving ? ease(clamp01(lu / 0.75)) : 0;
    const recede = G => M4.mul(M4.model(0, 0, 0, 0, 6 * away, -140 * away), G);
    const Gin = M4.mul(M4.model(0, 0, 0, 0, 0, -30 * (1 - intro)), Gtable);
    gl.enable(gl.DEPTH_TEST);
    const model = (G, p) => M4.mul(G, M4.model(p.rx, p.ry, p.rz, p.x, p.y, p.z));

    let topMin = 1e9;
    for (const c of cards) {
      c.w += ((c.i === focusIdx ? 1 : 0) - c.w) * (snap ? 1 : Math.min(1, dt * (reduced ? 20 : 2.2)));
      c.press += ((pressIdx === c.i ? 1 : 0) - c.press) * Math.min(1, dt * 14);
      if (c.anim && t - c.anim.t0 > 2 * FLIP_T + HOLD + 0.05) c.anim = null;
    }
    const jeu = cards[JEU], sj = lay.slot[JEU];
    const Gdeck0 = M4.mul(Gin, group(sj.x, sj.y, jeu.bph, leaving ? 0 : jeu.w, jeu.bf));
    const Gdeck = leaving && leaving.c !== jeu ? recede(Gdeck0) : Gdeck0;

    for (const c of cards) {
      const s = lay.slot[c.i];
      let p = poseOf(c, t);
      const onDeck = !reduced && !leaving && t < dealAt(c);
      // la carte éclairée, posée : coin corné de temps en temps (une page qu'on va tourner) ; le poème sautille
      let curlOn = 0, dz = 0;
      if (!leaving && !c.anim && c.ph >= 0 && !reduced) {
        const ph = c.ph;
        curlOn = c.i === 0 ? ((ph > 2.2 && ph < 3.6) || (ph > 5.0 && ph < 6.2) ? 1 : 0) : (ph > 0.9 && ph < 2.2 ? 1 : 0);
        if (c.i === 0 && ph > 0.8 && ph < 0.8 + 4.5 * 2) dz = hop((ph - 0.8) % 4.5);
      }
      c.curlA += (curlOn - c.curlA) * (snap ? 1 : Math.min(1, dt * 1.5));
      p = { ...p, z: p.z + dz - 0.5 * c.press };   // s'enfonce à peine (jamais dans la carte dessous)
      let fade = intro, G;
      if (onDeck || c.i === JEU) G = c === leaving?.c ? Gdeck0 : Gdeck;
      else G = M4.mul(Gin, group(s.x, s.y, c.bph, leaving ? 0 : c.w, c.bf));
      if (leaving) {
        if (c === leaving.c) fade *= 1 - sstep(0.45, 1, lu);
        else { fade *= 1 - away; if (c.i !== JEU) G = recede(G); }
      }
      // l'encre change quand le recto est caché (tour « bientôt »)
      // « bientôt » est tapé au dos (sur le logo gaufré), visible le temps du demi-tour
      const ink = c.labelInk, inkBack = c.anim ? soonInk : null;
      const dim = 1;
      // ombre de la carte posée par-dessus (la suivante de la donne)
      const nx = c.i > 0 && c.i < JEU ? cards[c.i - 1] : null;
      // l'ombre suit la carte telle qu'elle est dessinée (table inclinée, respiration : image précédente) — sinon, en
      // inclinant le téléphone, l'ombre restait en place et dessinait le contour de la carte à côté de la vraie (06/10)
      const occ = nx && !leaving && landed(nx, t) && !nx.anim && nx.lastM ? { m: nx.lastM } : null;
      const Mc = model(G, p); c.lastM = Mc;
      if (fade > 0.01) card.draw(vp, eye, P, { model: Mc, lod: 'fine', ink, inkBack, shade: dim, fade, ...c.v, curl: [-1, 1, -0.3 * c.curlA], occ });
      // bouton : rectangle écran de la carte au repos
      const rp = restPose(c);
      const q = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => project(M4.mul(vp, M4.model(0, Math.PI, rp.rz, rp.x, rp.y, rp.z)), sx * CARD.w / 2, sy * CARD.h / 2));
      const xs = q.map(a => a[0]), ys = q.map(a => a[1]), b = buttons[c.i], bx = Math.min(...xs), by = Math.min(...ys);
      // zone de toucher = la carte elle-même (de biais), pas son rectangle englobant
      Object.assign(b.style, { left: bx + 'px', top: by + 'px', width: (Math.max(...xs) - bx) + 'px', height: (Math.max(...ys) - by) + 'px',
        clipPath: `polygon(${q.map(([x, y]) => `${(x - bx).toFixed(1)}px ${(y - by).toFixed(1)}px`).join(',')})` });
      b.disabled = !landed(c, t) || !!leaving;
      if (c.i !== JEU) topMin = Math.min(topMin, by);
    }
    if (topMin < 1e8 && lay.sigFs) placeSig((topMin + lay.sigCap) / 2);   // haut des capitales = (topMin − cap) / 2
    // le paquet sous « le jeu » : dos visible ; dessiné après les cartes (le test de profondeur écarte ce qu'elles
    // cachent) ; ombre de la carte posée dessus
    const fadeDeck = intro * (leaving && leaving.c !== jeu ? 1 - away : 1);
    if (fadeDeck > 0.01) {
      const jp = poseOf(jeu, t);
      const occ = landed(jeu, t) && !leaving && !jeu.anim ? { x: jp.x, y: jp.y, z: jp.z, rz: jp.rz } : null;
      const dimD = 1;
      for (let j = DECK - 1; j >= 0; j--) {
        const v = deck[j];
        card.draw(vp, eye, P, { model: model(Gdeck, deckPose(j, v)), lod: j === DECK - 1 ? 'fine' : 'coarse', shade: (0.55 + 0.45 * (j + 1) / DECK) * dimD, fade: fadeDeck, occ, ...v });
      }
    }
    snap = false;
    if (!api.readyFired) { api.readyFired = true; opts.onReady?.(); }
  }
  function start() { if (!raf && visible) { last = 0; raf = requestAnimationFrame(frame); } }
  function stop() { cancelAnimationFrame(raf); raf = 0; }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (visible && !leaving) start(); });

  const api = {
    root, canvas, now, readyFired: false,
    get shown() { return visible && !leaving; },
    // retour depuis le champ : le paquet revient et distribue de nouveau
    show() {
      leaving = null; visible = true; startT = now(); lastGesture = -99; hoverIdx = pressIdx = -1; focusIdx = JEU;
      for (const c of cards) { c.anim = null; c.curlA = 0; c.press = 0; c.w = c.i === JEU ? 1 : 0; }
      root.classList.remove('off', 'leaving'); root.inert = false; start();
    },
    hide() { visible = false; root.classList.add('off'); root.inert = true; stop(); },
    // tests
    choose: id => choose(cards.find(c => c.id === id)),
    rect: id => buttons[cards.findIndex(c => c.id === id)].getBoundingClientRect(),
    // captures (rendu logiciel très lent) : aller à l'instant s de la page, état lissé atteint d'un coup
    seek: s => { frozen = startT + s; snap = true; },
    // vérification géométrique : matrices des cartes (et de la carte du dessus du paquet) à l'instant s, avec, au
    // besoin, un lien d'attente lancé à l'instant a0 sur la carte anim (respiration ignorée : < 0,5 mm)
    probe(s, anim = null, a0 = 0) {
      const t = startT + s, keep = cards.map(c => c.anim);
      cards.forEach(c => { c.anim = c.id === anim ? { t0: startT + a0, off: slideFor(c) } : null; });
      const out = cards.map(c => ({ id: c.id, pile: !reduced && t - dealAt(c) < 0.06 * DEAL_T, m: Array.from(M4.model(...(p => [p.rx, p.ry, p.rz, p.x, p.y, p.z])(poseOf(c, t)))) }));
      out.push({ id: 'paquet', pile: true, m: Array.from(M4.model(...(p => [p.rx, p.ry, p.rz, p.x, p.y, p.z])(deckPose(DECK - 1, deck[DECK - 1])))) });
      cards.forEach((c, i) => { c.anim = keep[i]; });
      return out;
    },
    run: () => { frozen = null; },
    state: () => ({ t: now() - startT, focus: ITEMS[focusIdx].id, dealt: now() >= dealEnd(), leaving: !!leaving }),
  };
  startT = now();
  start();
  return api;
}
