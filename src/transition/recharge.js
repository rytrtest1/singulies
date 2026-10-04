// Transition accueil → cartes (04/10, v2). Trois temps séparés, jamais deux mouvements à la fois :
// 1) la recharge : le prénom baisse un peu ; une à une, du fond vers l'avant, TOUTES les lettres allumées du
//    champ (celles du prénom) quittent leur mot et rejoignent la même lettre du prénom. Elles partent telles
//    qu'elles sont (profondeur, flou, clarté, lumière intérieure, inclinaison) et volent dans le monde du champ
//    (vraie perspective, même shader) en devenant peu à peu comme la lettre du prénom : nettes, droites, à sa
//    taille, à sa clarté ; arrivées, elles s'y fondent et la lettre du prénom se recharge. Pendant ce temps les
//    lettres grises s'éteignent (des bords vers le prénom) et ont complètement disparu quand la dernière arrive.
//    Variante « lumiere » (?transition=lumiere) : seule la lumière part — la lettre reste à sa place, grise, et
//    s'éteint avec les autres ; sa lumière, en forme de lettre, fait le voyage.
// 2) un court repos : le prénom brille seul (la scène des cartes se prépare à ce moment, rien ne bouge).
// 3) la montée : la caméra descend — le prénom monte à sa place de la scène des cartes, gris en retrait.
// Fonctions pures du temps T (s depuis le départ) : aucune animation ne dépend du nombre d'images.

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const easeInOut = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const lerp = (a, b, u) => a + (b - a) * u;

export const REST = 0.6;          // repos minimal après la dernière arrivée (s)
export const RISE = 1.9;          // durée de la montée (s)
export const NAME_LOW = 0.62;     // le prénom baisse avant d'être rechargé
export const NAME_GRAY = 0.42;    // gris « en retrait » de la scène des cartes (LOOK.nameFlat)
const NAME_LIT = 0.95;            // clarté visée par une lettre qui rejoint le prénom
const DEP0 = 0.5, DEP_SPAN = 2.2; // départs étalés, du plus loin au plus proche
const MAX_FLY = 64;

// ctx : { words, letterScreen(w, i), level(w, i, x, y) → lumière, name: [{ ch, x, y, fs }], W, H, rng, mode }
export function planRecharge(ctx) {
  const { words, letterScreen, level, name, W, H, rng, mode = 'lettres' } = ctx;
  const chars = new Set(name.map((g) => g.ch.toUpperCase()));
  let pool = [];
  for (const w of words) {
    if (w.base < 0.3) continue;
    for (let i = 0; i < w.chars.length; i++) {
      const C = w.chars[i].toUpperCase();
      if (!chars.has(C) || (w.occL && w.occL[i] > 0.6)) continue;
      const p = letterScreen(w, i);
      if (p.x < -p.fs || p.x > W + p.fs || p.y < 0 || p.y > H + p.fs) continue;
      const L = level(w, i, p.x, p.y);
      if (L < 0.06) continue;                                   // pas (encore) allumée : elle s'éteint avec les grises
      pool.push({ w, i, C, z: w.z, L, x: p.x, y: p.y });
    }
  }
  if (pool.length > MAX_FLY) pool = pool.sort((a, b) => b.L - a.L).slice(0, MAX_FLY);
  // la lettre du prénom visée : parmi celles de même lettre, la plus proche à l'écran, en équilibrant
  const count = name.map(() => 0);
  for (const c of pool) {
    let j = -1, best = Infinity;
    name.forEach((g, k) => {
      if (g.ch.toUpperCase() !== c.C) return;
      const d = Math.hypot(g.x - c.x, g.y - c.y) / Math.max(W, H) + 0.35 * count[k];
      if (d < best) { best = d; j = k; }
    });
    c.j = j; count[j]++;
  }
  // du fond vers l'avant-plan (comme la lumière), petit désordre
  pool.sort((a, b) => b.z - a.z);
  const n = pool.length;
  const flyers = pool.map((c, k) => ({
    w: c.w, i: c.i, j: c.j, L: c.L,
    dep: DEP0 + DEP_SPAN * (n > 1 ? k / (n - 1) : 0) + (rng() - 0.5) * 0.3,
    dur: 2.0 + 0.6 * rng(),
    bow: (rng() < 0.5 ? -1 : 1) * (0.05 + 0.1 * rng()),
    s0: null,
  }));
  const tEnd = flyers.reduce((m, f) => Math.max(m, f.dep + f.dur), 3.2);
  const src = new Map();   // mot → { rang → départ }
  for (const f of flyers) { if (!src.has(f.w)) src.set(f.w, {}); src.get(f.w)[f.i] = f.dep; }
  return { flyers, src, fed: count.map((c) => c > 0), tEnd, mode };
}

