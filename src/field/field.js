// Champ de mots (simulation CPU, sans GL) : tranches stationnaires, zoom exponentiel lent,
// naissance/mort en fondu, zone vide autour du prénom, anti-chevauchement.
// La projection des lettres se fait dans le shader ; ici on ne projette que les boîtes des mots.
import { NAMES } from './names.js';
import { viewOf, sigmaPx, psiOf } from './camera.js';
import { displayCase } from '../text/normalize.js';

// tranches permanentes : chaque emplacement renaît dans sa tranche → répartition stationnaire
export const TIERS = [
  { key: 'proche', z0: 2.8, z1: 4.6, share: 0.08 },
  { key: 'moyen', z0: 6, z1: 14, share: 0.42 },
  { key: 'lointain', z0: 16, z1: 32, share: 0.50 },
];
export const ZOOM = 0.004;          // /s : z ← z·e^(−ZOOM·t)
export const FADE_IN = 4.5;         // s
export const FADE_OUT = 4.5;        // s, avant d'atteindre le bord proche de la tranche
const OCC_MAX = 0.86;               // effacement max du mot le plus lointain d'un recouvrement
const SEP_SPEED = 1;                // px/s, profondeurs voisines
const SEP_TAU = 1.8;                // s
const SEP_RATIO = 1.3;              // écart de profondeur < 30 %
const ZONE_TAU = 1.0;               // s
const S_BASE = 0.30;                // taille monde d'un em
export const WARMUP = 700;          // s de champ « vécu » avant l'ouverture

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

export const wordCount = (w) => Math.round(34 + 44 * clamp01((w - 390) / 610));
// écran étroit : lettres plus petites (le prénom central ne doit jamais être plus petit que le fond)
export const fieldScale = (w, h) => Math.min(1, Math.max(0.72, w / h / 1.5));
// interlettrage : plus d'air pour les petits mots lointains, moins pour les grands proches
export const trackEm = (pxEm) => 0.05 + 0.19 * (1 - sm(12, 90, pxEm));
// gris par profondeur (prototype) ; proche plus sombre car flou, très lointain atténué
export function grayOf(z) {
  let g;
  if (z > 16) g = 0.17;
  else if (z >= 8) g = 0.36 - 0.19 * (z - 8) / 8;
  else g = 0.24 + 0.12 * clamp01((z - 2.8) / 5.2);
  return g * (1 - 0.6 * sm(28, 34, z));
}

export const STRIDE = 20; // floats par lettre instanciée

