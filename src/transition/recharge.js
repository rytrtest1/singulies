// Transition accueil → cartes (04/10). Trois temps séparés, jamais deux mouvements à la fois :
// 1) la recharge : le prénom baisse un peu ; une à une, du fond vers l'avant, quelques lettres allumées du champ
//    (celles du prénom) quittent leur mot et viennent se fondre dans la même lettre du prénom, qui remonte en
//    clarté à chaque arrivée. Peu de lettres (une goutte à la fois), vraie perspective (elles grossissent en
//    approchant), trajectoire légèrement courbe. Le reste du champ s'éteint sur place, des bords vers le prénom.
// 2) un court repos : le prénom brille seul sur le fond.
// 3) la montée : la caméra descend — le prénom monte jusqu'à sa place de la scène des cartes (chaque lettre
//    vers sa position exacte, une ou deux lignes → une ligne), les derniers mots montent avec parallaxe, la
//    vignette s'efface (fond uni des cartes) et le prénom se met en retrait (gris). Puis la scène prend la main.
// Fonctions pures du temps T (s depuis le départ) : aucune animation ne dépend du nombre d'images.

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const easeInOut = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const lerp = (a, b, u) => a + (b - a) * u;

export const T_REST = 5.0;        // fin de la recharge (dernière arrivée ≤ 4,7 s)
export const RISE = 1.9;          // durée de la montée (s)
export const NAME_LOW = 0.62;     // le prénom baisse avant d'être rechargé
export const NAME_GRAY = 0.42;    // gris « en retrait » de la scène des cartes (LOOK.nameFlat)
const DEP0 = 0.7, DEP_SPAN = 1.9; // départs étalés de 0,7 à 2,6 s, du plus loin au plus proche
const CROSS = 0.35;               // fondu lettre du mot → lettre en vol (s)

// ctx : { words, letterScreen(w, i), level(w, i, x, y) → lumière, name: [{ ch, x, y, fs }] (lettres du prénom,
// sans espaces), W, H, rng }
export function planRecharge(ctx) {
  const { words, letterScreen, level, name, W, H, rng } = ctx;
  const chars = new Set(name.map((g) => g.ch.toUpperCase()));
  const pool = [];
  for (const w of words) {
    if (w.base < 0.5 || w.z < 8 || w.z > 33) continue;            // assez net, assez loin : il vient vers nous
    for (let i = 0; i < w.chars.length; i++) {
      const C = w.chars[i].toUpperCase();
      if (!chars.has(C) || (w.occL && w.occL[i] > 0.3)) continue;
      const p = letterScreen(w, i);
      if (p.x < W * 0.04 || p.x > W * 0.96 || p.y < H * 0.06 || p.y > H * 0.95) continue;
      const L = level(w, i, p.x, p.y);
      if (L < 0.12) continue;
      pool.push({ w, i, C, z: w.z, score: L * w.base, L });
    }
  }
  const N = Math.min(24, Math.max(10, name.length + 4), pool.length);
  const chosen = [], count = name.map(() => 0);
  const spread = (c) => {   // éviter deux départs voisins : le regard suit une lettre à la fois
    const p = letterScreen(c.w, c.i);
    let k = 1;
    for (const o of chosen) if (Math.hypot(o.p0g.x - p.x, o.p0g.y - p.y) < 0.14 * Math.max(W, H)) k *= 0.35;
    return { s: c.score * k * (0.8 + 0.4 * rng()), p };
  };
  const take = (filter) => {
    let best = null, bs = -1, bp = null;
    for (const c of pool) { if (c.used || !filter(c)) continue; const { s, p } = spread(c); if (s > bs) { bs = s; best = c; bp = p; } }
    if (best) { best.used = true; best.p0g = bp; }
    return best;
  };
  // chaque lettre du prénom reçoit au moins une lettre du champ (quand le champ en a une)
  const idx = name.map((_, j) => j).sort(() => rng() - 0.5);
  for (const j of idx) {
    if (chosen.length >= N) break;
    const c = take((c) => c.C === name[j].ch.toUpperCase());
    if (c) { c.j = j; count[j]++; chosen.push(c); }
  }
  while (chosen.length < N) {
    const c = take(() => true);
    if (!c) break;
    let j = -1;
    name.forEach((g, k) => { if (g.ch.toUpperCase() === c.C && (j < 0 || count[k] < count[j])) j = k; });
    c.j = j; count[j]++; chosen.push(c);
  }
  // du fond vers l'avant-plan (comme la lumière), petit désordre
  chosen.sort((a, b) => b.z - a.z);
  const n = chosen.length;
  const flyers = chosen.map((c, k) => ({
    w: c.w, i: c.i, j: c.j, ch: c.w.chars[c.i], L: c.L,
    dep: DEP0 + DEP_SPAN * (n > 1 ? k / (n - 1) : 0) + (rng() - 0.5) * 0.24,
    dur: 1.55 + 0.45 * rng(),
    bow: (rng() < 0.5 ? -1 : 1) * (0.06 + 0.08 * rng()),
    p0: null,
  }));
  const src = new Map();   // mot → { rang → départ }
  for (const f of flyers) { if (!src.has(f.w)) src.set(f.w, {}); src.get(f.w)[f.i] = f.dep; }
  return { flyers, src, fed: count.map((c) => c > 0) };
}

