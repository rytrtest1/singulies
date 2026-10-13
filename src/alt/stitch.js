// Le soulignement cousu (11/10, Maxence) : tout ce qui est souligné sur la page l'est par un bout de fil noir, cousu —
// il sort d'un petit trou sous le début du mot, court sous lui, et rentre dans un autre trou à la fin (comme passé
// derrière la page). Un fil de coton ciré très fin (même dessin que le fil de la carte mystère, en 2D) : le modelé d'un
// petit cylindre éclairé d'en haut, une torsion à peine visible, deux ou trois fibres, une pointe de lustre ; il plonge
// dans les trous (il s'affine et s'assombrit), qui gardent un liseré de lumière sur leur bord bas.
// (12/10, Maxence : « tout le site est lié ») le fil n'est jamais tout à fait immobile : il coulisse très lentement dans
// ses trous (sa torsion, son lustre, ses fibres défilent avec la matière), de gauche à droite.
function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// le fil cousu entre ha et hb (px), à la hauteur y0, dans un contexte 2D déjà réglé (aussi : le bandeau des pages, nav.js)
// o : { sag (px, l'affaissement au milieu), sag2 (px, une légère ondulation en S), holes ([début, fin] : un trou à ce
// bout — sans trou, le fil vient de plus loin, du bord de l'écran), g0 (12/10 : la position de ha le long du fil lui-même
// — la torsion est alors attachée à la matière : quand le fil coulisse, ses reflets défilent avec lui ; le lustre et les
// fibres aussi), yf (px → px : une onde lente le long du fil, en coordonnées de l'écran) }
export function paintThread(x, ha, hb, y0, seed = 7, TH = 1.25, o = {}) {
  const sag = o.sag ?? 0.45, sag2 = o.sag2 ?? 0, holes = o.holes || [true, true];
  const R = rng(seed);
  // le chemin : à peine affaissé, à peine irrégulier
  const P = [];
  const yf = o.yf || null, ox = o.ox || 0;
  for (let px = ha; px <= hb + 0.01; px += 1) { const u = (px - ha) / (hb - ha); P.push([px, y0 + sag * Math.sin(Math.PI * u) + sag2 * Math.sin(2 * Math.PI * u) + 0.12 * Math.sin(px * 0.41 + seed) + (yf ? yf(px + ox) : 0)]); }
  if (P.length < 4) return;                       // (bout trop court pour un fil : rien — sinon P[-1] plantait le bandeau)
  x.lineCap = 'round'; x.lineJoin = 'round';
  const line = (dyy, col, wd, a = 0, b = P.length) => { x.beginPath(); for (let i = a; i < b; i++) (i > a ? x.lineTo : x.moveTo).call(x, P[i][0], P[i][1] + dyy); x.strokeStyle = col; x.lineWidth = wd; x.stroke(); };
  // ombre portée très douce, le corps, le modelé (haut éclairé, bas plus sombre)
  line(0.9, 'rgba(0,0,0,.5)', TH + 1.4);
  const a0 = holes[0] ? 2 : 0, b0 = holes[1] ? P.length - 2 : P.length;
  line(0, 'rgb(34,33,31)', TH, a0, b0);   // (12/10 : un peu plus présent)
  if (holes[0]) line(0, 'rgb(18,17,16)', TH * 0.7, 0, 3);
  if (holes[1]) line(0, 'rgb(18,17,16)', TH * 0.7, P.length - 3, P.length);   // il plonge : plus fin, plus sombre
  line(-TH * 0.2, 'rgba(130,126,118,.3)', TH * 0.42, 2, P.length - 2);
  line(TH * 0.3, 'rgba(0,0,0,.35)', TH * 0.3, 2, P.length - 2);
  // la torsion : de fins reflets en biais, irréguliers
  const twist = (px, py, a) => { x.beginPath(); x.moveTo(px - 0.6, py - TH * 0.46); x.lineTo(px + 0.5, py + TH * 0.18); x.strokeStyle = `rgba(165,160,150,${a.toFixed(3)})`; x.lineWidth = 0.45; x.stroke(); };
  if (o.g0 == null) {
    for (let s = ha + 2.5 + R() * 2; s < hb - 2.5; s += 3.1 + (R() - 0.5) * 0.8) {
      const i = Math.min(P.length - 1, Math.round(s - ha)), [px, py] = P[i];
      twist(px, py, 0.07 + 0.16 * R() ** 2);
    }
  } else {
    // (attachée au fil : le m-ième reflet est toujours au même endroit de la matière)
    const sp = 3.1, Lh = hb - ha, h = m => { const v = Math.sin(m * 127.1 + 0.5) * 43758.5453; return v - Math.floor(v); };
    for (let m = Math.floor(o.g0 / sp) - 1; m * sp <= o.g0 + Lh + 1; m++) {
      const sa = m * sp + (h(m) - 0.5) * 0.8 - o.g0;
      if (sa < 2.5 || sa > Lh - 2.5) continue;
      const i = Math.min(P.length - 1, Math.max(0, Math.round(sa))), [px, py] = P[i];
      twist(px, py, 0.07 + 0.16 * h(m + 0.37) ** 2);
    }
  }
  const fiber = (s, up, l, an, a) => {
    const i = Math.min(P.length - 1, Math.max(0, Math.round(s - ha))), [px, py] = P[i];
    x.beginPath(); x.moveTo(px, py + up * TH * 0.4);
    x.quadraticCurveTo(px + l * Math.cos(an) * 0.6, py + up * (TH * 0.4 + l * Math.sin(an) * 0.6), px + l * Math.cos(an + 0.4), py + up * (TH * 0.4 + l * Math.sin(an + 0.4)));
    x.strokeStyle = `rgba(125,120,112,${a.toFixed(3)})`; x.lineWidth = 0.35; x.stroke();
  };
  if (o.g0 == null) {
    // une pointe de lustre ciré
    { const c = ha + (hb - ha) * (0.3 + 0.4 * R()), l = 6 + 8 * R(), i0 = Math.max(2, Math.round(c - l / 2 - ha)), i1 = Math.min(P.length - 2, Math.round(c + l / 2 - ha));
      if (i1 > i0) line(-TH * 0.34, 'rgba(205,199,187,.22)', 0.45, i0, i1); }
    // deux ou trois fibres qui s'échappent
    for (let f = 0, nf = 2 + Math.floor(R() * 2); f < nf; f++) fiber(ha + 6 + R() * (hb - ha - 12), R() > 0.5 ? -1 : 1, 1.2 + 2.2 * R(), 0.4 + 0.7 * R(), 0.1 + 0.15 * R());
  } else {
    // (attachés à la matière : ils défilent avec le fil) le lustre, par endroits ; quelques fibres
    const h = m => { const v = Math.sin(m * 311.7 + 1.3) * 43758.5453; return v - Math.floor(v); }, Lh = hb - ha;
    const LS = 41;
    for (let m = Math.floor(o.g0 / LS) - 1; m * LS <= o.g0 + Lh + LS; m++) {
      if (h(m) > 0.45) continue;
      const l = 6 + 9 * h(m + 0.5), c = m * LS + 18 * h(m + 0.2) - o.g0;
      const i0 = Math.max(2, Math.round(c - l / 2)), i1 = Math.min(P.length - 2, Math.round(c + l / 2));
      if (i1 > i0) line(-TH * 0.34, `rgba(205,199,187,${(0.12 + 0.12 * h(m + 0.9)).toFixed(3)})`, 0.45, i0, i1);
    }
    const FS = 29;
    for (let m = Math.floor(o.g0 / FS) - 1; m * FS <= o.g0 + Lh + FS; m++) {
      if (h(m + 7.1) > 0.4) continue;
      const sa = m * FS + 12 * h(m + 3.3) - o.g0;
      if (sa < 4 || sa > Lh - 4) continue;
      fiber(ha + sa, h(m + 5.5) > 0.5 ? -1 : 1, 1.2 + 2.2 * h(m + 2.2), 0.4 + 0.7 * h(m + 4.4), 0.1 + 0.15 * h(m + 6.6));
    }
  }
  // les deux trous : le fil y rentre (le noir du trou, un liseré de lumière sur le bord bas, côté opposé à la lampe)
  for (const hx of [holes[0] ? ha : null, holes[1] ? hb : null]) {
    if (hx == null) continue;
    const hy = y0 + 0.1 + (yf ? yf(hx + ox) : 0);
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
  let cw = 0, cdpr = 1;
  function draw(w, dpr) {
    cw = w; cdpr = dpr;
    x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, H);
    paintThread(x, 2.6, w - 2.6, H / 2, seed, TH, { g0: seed * 7 - flowNow() });
  }
  const ro = new ResizeObserver(layout); ro.observe(el);
  document.fonts && document.fonts.ready.then(layout);
  layout();
  // (12/10) il coulisse : redessiné ≈ 12 fois par seconde, seulement à l'écran
  const me = { tick: () => { if (cw && cv.isConnected && cv.offsetParent !== null) draw(cw, cdpr); } };
  flows.add(me); runFlow();
  return { layout, remove() { ro.disconnect(); cv.remove(); flows.delete(me); } };
}

