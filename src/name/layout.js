// Mise en page du prénom central (fonction pure, testable).
// Net, centré sur le point de fuite, 2 lignes max (coupure aux espaces), ≥ 28 px, interlettrage ≈ 0,45 em.

export const TRACK = 0.45;      // interlettrage, em
const TRACK_MIN = 0.15;         // compression d'interlettrage tolérée avant de rétrécir sous 28 px
export const MIN_PX = 28;
const SPACE_EM = 0.3;
const CAP_FRAC = 0.04;          // hauteur de capitale = 4 % de la hauteur d'écran (prototype)
const MAX_W_FRAC = 0.86;

// adv(ch) → chasse en em
function lineWidth(str, adv, tr) {
  let w = 0, n = 0;
  for (const ch of str) { w += ch === ' ' ? SPACE_EM : adv(ch); n++; }
  return n ? w + tr * (n - 1) : 0; // en em
}

function bestTwoLines(text, adv, tr, midword) {
  let best = null;
  for (let i = 1; i < text.length; i++) {
    let l1, l2;
    if (text[i] === ' ') { l1 = text.slice(0, i); l2 = text.slice(i + 1); }
    else if (midword && text[i - 1] !== ' ') { l1 = text.slice(0, i); l2 = text.slice(i); }
    else continue;
    if (!l1 || !l2) continue;
    const w = Math.max(lineWidth(l1, adv, tr), lineWidth(l2, adv, tr));
    if (!best || w < best.w) best = { lines: [l1, l2], w };
  }
  return best;
}

// text : chaîne d'affichage ; m : { adv(ch), capHeight } ; vp : { w, h, cx, cy }
export function layoutName(text, m, vp) {
  const t = text.replace(/ +$/, ''); // l'espace final en cours de frappe ne décentre pas
  const capH = m.capHeight;
  const baseFs = Math.max(MIN_PX, (CAP_FRAC * vp.h) / capH);
  const maxW = MAX_W_FRAC * vp.w;

  let lines = [t], tr = TRACK, fs = baseFs;
  if (t.length) {
    const w1 = lineWidth(t, m.adv, tr);
    const fs1 = Math.min(baseFs, maxW / w1);
    const two = bestTwoLines(t, m.adv, tr, false);
    const fs2 = two ? Math.min(baseFs, maxW / two.w) : 0;
    if (fs1 >= baseFs * 0.999 || fs1 * 1.12 >= fs2) { lines = [t]; fs = fs1; }
    else { lines = two.lines; fs = fs2; }
    if (fs < MIN_PX) {
      // 1) compresser l'interlettrage, 2) couper dans le mot (cas extrême : 22 lettres sans espace)
      fs = MIN_PX;
      const need = (ls, k) => Math.max(...ls.map((l) => lineWidth(l, m.adv, k)));
      const fitTr = (ls) => { for (let k = TRACK; k >= TRACK_MIN - 1e-9; k -= 0.01) if (need(ls, k) * MIN_PX <= maxW) return k; return null; };
      const cands = [[t], two && two.lines, bestTwoLines(t, m.adv, TRACK_MIN, true)?.lines].filter(Boolean);
      let done = false;
      for (const ls of cands) { const k = fitTr(ls); if (k != null) { lines = ls; tr = k; done = true; break; } }
      if (!done) { lines = cands[cands.length - 1]; tr = TRACK_MIN; fs = maxW / need(lines, tr); }
    }
  }

  const cap = capH * fs;
  const gap = cap * 2.4;
  const n = lines.length;
  const out = { fs, cap, track: tr, lines: [], glyphs: [] };
  lines.forEach((l, li) => {
    const base = vp.cy + cap / 2 + (li - (n - 1) / 2) * gap;
    const w = lineWidth(l, m.adv, tr) * fs;
    let x = vp.cx - w / 2;
    for (const ch of l) {
      if (ch !== ' ') out.glyphs.push({ ch, x, y: base, fs });
      x += ((ch === ' ' ? SPACE_EM : m.adv(ch)) + tr) * fs;
    }
    out.lines.push({ text: l, x0: vp.cx - w / 2, x1: vp.cx + w / 2, base });
  });
  const last = out.lines[out.lines.length - 1];
  const endX = t.length ? last.x1 + tr * fs * 0.85 : vp.cx;
  out.cursor = { x: endX, y0: last.base - 1.5 * cap, y1: last.base + 0.5 * cap };
  out.top = out.lines[0].base - cap;
  out.bottom = last.base + cap * 0.35;
  return out;
}