// facteur d'alpha d'une lettre du champ : extinction des bords vers le prénom ; la lettre partie s'efface
// pendant que sa copie en vol apparaît
export function fieldMod(plan, T, w, i, dn) {
  const seed = w.lp[i].seed;
  const t0 = 1.1 + 2.7 * (1 - dn) + 0.5 * ((seed * 0.618) % 1);
  let m = 1 - sm(t0, t0 + 1.5, T);
  const s = plan.src.get(w);
  if (s && s[i] != null) m *= 1 - sm(s[i], s[i] + CROSS, T);
  return m;
}

// lettres en vol et clarté du prénom à l'instant T. name : positions actuelles des lettres du prénom ;
// letterScreen(w, i) : position actuelle de la lettre source (lue au départ) ; b0(f) : clarté de départ
export function rechargeFrame(plan, T, name, letterScreen, b0) {
  const out = [];
  const keep = name.map(() => 1);              // Π (1 − 0,8·arrivée)
  for (const f of plan.flyers) {
    if (T < f.dep) continue;
    if (!f.p0) { f.p0 = letterScreen(f.w, f.i); f.b0 = b0(f); }
    const u = clamp01((T - f.dep) / f.dur), ue = easeInOut(u);
    const p1 = name[f.j];
    // droite en 3D vue en perspective : poids 1/taille (profondeur), taille harmonique (grossit en approchant)
    const a = (1 - ue) / f.p0.fs, b = ue / p1.fs;
    let x = (f.p0.x * a + p1.x * b) / (a + b), y = (f.p0.y * a + p1.y * b) / (a + b);
    const fs = 1 / (a + b);
    const dx = p1.x - f.p0.x, dy = p1.y - f.p0.y, d = Math.hypot(dx, dy) || 1;
    const bow = Math.sin(Math.PI * ue) * f.bow * d;
    x += -dy / d * bow; y += dx / d * bow;
    // une goutte de lumière, pas un sprite blanc : à peine plus claire qu'au départ ; elle se fond dans la
    // lettre du prénom avant de la recouvrir (aucun dédoublement), qui gagne la même clarté au même moment
    const alpha = lerp(f.b0, Math.min(0.72, 0.2 + 1.5 * f.b0), sm(0.15, 0.6, u)) * sm(f.dep, f.dep + CROSS, T) * (1 - sm(0.62, 0.93, u));
    if (alpha > 0.003) out.push({ ch: f.ch, x, y, fs, alpha });
    keep[f.j] *= 1 - 0.8 * sm(0.6, 0.95, u);
  }
  // clarté du prénom : baisse au départ, remonte à chaque arrivée ; une lettre sans donneur se recharge seule
  const low = 1 - (1 - NAME_LOW) * sm(0.1, 1.1, T);
  const bright = name.map((_, j) => {
    const c = plan.fed[j] ? 1 - keep[j] : sm(3.6, 4.6, T);
    return lerp(low, 1, c);
  });
  return { flyers: out, bright };
}

// montée : 0 → 1 entre riseT et riseT + RISE
export const riseU = (T, riseT) => easeInOut(clamp01((T - riseT) / RISE));
// gris final : le prénom se met en retrait pendant la montée
export const grayU = (T, riseT) => sm(riseT + 0.3, riseT + RISE, T);
