// Transition accueil → cartes (04/10, v2). Trois temps séparés, jamais deux mouvements à la fois :
// 1) la recharge (?transition=lettres) : le prénom baisse un peu ; une à une, du fond vers l'avant, TOUTES les lettres allumées du
//    champ (celles du prénom) quittent leur mot et rejoignent la même lettre du prénom. Elles partent telles
//    qu'elles sont (profondeur, flou, clarté, lumière intérieure, inclinaison) et volent dans le monde du champ
//    (vraie perspective, même shader) en devenant peu à peu comme la lettre du prénom : nettes, droites, à sa
//    taille, à sa clarté ; arrivées, elles s'y fondent et la lettre du prénom se recharge. Pendant ce temps les
//    lettres grises s'éteignent (des bords vers le prénom) et ont complètement disparu quand la dernière arrive.
//    Par défaut (choix Maxence) : seule la lumière part — la lettre reste à sa place, grise, et
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
// une seule clarté du prénom dans toute l'app (accueil, transition, cartes) : 0,62 (≈ 158/255, accordée aux cartes) ; jamais de baisse
// d'une scène à l'autre. La recharge le fait baisser puis le ramène à ce niveau (pas au-delà) ; la marge jusqu'au
// blanc sert à l'allumage de ses lettres quand on écrit la réponse.
export const NAME_REST = 0.62;
export const NAME_LOW = 0.62;     // fraction de NAME_REST : le prénom baisse avant d'être rechargé
export const NAME_GRAY = NAME_REST;   // (ancien gris « en retrait » 0,42 : retiré, 05/10)
const NAME_LIT = NAME_REST;       // clarté visée par une lettre qui rejoint le prénom
const DEP0 = 0.5, DEP_SPAN = 2.2; // départs étalés, du plus loin au plus proche
const MAX_FLY = 140;               // toutes les lettres allumées à l'écran, du fond au premier plan

