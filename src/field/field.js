// Champ de mots (simulation CPU, sans GL) : flux continu. Chaque mot naît petit au fond (fondu),
// la caméra avance à vitesse constante (les mots proches défilent plus vite : vraie parallaxe)
// et un mot ne meurt qu'en quittant l'écran. La répartition par
// tranche (≈ 8/42/50 %) émerge de la géométrie du flux et reste stationnaire.
// La projection des lettres se fait dans le shader ; ici on ne projette que les boîtes des mots.
import { NAMES } from './names.js';
import { viewOf, sigmaPx, psiOf } from './camera.js';
import { displayCase } from '../text/normalize.js';
import { letterParams } from './light.js';

// tranches : seulement pour mesurer la répartition (un mot les traverse toutes)
export const TIERS = [
  { key: 'proche', z0: 2.8, z1: 4.6, share: 0.08 },
  { key: 'moyen', z0: 6, z1: 14, share: 0.42 },
  { key: 'lointain', z0: 16, z1: 32, share: 0.50 },
];
export const SPEED = 0.05;          // avance de la caméra, monde/s (prototype) : z ← z − SPEED·t
export const ASPECT = 16 / 9;       // cadre virtuel paysage ; en portrait on n'en voit que le centre
export const FADE_IN = 4.5;         // s
export const Z_BIRTH = [30, 34];    // naissance au fond
export const Z_END = [2.3, 2.8];    // fin du flux (n'arrive qu'au centre, dans la zone vide : invisible)
const CENTER_BIAS = 0.4;            // part des naissances près du point de fuite (→ futurs mots proches)
const OCC_MAX = 0.86;               // effacement max du mot le plus lointain d'un recouvrement
const SEP_SPEED = 1;                // px/s, profondeurs voisines
const SEP_TAU = 1.8;                // s
const SEP_RATIO = 1.3;              // écart de profondeur < 30 %
const ZONE_TAU = 1.0;               // s
const S_BASE = 0.356;               // taille monde d'un em (prototype)
export const WARMUP = 700;          // s de champ « vécu » avant l'ouverture

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

export const wordCount = (w) => Math.round(40 + 38 * clamp01((w - 390) / 610));
// interlettrage : plus d'air pour les petits mots lointains, moins pour les grands proches
export const trackEm = (pxEm) => 0.08 + 0.06 * (1 - sm(14, 90, pxEm)); // ≈ 0,1 em du prototype
// gris par profondeur (prototype) ; proche plus sombre car flou, très lointain atténué
export function grayOf(z) {
  // courbe du prototype
  const g = z > 16 ? 0.20 : z > 8 ? 0.20 + 0.24 * sm(16, 8, z) : 0.44 - 0.18 * sm(8, 3.4, z);
  return g * (1 - 0.6 * sm(28, 34, z));
}

export const STRIDE = 24; // floats par lettre instanciée

