// Lumière organique : seules les lettres saisies s'allument dans le champ.
// Événements (ajout / retrait d'une lettre) → onde depuis le centre, puis repos qui respire ;
// retrait → extinction du plus loin vers le centre. Chaque lettre a ses propres paramètres
// (tirés à la naissance du mot) : aucune animation identique.

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const TAU = Math.PI * 2;

// paramètres propres d'une lettre
export function letterParams(rng) {
  return {
    d: rng.range(0, 0.15),            // retard propre (s)
    att: rng.range(0.09, 0.26),       // attaque (s)
    dec: rng.range(0.7, 2.3),         // décroissance (s)
    inten: rng.range(0.65, 1),        // intensité de l'onde
    f1: TAU * rng.range(0.06, 0.16), p1: rng.range(0, TAU),   // souffle de repos : 2 sinus
    f2: TAU * rng.range(0.17, 0.31), p2: rng.range(0, TAU),   // non synchronisés
    trail: rng.range(0.7, 1.3),       // longueur de traînée
    sf: TAU * rng.range(0.03, 0.08), sp: rng.range(0, TAU),   // balancement de la traînée
    off: rng.range(0.25, 0.6),        // durée d'extinction (s)
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

  // Niveau de lumière d'une lettre. dn : distance écran au prénom (0 centre → 1 coin), z : profondeur.
  function level(ch, lp, dn, z, t) {
    const C = ch.toUpperCase();
    const k = sm(10, 30, z);                          // lointain : plus tard, plus doux, plus long
    const delay = 0.05 + 0.65 * dn + 0.35 * k + lp.d;
    const att = lp.att * (1 + 0.6 * k), dec = lp.dec * (1 + 0.5 * k);
    let p = 0;
    if (counts[C]) {
      p = reduced ? sm(0, 0.6, t - added[C] - 0.3 * dn) : sm(0, att * 1.5, t - added[C] - delay);
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
    // anneau de résonance : repos plus vif près du prénom (hors zone vide → anneau), plus faible au loin
    const rest = (0.55 - 0.13 * sm(12, 20, z)) * (0.5 + 0.5 * (1 - sm(0.25, 1, dn)));
    const breath = reduced ? 1 : 1 + 0.1 * Math.sin(lp.f1 * t + lp.p1) + 0.07 * Math.sin(lp.f2 * t + lp.p2);
    return p * (rest * breath + pulse);
  }

  return { update, level, get active() { return Object.keys(counts).length > 0 || waves.length > 0; } };
}