// lettres du champ : les grises s'éteignent des bords vers le prénom, toutes éteintes à la dernière arrivée ;
// une lettre partie disparaît d'un coup (sa copie en vol est identique à cet instant) — variante lumière :
// elle reste, grise, et ne perd que sa lumière
export function fieldLetter(plan, T, w, i, dn, buf, o) {
  const end = plan.tEnd - 0.15;
  const t0 = Math.min(end - 1.2, 0.3 + 1.6 * (1 - dn) + 0.4 * ((w.lp[i].seed * 0.618) % 1));
  const m = 1 - sm(t0, end, T);
  const s = plan.src.get(w);
  const gone = s && s[i] != null && T >= s[i];
  if (gone && plan.mode !== 'lumiere') { buf[o + 7] = 0; buf[o + 17] = 0; return; }
  buf[o + 7] *= m;
  buf[o + 17] = gone ? 0 : buf[o + 17] * m;
}

// instances des lettres en vol, à l'instant T, dans le monde du champ. world(w, i) : la lettre en monde
// (field.letterWorld) ; cam, f, (vx, vy) : caméra et projection ; name : positions écran du prénom ;
// capHeight : hauteur de capitale (em). Renvoie aussi la clarté de chaque lettre du prénom.
export function rechargeFrame(plan, T, ctx) {
  const { world, cam, f, vx, vy, name, capHeight, dim } = ctx;
  const out = [];
  const keep = name.map(() => 1);              // Π (1 − 0,45·arrivée)
  const light = plan.mode === 'lumiere';
  for (const fl of plan.flyers) {
    if (T < fl.dep) continue;
    if (!fl.s0) { fl.s0 = world(fl.w, fl.i); fl.L0 = fl.L; }
    // départ doux, arrivée franche : la lettre est absorbée par le prénom au lieu de tourner autour
    const s0 = fl.s0, u = clamp01((T - fl.dep) / fl.dur), ue = 1 - Math.cos(u * Math.PI / 2);
    const p1 = name[fl.j], g = s0.g;
    // cible : la lettre du prénom, à la profondeur où ce glyphe a sa taille (px par em) ; centre du glyphe
    const zt = f * s0.S / p1.fs;
    const sx = p1.x + s0.ecx * p1.fs, sy = p1.y - 0.5 * capHeight * p1.fs;
    const Xt = (sx - vx) * zt / f + cam.x, Yt = (sy - vy) * zt / f + cam.y;
    let X = lerp(s0.X, Xt, ue), Y = lerp(s0.Y, Yt, ue);
    const z = lerp(s0.z, zt, ue);
    const dx = Xt - s0.X, dy = Yt - s0.Y, d = Math.hypot(dx, dy) || 1;
    const bow = Math.sin(Math.PI * ue) * fl.bow * d;
    X += -dy / d * bow; Y += dx / d * bow;
    const merge = sm(0.35, 0.85, u), sharp = sm(0.25, 0.8, u);
    const fade = 1 - sm(0.74, 0.97, u);            // arrivée : elle se fond dans la lettre du prénom
    const e = new Float32Array(24);
    e[0] = X; e[1] = Y; e[2] = z; e[3] = s0.psi * (1 - ue);
    e[4] = -s0.ecx * s0.S;                       // la lettre seule : son centre est (X, Y, z)
    e[5] = (s0.jit * (1 - ue) + 0.5 * capHeight) * s0.S; e[6] = s0.S;
    e[7] = lerp(s0.alpha, 1, ue) * fade;
    e[8] = g.u0; e[9] = g.v0; e[10] = g.u1; e[11] = g.v1;
    e[12] = g.x0; e[13] = g.y0; e[14] = g.x1; e[15] = g.y1;
    e[16] = light ? 0 : s0.gray;                 // variante lumière : la lettre grise est restée à sa place
    e[17] = fl.L0 * (1 - merge); e[18] = sharp; e[19] = merge;
    e[20] = s0.seed; e[21] = NAME_LIT;
    out.push({ z, e });
    keep[fl.j] *= 1 - 0.45 * sm(0.7, 0.97, u);
  }
  out.sort((a, b) => b.z - a.z);                 // loin → proche
  // clarté du prénom : baisse au départ, remonte à chaque arrivée ; une lettre sans donneur se recharge seule
  const low = 1 - (1 - NAME_LOW) * sm(0.1, 1.1, T);
  const bright = name.map((_, j) => lerp(low, 1, plan.fed[j] ? 1 - keep[j] : sm(plan.tEnd - 1.4, plan.tEnd - 0.2, T)));
  return { inst: out.map((o) => o.e), bright };
}

// montée : 0 → 1 entre riseT et riseT + RISE
export const riseU = (T, riseT) => easeInOut(clamp01((T - riseT) / RISE));
// gris final : le prénom se met en retrait pendant la montée
export const grayU = (T, riseT) => sm(riseT + 0.3, riseT + RISE, T);