// opts : { rng, caseMode, glyphs (atlas.glyphs), capHeight }
export function createField(opts) {
  const { rng, caseMode, glyphs, capHeight } = opts;
  const lower = caseMode === 'lower';
  const yTop = -(0.5 * capHeight + 0.05), yBot = 0.5 * capHeight + (lower ? 0.25 : 0.05);
  let view = null, sField = 1, ui = 1;
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
  function zoneTarget(b) {
    const gx = Math.max(zone.x0 - b[2], b[0] - zone.x1), gy = Math.max(zone.y0 - b[3], b[1] - zone.y1);
    return sm(-0.25 * zone.fw, zone.fw, Math.max(gx, gy));
  }

  // ---------- naissance ----------
  function pickName(tier) {
    const used = new Set(words.map((w) => w.name));
    for (let i = 0; i < 40; i++) {
      const n = rng.pick(NAMES);
      if (used.has(n)) continue;
      if (tier === 0 && n.length > 6) continue;    // proches : mots courts (très grands à l'écran)
      return n;
    }
    return rng.pick(NAMES);
  }

  function spawn(w, tier, warm) {
    const T = TIERS[tier];
    w.tier = tier;
    w.name = pickName(tier);
    w.text = displayCase(w.name, caseMode);
    w.chars = [...w.text];
    w.adv = w.chars.map((ch) => glyphs[ch]?.adv ?? 0.6);
    w.advSum = w.adv.reduce((a, b) => a + b, 0);
    w.jit = w.chars.map(() => rng.range(-0.015, 0.015));
    w.S = S_BASE * sField * rng.range(0.9, 1.15);
    w.ink = rng.range(0.92, 1.08);
    w.z = T.z0 * Math.pow(T.z1 / T.z0, rng());
    w.dvx = rng.range(-1, 1) * 0.01 * sField;
    w.dvy = rng.range(-1, 1) * 0.006 * sField;
    w.sx = 0; w.sy = 0; w.tsx = 0; w.tsy = 0;
    w.occ = 0; w.occT = 0; w.tauOcc = rng.range(1.2, 1.8);
    w.age = warm ? 1e4 : 0;
    w.box = w.box || [0, 0, 0, 0];

    // meilleur de N essais : visible, hors zone vide, peu de recouvrement avec sa tranche
    const { f, cx, cy } = view;
    let best = null;
    for (let i = 0; i < 12; i++) {
      let u, v;
      if (tier === 0) {
        do { u = rng.range(-0.08, 1.08); v = rng.range(-0.06, 1.06); } while (Math.abs(u - 0.5) < 0.3 && Math.abs(v - 0.5) < 0.3);
      } else { u = rng.range(0, 1); v = rng.range(0.02, 0.98); }
      w.X = cam.x + (u * view.w - cx) * w.z / f;
      w.Y = cam.y + (v * view.h - cy) * w.z / f;
      geom(w);
      const a = area(w.box) || 1;
      let score = offscreen(w.box, -20) ? 10 : 0;
      score += 3 * (1 - zoneTarget(w.box));
      for (const o of words) {
        if (o === w || o.box == null || o.alpha == null) continue;
        score += inter(w.box, o.box) / a * (o.tier === tier ? 1 : 0.3) * (0.3 + o.alpha);
      }
      if (!best || score < best.score) best = { score, X: w.X, Y: w.Y };
    }
    w.X = best.X; w.Y = best.Y;
    geom(w);
    w.zoneA = zoneTarget(w.box);
    w.alpha = warm ? w.zoneA : 0;
  }

  // ---------- dimensionnement : nombre de mots par tranche ----------
  function resize(w, h) {
    const first = !view;
    view = viewOf(w, h);
    sField = fieldScale(w, h);
    ui = Math.min(1.3, Math.max(0.6, w / 1440));
    if (first) setZone(null);
    const N = wordCount(w);
    const want = TIERS.map((T, i) => (i < TIERS.length - 1 ? Math.round(T.share * N) : 0));
    want[TIERS.length - 1] = N - want.reduce((a, b) => a + b, 0);
    for (let t = 0; t < TIERS.length; t++) {
      const have = words.filter((x) => x.tier === t);
      for (let k = have.length; k > want[t]; k--) words.splice(words.indexOf(have[k - 1]), 1);
      for (let k = have.length; k < want[t]; k++) { const nw = {}; words.push(nw); spawn(nw, t, first); }
    }
    for (const x of words) geom(x);
    if (first) for (let s = 0; s < WARMUP; s += 0.5) step(0.5, true);
  }

  // zone vide autour du prénom (rectangle px) ; null → zone de repos (prénom vide)
  function setZone(r) {
    const kw = 260 * ui, kh = 110 * ui;
    const cx = view.cx, cy = view.cy;
    const hw = Math.min(0.47 * view.w, Math.max(kw, r ? (r.x1 - r.x0) / 2 + r.pad : 0));
    const hh = Math.max(kh, r ? (r.y1 - r.y0) / 2 + r.pad * 0.8 : 0);
    const ccy = r ? (r.y0 + r.y1) / 2 : cy;
    zone.x0 = cx - hw; zone.x1 = cx + hw; zone.y0 = ccy - hh; zone.y1 = ccy + hh; zone.fw = 70 * ui;
  }

  // ---------- pas de simulation ----------
  function step(dt, motion = true) {
    time += dt;
    const { f } = view;
    for (const w of words) {
      if (motion) {
        w.z *= Math.exp(-ZOOM * dt);
        w.X += (w.dvx + w.sx * w.z / f) * dt;
        w.Y += (w.dvy + w.sy * w.z / f) * dt;
      }
      w.age += dt;
      geom(w);
      if (w.z <= TIERS[w.tier].z0 || offscreen(w.box, 24)) { spawn(w, w.tier, false); }
      const zk = 1 - Math.exp(-dt / ZONE_TAU);
      w.zoneA += (zoneTarget(w.box) - w.zoneA) * zk;
      const T = TIERS[w.tier];
      w.base = sm(0, FADE_IN, w.age) * sm(0, 1, Math.log(w.z / T.z0) / (ZOOM * FADE_OUT)) * w.zoneA;
      w.occT = 0; w.tsx = 0; w.tsy = 0;
    }
    // loin → proche
    order = words.slice().sort((a, b) => b.z - a.z);
    for (let i = 0; i < order.length; i++) {
      const a = order[i], aa = area(a.box) || 1;
      for (let j = i + 1; j < order.length; j++) {
        const b = order[j];            // b est plus proche que a
        // marge ≈ 0,4 em du plus petit : deux mots qui se touchent comptent comme un recouvrement
        const m = 0.4 * Math.min(a.pxEm, b.pxEm);
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
  let buf = new Float32Array(1024 * STRIDE);
  function emit() {
    let n = 0;
    for (const w of order) {
      if (w.alpha < 0.004 || offscreen(w.box)) continue;
      if ((n + w.chars.length) * STRIDE > buf.length) { const nb = new Float32Array(buf.length * 2); nb.set(buf); buf = nb; }
      const gray = grayOf(w.z) * w.ink;
      let pen = -w.half;
      for (let i = 0; i < w.chars.length; i++) {
        const g = glyphs[w.chars[i]], o = n * STRIDE;
        buf[o] = w.X; buf[o + 1] = w.Y; buf[o + 2] = w.z; buf[o + 3] = w.psi;
        buf[o + 4] = pen; buf[o + 5] = (w.jit[i] + 0.5 * capHeight) * w.S; buf[o + 6] = w.S; buf[o + 7] = w.alpha;
        buf[o + 8] = g.u0; buf[o + 9] = g.v0; buf[o + 10] = g.u1; buf[o + 11] = g.v1;
        buf[o + 12] = g.x0; buf[o + 13] = g.y0; buf[o + 14] = g.x1; buf[o + 15] = g.y1;
        buf[o + 16] = gray; buf[o + 17] = 0; buf[o + 18] = 0; buf[o + 19] = 0;
        pen += (w.adv[i] + w.track) * w.S;
        n++;
      }
    }
    return { data: buf, count: n };
  }

  // ---------- mesures ----------
  function stats() {
    const vis = words.filter((w) => w.alpha > 0.1 && !offscreen(w.box));
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

  return { resize, step, emit, setZone, stats, advance, cam, words, get view() { return view; }, get zone() { return zone; } };
}