// opts : { rng, caseMode, glyphs (atlas.glyphs), capHeight }
export function createField(opts) {
  const { rng, caseMode, glyphs, capHeight } = opts;
  const lower = caseMode === 'lower';
  const yTop = -(0.5 * capHeight + 0.05), yBot = 0.5 * capHeight + (lower ? 0.25 : 0.05);
  let view = null, ui = 1, offX = 0, realW = 0;
  const sField = 1;
  const cam = { x: 0, y: 0 };
  const zone = { x0: 0, y0: 0, x1: 0, y1: 0, fw: 70 };
  const words = [];
  let order = [];
  let time = 0;

  // ---------- géométrie écran d'un mot (boîte, flou compris) ----------
  function geom(w) {
    const { f, cx, cy } = view;
    const Xr = w.X - cam.x, Yr = w.Y - cam.y;
    w.psi = psiOf(Xr, w.z);
    w.pxEm = f * w.S / w.z;
    w.track = trackEm(w.pxEm);
    w.half = 0.5 * (w.advSum + w.track * (w.adv.length - 1)) * w.S;
    const c = Math.cos(w.psi), s = Math.sin(w.psi);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (let e = -1; e <= 1; e += 2) {
      const u = e * w.half, zE = w.z - s * u, k = f / zE, m = 1.5 * sigmaPx(f, zE);
      const x = cx + (Xr + c * u) * k;
      x0 = Math.min(x0, x - m); x1 = Math.max(x1, x + m);
      y0 = Math.min(y0, cy + (Yr + yTop * w.S) * k - m);
      y1 = Math.max(y1, cy + (Yr + yBot * w.S) * k + m);
    }
    w.box[0] = x0; w.box[1] = y0; w.box[2] = x1; w.box[3] = y1;
  }

  const area = (b) => Math.max(0, b[2] - b[0]) * Math.max(0, b[3] - b[1]);
  const inter = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  const interPad = (a, b, m) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0]) + m) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]) + m);
  const offscreen = (b, m = 0) => b[2] < -m || b[0] > view.w + m || b[3] < -m || b[1] > view.h + m;
  // hors de l'écran réel (portrait : seule la bande centrale du cadre virtuel est visible)
  const offReal = (b) => b[2] < -offX || b[0] > realW - offX || b[3] < 0 || b[1] > view.h;
  // les petits mots lointains peuvent frôler le prénom ; les plus grands s'effacent dans la zone
  function zoneTarget(w) {
    const b = w.box;
    const gap = (s) => {
      const cx = (zone.x0 + zone.x1) / 2, cy = (zone.y0 + zone.y1) / 2, hw = (zone.x1 - zone.x0) / 2 * s, hh = (zone.y1 - zone.y0) / 2 * s;
      return Math.max(cx - hw - b[2], b[0] - cx - hw, cy - hh - b[3], b[1] - cy - hh);
    };
    const outer = sm(-0.25 * zone.fw, zone.fw, gap(1));          // grands mots : toute la zone
    const inner = sm(-0.2 * zone.fw, 0.6 * zone.fw, gap(0.6));  // tous : cœur de la zone
    return inner * (1 - (1 - outer) * sm(10, 20, w.pxEm));
  }

  // ---------- naissance ----------
  function pickName(short) {
    const used = new Set(words.map((w) => w.name));
    for (let i = 0; i < 40; i++) {
      const n = rng.pick(NAMES);
      if (used.has(n)) continue;
      if (short && n.length > 6) continue;    // futurs mots proches : courts (très grands à l'écran)
      return n;
    }
    return rng.pick(NAMES);
  }
  const tierOf = (z) => (z < 5.3 ? 0 : z < 15 ? 1 : 2);

  // warm : état initial (profondeur quelconque, déjà visible) ; sinon naissance au fond, en fondu
  function spawn(w, warm) {
    w.z = warm ? Z_END[1] * Math.pow(Z_BIRTH[1] / Z_END[1], rng()) : rng.range(Z_BIRTH[0], Z_BIRTH[1]);
    w.S = S_BASE * sField * rng.range(0.9, 1.15);
    w.ink = rng.range(0.92, 1.08);
    w.dvx = rng.range(-1, 1) * 0.01 * sField;
    w.dvy = rng.range(-1, 1) * 0.006 * sField;
    w.sx = 0; w.sy = 0; w.tsx = 0; w.tsy = 0;
    w.occ = 0; w.occT = 0; w.tauOcc = rng.range(1.2, 1.8);
    w.age = warm ? 1e4 : 0;
    w.box = w.box || [0, 0, 0, 0];

    // position écran : uniforme, ou près du point de fuite (ces mots deviendront proches : noms courts)
    const { f, cx, cy } = view;
    // écran étroit : la zone vide avale le centre ; régulation : moins de naissances centrales
    // quand beaucoup de mots sont déjà cachés dans la zone (nombre de mots visibles stable)
    const hidden = words.reduce((n, o) => n + (o !== w && o.zoneA != null && o.zoneA < 0.3 ? 1 : 0), 0);
    const reg = Math.min(1.5, Math.max(0, 3 - 2.5 * hidden / (0.28 * words.length)));
    const central = rng() < CENTER_BIAS * reg;
    w.name = pickName(central);
    w.text = displayCase(w.name, caseMode);
    w.chars = [...w.text];
    w.adv = w.chars.map((ch) => glyphs[ch]?.adv ?? 0.6);
    w.advSum = w.adv.reduce((a, b) => a + b, 0);
    w.jit = w.chars.map(() => rng.range(-0.015, 0.015));
    w.lp = w.chars.map(() => letterParams(rng));
    let best = null;
    for (let i = 0; i < 12; i++) {
      let u, v;
      if (central) { const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 0.13; u = 0.5 + r * Math.cos(a); v = 0.45 + r * Math.sin(a) * view.w / view.h; }
      else { u = rng.range(-0.02, 1.02); v = rng.range(0, 1); }
      w.X = cam.x + (u * view.w - cx) * w.z / f;
      w.Y = cam.y + (v * view.h - cy) * w.z / f;
      geom(w);
      const a = area(w.box) || 1;
      let score = offscreen(w.box, -10) ? 10 : 0;
      for (const o of words) {
        if (o === w || o.alpha == null) continue;
        const near = Math.max(o.z, w.z) / Math.min(o.z, w.z) < SEP_RATIO;
        score += inter(w.box, o.box) / a * (near ? 1 : 0.2) * (0.3 + o.alpha);
      }
      if (!best || score < best.score) best = { score, X: w.X, Y: w.Y };
    }
    w.X = best.X; w.Y = best.Y;
    geom(w);
    w.zoneA = zoneTarget(w);
    w.alpha = warm ? w.zoneA : 0;
    w.tier = tierOf(w.z);
  }

  // ---------- dimensionnement : nombre de mots par tranche ----------
  function resize(w, h) {
    const first = !view;
    // portrait : même champ qu'en paysage (cadre virtuel ASPECT), recadré au centre
    const vw = Math.max(w, h * ASPECT);
    view = viewOf(vw, h);
    offX = (w - vw) / 2; realW = w;
    ui = Math.min(1.3, Math.max(0.6, vw / 1440));
    if (first) setZone(null);
    const N = wordCount(vw);
    if (words.length > N) words.length = N;
    while (words.length < N) { const nw = {}; words.push(nw); spawn(nw, first); }
    for (const x of words) geom(x);
    if (first) for (let s = 0; s < WARMUP; s += 0.5) step(0.5, true);
  }

  // zone vide autour du prénom (rectangle px) ; null → zone de repos (prénom vide)
  function setZone(r) {
    if (r) r = { ...r, x0: r.x0 - offX, x1: r.x1 - offX };   // px écran réel → cadre virtuel
    const kw = 260 * ui, kh = 110 * ui;
    const cx = view.cx, cy = view.cy;
    const hw = Math.min(0.47 * view.w, Math.max(Math.min(kw, 0.3 * view.w), r ? (r.x1 - r.x0) / 2 + r.pad : 0));
    const hh = Math.max(kh, r ? (r.y1 - r.y0) / 2 + r.pad * 0.8 : 0);
    const ccy = r ? (r.y0 + r.y1) / 2 : cy;
    zone.x0 = cx - hw; zone.x1 = cx + hw; zone.y0 = ccy - hh; zone.y1 = ccy + hh; zone.fw = 70 * ui;
  }

  // ---------- pas de simulation ----------
  // speed : facteur du courant (le champ ralentit un instant à chaque frappe)
  function step(dt, motion = true, speed = 1) {
    time += dt;
    const { f } = view;
    for (const w of words) {
      if (motion) {
        w.z -= SPEED * Math.sqrt(w.z / 12) * speed * dt;   // ∝ √z : parallaxe nette (proche ≈ 3× plus rapide à l'écran) sans vider le premier plan
        w.X += (w.dvx * speed + w.sx * w.z / f) * dt;
        w.Y += (w.dvy * speed + w.sy * w.z / f) * dt;
      }
      w.age += dt;
      geom(w);
      // mort : seulement en quittant l'écran (ou au bout du flux, au centre, déjà effacé par la zone)
      if (offscreen(w.box, 24) || w.z <= Z_END[0]) spawn(w, false);
      w.tier = tierOf(w.z);
      const zk = 1 - Math.exp(-dt / ZONE_TAU);
      w.zoneA += (zoneTarget(w) - w.zoneA) * zk;
      w.base = sm(0, FADE_IN, w.age) * sm(Z_END[0], Z_END[1], w.z) * w.zoneA;
      w.occT = 0; w.tsx = 0; w.tsy = 0;
    }
    // loin → proche
    order = words.slice().sort((a, b) => b.z - a.z);
    for (let i = 0; i < order.length; i++) {
      const a = order[i], aa = area(a.box) || 1;
      for (let j = i + 1; j < order.length; j++) {
        const b = order[j];            // b est plus proche que a
        const m = 0.15 * Math.min(a.pxEm, b.pxEm); // petite marge : lettres collées = recouvrement
        const I = interPad(a.box, b.box, m);
        if (I > 0) a.occT = Math.max(a.occT, OCC_MAX * sm(0.01, 0.2, I / aa) * b.base);
        if (a.z / b.z < SEP_RATIO) {
          if (I > 0 && a.base > 0.05 && b.base > 0.05) {
            let dx = (a.box[0] + a.box[2] - b.box[0] - b.box[2]) / 2, dy = (a.box[1] + a.box[3] - b.box[1] - b.box[3]) / 2;
            const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
            a.tsx += dx * SEP_SPEED; a.tsy += dy * SEP_SPEED; b.tsx -= dx * SEP_SPEED; b.tsy -= dy * SEP_SPEED;
          }
        }
      }
    }
    const sk = 1 - Math.exp(-dt / SEP_TAU);
    for (const w of words) {
      const l = Math.hypot(w.tsx, w.tsy);
      if (l > SEP_SPEED * 1.5) { w.tsx *= SEP_SPEED * 1.5 / l; w.tsy *= SEP_SPEED * 1.5 / l; }
      w.sx += (w.tsx - w.sx) * sk; w.sy += (w.tsy - w.sy) * sk;
      w.occ += (w.occT - w.occ) * (1 - Math.exp(-dt / w.tauOcc));
      w.alpha = w.base * (1 - w.occ);
    }
  }

  // ---------- instances (une par lettre), triées loin → proche ----------
  // light (optionnel) : createLight() ; t : temps ; c : centre du prénom (px)
  let buf = new Float32Array(1024 * STRIDE);
  let litCount = 0;
  function emit(light, t = 0, c = null) {
    let n = 0;
    litCount = 0;
    const lit = light && light.active;
    const cx = c ? c.x - offX : view.cx, cy = c ? c.y : view.cy, hw = realW / 2, hh = view.h / 2;
    for (const w of order) {
      if (w.alpha < 0.004 || offReal(w.box)) continue;
      if ((n + w.chars.length) * STRIDE > buf.length) { const nb = new Float32Array(buf.length * 2); nb.set(buf); buf = nb; }
      const gray = grayOf(w.z) * w.ink;
      let pen = -w.half;
      for (let i = 0; i < w.chars.length; i++) {
        const g = glyphs[w.chars[i]], o = n * STRIDE;
        buf[o] = w.X; buf[o + 1] = w.Y; buf[o + 2] = w.z; buf[o + 3] = w.psi;
        buf[o + 4] = pen; buf[o + 5] = (w.jit[i] + 0.5 * capHeight) * w.S; buf[o + 6] = w.S; buf[o + 7] = w.alpha;
        buf[o + 8] = g.u0; buf[o + 9] = g.v0; buf[o + 10] = g.u1; buf[o + 11] = g.v1;
        buf[o + 12] = g.x0; buf[o + 13] = g.y0; buf[o + 14] = g.x1; buf[o + 15] = g.y1;
        let L = 0, stretch = 1, theta = 0;
        if (lit) {
          // position écran approximative de la lettre (pour l'onde, l'anneau et la traînée)
          const fx = (pen + w.half + 0.5 * w.adv[i] * w.S) / (2 * w.half || 1);
          const lx = w.box[0] + fx * (w.box[2] - w.box[0]), ly = (w.box[1] + w.box[3]) / 2;
          const dn = Math.min(1, Math.hypot((lx - cx) / hw, (ly - cy) / hh) / Math.SQRT2);
          const lp = w.lp[i];
          L = light.level(w.chars[i], lp, dn, w.z, t, (lx - cx) / hw, (ly - cy) / hh);
          if (L > 0.01) {
            litCount++;
            // traînée : part de la verticale, penche vers l'extérieur (±50°), longueur ∝ distance × intensité
            stretch = 1.5 + 3.4 * lp.trail * dn * L;
            theta = 0.87 * Math.max(-1, Math.min(1, (lx - cx) / hw)) + 0.06 * Math.sin(lp.sf * t + lp.sp);
          }
        }
        buf[o + 16] = gray; buf[o + 17] = L; buf[o + 18] = stretch; buf[o + 19] = theta;
        buf[o + 20] = w.lp[i].seed; buf[o + 21] = 0; buf[o + 22] = 0; buf[o + 23] = 0;
        pen += (w.adv[i] + w.track) * w.S;
        n++;
      }
    }
    return { data: buf, count: n };
  }

  // ---------- mesures ----------
  function stats() {
    const vis = words.filter((w) => w.alpha > 0.1 && !offReal(w.box));
    const byTier = TIERS.map((_, t) => vis.filter((w) => w.tier === t).length);
    let overlaps = 0;
    const net = vis.filter((w) => w.alpha > 0.3);
    for (let i = 0; i < net.length; i++) for (let j = i + 1; j < net.length; j++) {
      const I = inter(net[i].box, net[j].box);
      if (I > 0.05 * Math.min(area(net[i].box), area(net[j].box))) overlaps++;
    }
    return { t: +time.toFixed(1), total: words.length, visible: vis.length, proche: byTier[0], moyen: byTier[1], lointain: byTier[2], overlaps };
  }

  function advance(seconds, dt = 0.5) { for (let s = 0; s < seconds; s += dt) step(dt, true); }

  return { resize, step, emit, setZone, stats, advance, cam, words, get view() { return view; }, get zone() { return zone; }, get litCount() { return litCount; }, get offX() { return offX; } };
}