// le fil coulisse (12/10) : px de matière par seconde, de gauche à droite (FLOW_V) ; une horloge commune à tous les
// bouts de fil de la page (ils avancent ensemble : un seul fil)
export const FLOW_V = 3.2;
const reducedFlow = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export const flowNow = () => (reducedFlow ? 0 : performance.now() / 1000 * FLOW_V);
const flows = new Set();
let flowRaf = 0, flowLast = 0;
function runFlow() {
  if (flowRaf || reducedFlow) return;
  const f = now => {
    flowRaf = 0;
    if (!flows.size) return;
    if (!document.hidden && now - flowLast > 80) { flowLast = now; for (const m of flows) m.tick(); }
    flowRaf = requestAnimationFrame(f);
  };
  flowRaf = requestAnimationFrame(f);
}

// (13/10) un mot sur son fil, d'un bord à l'autre de l'écran (comme ETERNEL en bas) : le fil sort d'un petit trou de
// chaque côté du mot — SINGULIES sous REJOINDRE (« rejoindre SINGULIES »). el : l'élément du mot (position relative)
export function threadWord(el, { seed = 83, TH = 1.2 } = {}) {
  const cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden', 'true');
  Object.assign(cv.style, { position: 'absolute', pointerEvents: 'none', top: '50%' });
  el.appendChild(cv);
  const x = cv.getContext('2d'), H = 20;
  let w = 0, l = 0, r = 0, dpr = 1;
  function layout() {
    const box = el.getBoundingClientRect(); if (!box.width) return;
    const ls = parseFloat(getComputedStyle(el).letterSpacing) || 0, rg = document.createRange();
    const n = [...el.childNodes].find(c => c.nodeType === 3 && c.textContent.trim()); if (!n) return;
    rg.selectNodeContents(n); const q = rg.getBoundingClientRect();
    w = innerWidth; dpr = Math.min(3, window.devicePixelRatio || 1);
    cv.width = Math.round(w * dpr); cv.height = Math.round(H * dpr);
    Object.assign(cv.style, { width: w + 'px', height: H + 'px', left: -box.left + 'px', marginTop: -H / 2 + 'px' });
    l = q.left - 5; r = q.right - ls + 5;
    draw();
  }
  function draw() {
    if (!w) return;
    const t = performance.now() / 1000, fl = flowNow();
    x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, H);
    paintThread(x, -4, l, H / 2, seed, TH, { holes: [false, true], sag: 0.4 + 0.5 * Math.sin(t * 0.7), g0: -4 + fl });
    paintThread(x, r, w + 4, H / 2, seed + 14, TH, { holes: [true, false], sag: 0.4 + 0.5 * Math.sin(t * 0.61 + 2), g0: r + fl });
  }
  const ro = new ResizeObserver(layout); ro.observe(el); addEventListener('resize', layout);
  document.fonts && document.fonts.ready.then(layout);
  layout();
  const me = { tick: () => { if (cv.isConnected && cv.offsetParent !== null) draw(); } };
  flows.add(me); runFlow();
  return { layout, remove() { ro.disconnect(); cv.remove(); flows.delete(me); } };
}
