// Lumière organique : seules les lettres saisies s'allument dans le champ.
// Ajout d'une lettre → front de lumière lent qui part du fond et avance vers l'avant-plan,
// bord irrégulier (bruit spatial doux), puis repos qui respire ; retrait → extinction du plus
// loin vers le centre. Chaque lettre a ses propres paramètres
// (tirés à la naissance du mot) : aucune animation identique.

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const TAU = Math.PI * 2;
export const LIGHT_FULL = 6.0;   // s : la lettre la plus proche du premier plan a fini de s'allumer

// paramètres propres d'une lettre
export function letterParams(rng) {
  return {
    d: rng.range(0, 0.15),            // retard propre (s)
    att: rng.range(0.09, 0.26),       // attaque (s)
    dec: rng.range(0.7, 2.3),         // décroissance (s)
    inten: rng.range(0.65, 1),        // intensité de l'onde
    f1: TAU * rng.range(0.06, 0.16), p1: rng.range(0, TAU),   // souffle de repos : 2 sinus
    f2: TAU * rng.range(0.17, 0.31), p2: rng.range(0, TAU),   // non synchronisés
    off: rng.range(0.25, 0.6),        // durée d'extinction (s)
    seed: rng.range(0, 1000),         // graine de la lumière intérieure
  };
}

export function createLight({ reduced = false } = {}) {
  const added = {};      // lettre → instant où elle est entrée dans le prénom
  const removed = {};    // lettre → instant où elle en est sortie
  let waves = [];        // { ch, t0 } : une onde par frappe ajoutant cette lettre
  let counts = {};
  let lastText = null;

  // text : forme canonique (majuscules). Renvoie +1 (ajout), −1 (retrait) ou 0.
  function update(text, t) {
    if (text === lastText) return 0;
    const next = {};
    for (const ch of text) if (ch !== ' ') next[ch] = (next[ch] || 0) + 1;
    let kind = 0;
    for (const ch in next) {
      if ((next[ch] || 0) > (counts[ch] || 0)) {
        if (!counts[ch]) added[ch] = t;
        if (!reduced) waves.push({ ch, t0: t });
        kind = 1;
      }
    }
    for (const ch in counts) if (!next[ch]) { removed[ch] = t; kind = kind || -1; }
    if (!kind && lastText != null && text.length < lastText.length) kind = -1;
    counts = next; lastText = text;
    waves = waves.filter((w) => t - w.t0 < 12);
    return kind;
  }

  // visiteur qui revient : ses lettres sont déjà allumées à l'arrivée (repos, sans onde)
  function prime(text, t) {
    counts = {};
    for (const ch of text) if (ch !== ' ') { counts[ch] = (counts[ch] || 0) + 1; added[ch] = t - 60; }
    lastText = text; waves = [];
  }

  // Niveau de lumière d'une lettre. dn : distance écran au prénom (0 centre → 1 coin), z : profondeur,
  // (nx, ny) : position écran normalisée (−1…1).
  function level(ch, lp, dn, z, t, nx = 0, ny = 0) {
    const C = ch.toUpperCase();
    const k = sm(10, 30, z);
    // propagation : front qui part du fond (z ≈ 34) et atteint l'avant-plan en ≈ 4 s (le fond s'allume vite :
    // la première lettre se remarque en ≈ 0,4 s) ;
    // le bord du front ondule (bruit spatial lent) et chaque lettre a son petit retard propre
    const zeta = clamp01(Math.log(z / 2.8) / Math.log(34 / 2.8));        // 0 proche → 1 fond
    const noise = 0.5 + 0.28 * Math.sin(2.3 * nx + 1.7 * ny + 0.6) + 0.22 * Math.sin(-1.9 * nx + 2.9 * ny + 2.1);
    const delay = 0.1 + 3.4 * Math.pow(1 - zeta, 1.2) + 0.6 * noise + 2 * lp.d;
    const att = lp.att * 4, dec = lp.dec * 2 * (1 + 0.3 * k);             // lent : 0,5–1,4 s / 1,4–6 s
    let p = 0;
    if (counts[C]) {
      p = reduced ? sm(0, 1.2, t - added[C] - 0.5 * (1 - zeta)) : sm(0, att * 1.5, t - added[C] - delay);
    } else if (removed[C] != null) {
      // extinction : du plus loin vers le centre
      const since = t - removed[C] - 0.45 * (1 - dn) - 0.5 * lp.d;
      p = 1 - sm(0, reduced ? 0.6 : lp.off, since);
      if (added[C] == null || removed[C] < added[C]) p = 0;
    }
    if (p <= 0 && !counts[C]) return 0;
    let pulse = 0;
    for (const w of waves) {
      if (w.ch !== C) continue;
      const tau = t - w.t0 - delay;
      if (tau <= 0) continue;
      pulse += tau < att ? sm(0, att, tau) : Math.exp(-(tau - att) / dec);
    }
    pulse *= 0.8 * lp.inten * (1 - 0.35 * k);
    // anneau de résonance : repos plus vif près du prénom (hors zone vide → anneau)
    const rest = (0.36 + 0.19 * sm(4, 20, z)) * (0.5 + 0.5 * (1 - sm(0.25, 1, dn)));   // proches plus sombres, fond plus clair
    const breath = reduced ? 1 : 1 + 0.1 * Math.sin(lp.f1 * t + lp.p1) + 0.07 * Math.sin(lp.f2 * t + lp.p2);
    return p * (rest * breath + pulse);
  }

  // instant où la dernière lettre allumée a atteint sa clarté (retard max + montée) : la suite peut commencer
  function fullAt() { let m = -Infinity; for (const C in counts) m = Math.max(m, added[C] ?? -Infinity); return m + LIGHT_FULL; }
  return { update, prime, level, fullAt, get active() { return Object.keys(counts).length > 0 || waves.length > 0; } };
}