// ctx : { words, letterScreen(w, i), level(w, i, x, y) → lumière, name: [{ ch, x, y, fs }], W, H, rng, mode }
export function planRecharge(ctx) {
  const { words, letterScreen, level, name, W, H, rng, mode = 'lettres' } = ctx;
  const chars = new Set(name.map((g) => g.ch.toUpperCase()));
  let pool = [];
  for (const w of words) {
    if (w.base < 0.08) continue;
    for (let i = 0; i < w.chars.length; i++) {
      const C = w.chars[i].toUpperCase();
      if (!chars.has(C) || (w.occL && w.occL[i] > 0.85)) continue;
      const p = letterScreen(w, i);
      if (p.x < -p.fs || p.x > W + p.fs || p.y < -0.5 * p.fs || p.y > H + 1.5 * p.fs) continue;   // grandes lettres du premier plan à moitié dans l'écran comprises
      const L = level(w, i, p.x, p.y);
      if (L < 0.03) continue;                                   // pas (encore) allumée : elle s'éteint avec les grises
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
  // énergie : la tête du filament part au départ, sa queue quitte la lettre un peu après et la vide en partant
  if (mode === 'energie') for (const f of flyers) { f.dur *= 0.85; f.lag = 0.45 + 0.2 * rng(); f.tdur = f.dur + 0.5; f.ph = rng() * 6.283; f.amp = 0.04 + 0.05 * rng(); }
  const fEnd = (f) => (mode === 'energie' ? f.dep + f.lag + f.tdur : f.dep + f.dur);
  const tEnd = flyers.reduce((m, f) => Math.max(m, fEnd(f)), 3.2);
  const src = new Map();   // mot → { rang → lettre en route }
  for (const f of flyers) { if (!src.has(f.w)) src.set(f.w, {}); src.get(f.w)[f.i] = f; }
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
  const f = s && s[i];
  if (!f) { buf[o + 7] *= m; buf[o + 17] *= m; return; }
  // une lettre qui va partir garde exactement sa clarté jusqu'à son départ (sinon : baisse puis remontée = flash) ;
  // on note sa clarté vivante, que sa copie en vol reprend au départ
  if (T < f.dep) { f.alive = buf[o + 7]; f.Llive = buf[o + 17]; return; }
  if (plan.mode === 'lettres') { buf[o + 7] = 0; buf[o + 17] = 0; return; }
  // lumière / énergie : la lettre grise restée sur place rejoint en douceur l'extinction des autres
  buf[o + 7] *= 1 - (1 - m) * sm(f.dep, f.dep + 0.8, T);
  buf[o + 17] *= plan.mode === 'energie' ? 1 - sm(f.dep, f.dep + f.lag + 0.7 * f.tdur, T) : 0;
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
    if (!fl.s0) { fl.s0 = world(fl.w, fl.i); fl.L0 = fl.Llive ?? fl.L; if (fl.alive != null) fl.s0.alpha = fl.alive; }
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
  return { inst: out.map((o) => o.e), bright: nameBright(plan, T, keep) };
}

// clarté du prénom : baisse au départ, remonte à chaque arrivée ; une lettre sans donneur se recharge seule
function nameBright(plan, T, keep) {
  const low = NAME_REST * (1 - (1 - NAME_LOW) * sm(0.1, 1.1, T));
  return keep.map((k, j) => lerp(low, NAME_REST, plan.fed[j] ? 1 - k : sm(plan.tEnd - 1.4, plan.tEnd - 0.2, T)));
}

// flux d'énergie (?transition=energie) : de chaque lettre allumée, sa lumière floue et bruitée s'étire en
// filament, ondoie et coule jusqu'à la même lettre du prénom, puis s'y vide. ctx : src(f) → centre écran et taille
// (px/em) de la lettre source, avec son flou (px) ; name : lettres du prénom (origine de chasse, ligne de base,
// px/em) ; ecx(ch) : centre du glyphe (em) ; capHeight. Renvoie les segments (renderer : ESTRIDE = 12) et la
// clarté du prénom.
const NSEG = 22;
export function energyFrame(plan, T, ctx) {
  const { src, name, ecx, capHeight } = ctx;
  const keep = name.map(() => 1);
  const segs = [];
  for (const f of plan.flyers) {
    if (T < f.dep) continue;
    const head = easeInOut(clamp01((T - f.dep) / f.dur));
    const tail = easeInOut(clamp01((T - f.dep - f.lag) / f.tdur));
    keep[f.j] *= 1 - 0.45 * sm(0.9, 1, head) * (0.3 + 0.7 * tail);
    if (tail >= 0.999) continue;
    const a = src(f), p1 = name[f.j];
    const bx = p1.x + ecx(p1.ch) * p1.fs, by = p1.y - 0.5 * capHeight * p1.fs;
    const dx = bx - a.x, dy = by - a.y, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
    const cxp = (a.x + bx) / 2 + nx * f.bow * d * 1.6, cyp = (a.y + by) / 2 + ny * f.bow * d * 1.6;
    const t = T - f.dep, A = f.amp * d;
    const w0 = Math.max(2.5, 0.75 * capHeight * a.fs + a.blur), w1 = Math.max(1.6, 0.16 * capHeight * p1.fs);   // flou large à la source, s'affine en arrivant
    const I = Math.min(0.62, 0.22 + 0.7 * (f.Llive ?? f.L));
    let prev = null;
    for (let k = 0; k <= NSEG; k++) {
      const u = k / NSEG, iu = 1 - u;
      // courbe douce + ondoiement qui remonte le filament (nul aux deux bouts)
      const wob = Math.sin(Math.PI * u) * (Math.sin(6.283 * (1.3 * u - 0.55 * t) + f.ph) + 0.35 * Math.sin(6.283 * (2.7 * u - 0.9 * t) + 2.1 * f.ph));
      const x = iu * iu * a.x + 2 * iu * u * cxp + u * u * bx + nx * A * wob;
      const y = iu * iu * a.y + 2 * iu * u * cyp + u * u * by + ny * A * wob;
      const wd = w0 + (w1 - w0) * Math.pow(u, 0.7);
      if (prev && u >= tail - 0.14 && prev.u <= head + 0.02) segs.push(prev.x, prev.y, x, y, prev.wd, wd, prev.u, u, I, f.ph * 7.3, head, tail);
      prev = { x, y, wd, u };
    }
  }
  return { energy: { data: new Float32Array(segs), count: segs.length / 12 }, bright: nameBright(plan, T, keep) };
}

// montée : 0 → 1 entre riseT et riseT + RISE
export const riseU = (T, riseT) => easeInOut(clamp01((T - riseT) / RISE));
// gris final : le prénom se met en retrait pendant la montée
export const grayU = (T, riseT) => sm(riseT + 0.3, riseT + RISE, T);
