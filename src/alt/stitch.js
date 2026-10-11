// Le soulignement cousu (11/10, Maxence) : tout ce qui est souligné sur la page l'est par un bout de fil noir, cousu —
// il sort d'un petit trou sous le début du mot, court sous lui, et rentre dans un autre trou à la fin (comme passé
// derrière la page). Un fil de coton ciré très fin (même dessin que le fil de la carte mystère, en 2D) : le modelé d'un
// petit cylindre éclairé d'en haut, une torsion à peine visible, deux ou trois fibres, une pointe de lustre ; il plonge
// dans les trous (il s'affine et s'assombrit), qui gardent un liseré de lumière sur leur bord bas. Immobile.
function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// le fil cousu entre ha et hb (px), à la hauteur y0, dans un contexte 2D déjà réglé (aussi : le bandeau des pages, nav.js)
// o : { sag (px, l'affaissement au milieu), sag2 (px, une légère ondulation en S), holes ([début, fin] : un trou à ce
// bout — sans trou, le fil vient de plus loin, du bord de l'écran) }
export function paintThread(x, ha, hb, y0, seed = 7, TH = 1.25, o = {}) {
  const sag = o.sag ?? 0.45, sag2 = o.sag2 ?? 0, holes = o.holes || [true, true];
  const R = rng(seed);
  // le chemin : à peine affaissé, à peine irrégulier
  const P = [];
  for (let px = ha; px <= hb + 0.01; px += 1) { const u = (px - ha) / (hb - ha); P.push([px, y0 + sag * Math.sin(Math.PI * u) + sag2 * Math.sin(2 * Math.PI * u) + 0.12 * Math.sin(px * 0.41 + seed)]); }
  x.lineCap = 'round'; x.lineJoin = 'round';
  const line = (dyy, col, wd, a = 0, b = P.length) => { x.beginPath(); for (let i = a; i < b; i++) (i > a ? x.lineTo : x.moveTo).call(x, P[i][0], P[i][1] + dyy); x.strokeStyle = col; x.lineWidth = wd; x.stroke(); };
  // ombre portée très douce, le corps, le modelé (haut éclairé, bas plus sombre)
  line(0.9, 'rgba(0,0,0,.5)', TH + 1.4);
  const a0 = holes[0] ? 2 : 0, b0 = holes[1] ? P.length - 2 : P.length;
  line(0, 'rgb(28,27,25)', TH, a0, b0);
  if (holes[0]) line(0, 'rgb(18,17,16)', TH * 0.7, 0, 3);
  if (holes[1]) line(0, 'rgb(18,17,16)', TH * 0.7, P.length - 3, P.length);   // il plonge : plus fin, plus sombre
  line(-TH * 0.2, 'rgba(120,116,108,.24)', TH * 0.42, 2, P.length - 2);
  line(TH * 0.3, 'rgba(0,0,0,.35)', TH * 0.3, 2, P.length - 2);
  // la torsion : de fins reflets en biais, irréguliers
  for (let s = ha + 2.5 + R() * 2; s < hb - 2.5; s += 3.1 + (R() - 0.5) * 0.8) {
    const i = Math.min(P.length - 1, Math.round(s - ha)), [px, py] = P[i], a = 0.07 + 0.16 * R() ** 2;
    x.beginPath(); x.moveTo(px - 0.6, py - TH * 0.46); x.lineTo(px + 0.5, py + TH * 0.18);
    x.strokeStyle = `rgba(165,160,150,${a.toFixed(3)})`; x.lineWidth = 0.45; x.stroke();
  }
  // une pointe de lustre ciré
  { const c = ha + (hb - ha) * (0.3 + 0.4 * R()), l = 6 + 8 * R(), i0 = Math.max(2, Math.round(c - l / 2 - ha)), i1 = Math.min(P.length - 2, Math.round(c + l / 2 - ha));
    if (i1 > i0) line(-TH * 0.34, 'rgba(205,199,187,.22)', 0.45, i0, i1); }
  // deux ou trois fibres qui s'échappent
  for (let f = 0, nf = 2 + Math.floor(R() * 2); f < nf; f++) {
    const s = ha + 6 + R() * (hb - ha - 12), i = Math.round(s - ha), [px, py] = P[i], up = R() > 0.5 ? -1 : 1, l = 1.2 + 2.2 * R(), an = 0.4 + 0.7 * R();
    x.beginPath(); x.moveTo(px, py + up * TH * 0.4);
    x.quadraticCurveTo(px + l * Math.cos(an) * 0.6, py + up * (TH * 0.4 + l * Math.sin(an) * 0.6), px + l * Math.cos(an + 0.4), py + up * (TH * 0.4 + l * Math.sin(an + 0.4)));
    x.strokeStyle = `rgba(125,120,112,${(0.1 + 0.15 * R()).toFixed(3)})`; x.lineWidth = 0.35; x.stroke();
  }
  // les deux trous : le fil y rentre (le noir du trou, un liseré de lumière sur le bord bas, côté opposé à la lampe)
  for (const hx of [holes[0] ? ha : null, holes[1] ? hb : null]) {
    if (hx == null) continue;
    const hy = y0 + 0.1;
    x.beginPath(); x.ellipse(hx, hy, 1.15, 0.85, 0, 0, Math.PI * 2); x.fillStyle = 'rgb(2,2,2)'; x.fill();
    x.beginPath(); x.ellipse(hx, hy, 1.25, 0.95, 0, 0.15 * Math.PI, 0.85 * Math.PI); x.strokeStyle = 'rgba(130,126,118,.28)'; x.lineWidth = 0.4; x.stroke();
    x.beginPath(); x.ellipse(hx, hy, 1.3, 1.0, 0, 1.1 * Math.PI, 1.9 * Math.PI); x.strokeStyle = 'rgba(0,0,0,.6)'; x.lineWidth = 0.5; x.stroke();
  }
}

export function stitch(el, { pad = 3.5, dy = 0, seed = 7 } = {}) {
  const cv = document.createElement('canvas');
  cv.className = 'of-stitch'; cv.setAttribute('aria-hidden', 'true');
  Object.assign(cv.style, { position: 'absolute', pointerEvents: 'none', left: '0', top: '0' });
  el.appendChild(cv);
  const x = cv.getContext('2d');
  const TH = 1.25, H = 12;
  function layout() {
    // la largeur du mot (pas celle de la boîte : l'interlettrage, les marges)
    // (seulement le texte : pas le fil lui-même, qui est dans l'élément)
    const rects = [], box = el.getBoundingClientRect();
    for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { const r = document.createRange(); r.selectNodeContents(n); rects.push(...[...r.getClientRects()].filter(q => q.width > 0)); }
    if (!rects.length || !box.width) return;
    const x0 = Math.min(...rects.map(q => q.left)), x1 = Math.max(...rects.map(q => q.right)), yb = Math.max(...rects.map(q => q.bottom));
    // (un mot à grand interlettrage finit par une espace d'interlettrage : on la retire)
    const ls = parseFloat(getComputedStyle(el).letterSpacing) || 0;
    const left = x0 - box.left - pad, w = Math.max(8, x1 - x0 - ls + 2 * pad);
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    cv.width = Math.round(w * dpr); cv.height = Math.round(H * dpr);
    Object.assign(cv.style, { width: w + 'px', height: H + 'px', left: left + 'px', top: (yb - box.top + dy - H / 2 + 1) + 'px' });
    draw(w, dpr);
  }
  function draw(w, dpr) {
    x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, H);
    paintThread(x, 2.6, w - 2.6, H / 2, seed, TH);
  }
  const ro = new ResizeObserver(layout); ro.observe(el);
  document.fonts && document.fonts.ready.then(layout);
  layout();
  return { layout, remove() { ro.disconnect(); cv.remove(); } };
}
