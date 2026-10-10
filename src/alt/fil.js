// Le fil (11/10, Maxence : « évoquer le fait de lier, discrètement ») : un vrai fil noir, tendu d'un bord à l'autre de
// l'écran sous la description de ce qu'on reçoit. Les descriptions y sont comme enfilées : quand on passe à la suivante,
// le texte glisse et le fil coulisse avec lui (sa torsion défile), il ondule un peu, puis se calme.
// Dessiné en 2D, à la lumière du site (la lampe vient d'en haut à gauche) : un corps de coton noir retors à deux brins
// (la torsion : de fins reflets en biais, plus vifs du côté de la lumière), un lustre ciré qui court sur le haut, quelques
// fibres qui s'échappent, une très légère courbe (il pèse) et un souffle à peine visible. Rien d'autre.
const clamp01 = u => Math.min(1, Math.max(0, u));
const ease = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
// bruit lisse 1D (valeurs tirées une fois)
function noise1(seed) {
  const v = []; let s = seed;
  for (let i = 0; i < 512; i++) { s = (s * 16807) % 2147483647; v.push(s / 2147483647); }
  return x => { const i = Math.floor(x), f = x - i, a = v[((i % 512) + 512) % 512], b = v[(((i + 1) % 512) + 512) % 512]; return a + (b - a) * f * f * (3 - 2 * f); };
}

export function createFil(host, { reduced = false } = {}) {
  const cv = document.createElement('canvas');
  cv.className = 'of-fil'; cv.setAttribute('aria-hidden', 'true');
  host.appendChild(cv);
  const x = cv.getContext('2d');
  const n1 = noise1(7), n2 = noise1(91), n3 = noise1(1234);
  // les fibres qui s'échappent : à une place fixe le long du fil (elles défilent avec lui)
  const fibers = Array.from({ length: 55 }, (_, i) => { const r = k => n3(i * 7.3 + k * 13.1); return { s: r(0) * 2400, up: r(1) > 0.45 ? -1 : 1, len: 1.2 + 3.4 * r(2) ** 2, ang: 0.35 + 0.8 * r(3), a: 0.08 + 0.16 * r(4), curl: (r(5) - 0.5) * 1.2 }; });
  let W = 0, H = 0, dpr = 1, y0 = 0;
  let slide = 0, slideFrom = 0, slideTo = 0, slideT0 = -9, wave = 0, waveDir = 1, waveT0 = -9, drawIn = 0, raf = 0, last = 0, t = 0, on = true;
  const TH = 1.3;                                                           // épaisseur (px) : un fil fin, pas un trait
  function size() {
    const r = host.getBoundingClientRect();
    dpr = Math.min(3, window.devicePixelRatio || 1);
    W = Math.round(r.width); H = 26;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    y0 = H / 2 - 2;
  }
  // la forme du fil à l'instant : une courbe à peine affaissée, un souffle, l'onde du dernier geste
  function yAt(px) {
    const u = px / W, sag = 2.2 * (1 - (2 * u - 1) ** 2);
    const breath = reduced ? 0 : 0.35 * Math.sin(t * 0.7 + u * 2.1) + 0.2 * (n1(px * 0.012 + t * 0.15) - 0.5);
    const wt = t - waveT0, wv = wt > 0 && wt < 2.2 && !reduced ? 2.4 * Math.exp(-wt * 2.4) * Math.sin(px * 0.035 - waveDir * wt * 9) * Math.sin(Math.PI * clamp01(u * 1.02)) : 0;
    return y0 + sag + breath + wv;
  }
  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now; t += dt;
    if (!on) return;
    const st = clamp01((t - slideT0) / 0.75);
    slide = slideFrom + (slideTo - slideFrom) * ease(st);
    drawIn = Math.min(1, drawIn + dt / 1.1);
    draw();
    raf = requestAnimationFrame(frame);
  }
  function draw() {
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.clearRect(0, 0, W, H);
    const xEnd = reduced ? W + 8 : -8 + (W + 16) * ease(drawIn);           // il se tend de gauche à droite, à l'arrivée
    if (xEnd < -4) return;
    // le chemin (pas de 1,5 px), sa normale
    const P = [];
    for (let px = -8; px <= xEnd; px += 1.5) P.push([px, yAt(px)]);
    if (P.length < 2) return;
    // 1. une ombre diffuse à peine (le fil flotte devant le fond)
    x.lineCap = 'round'; x.lineJoin = 'round';
    x.beginPath(); P.forEach(([a, b], i) => (i ? x.lineTo(a, b + 1.2) : x.moveTo(a, b + 1.2)));
    x.strokeStyle = 'rgba(0,0,0,.55)'; x.lineWidth = TH + 2.2; x.filter = 'blur(1.2px)'; x.stroke(); x.filter = 'none';
    // 2. le corps : coton noir (un peu plus clair que le fond, sinon on ne le verrait pas)
    const line = (dy, col, w) => { x.beginPath(); P.forEach(([a, b], i) => (i ? x.lineTo(a, b + dy) : x.moveTo(a, b + dy))); x.strokeStyle = col; x.lineWidth = w; x.stroke(); };
    line(0, 'rgb(27,26,24)', TH);
    // le modelé d'un petit cylindre : le côté éclairé (en haut), un bord plus sombre en bas
    line(-TH * 0.2, 'rgba(118,114,106,.2)', TH * 0.42);
    line(TH * 0.3, 'rgba(0,0,0,.35)', TH * 0.3);
    // 3. la torsion : à peine visible (de fins reflets en biais, irréguliers, plus vifs du côté de la lumière) ; elle défile
    //    quand le fil coulisse
    const ph = slide;
    for (let i = 1; i < P.length; i++) {
      const [ax, ay] = P[i - 1], [bx, by] = P[i];
      const tx = bx - ax, ty = by - ay, tl = Math.hypot(tx, ty) || 1, ux = tx / tl, uy = ty / tl, nx = -uy, ny = ux;
      const pitch = 3.3, k0 = Math.ceil((ax + ph) / pitch), k1 = Math.floor((bx + ph) / pitch);
      for (let k = k0; k <= k1; k++) {
        const s = k * pitch - ph + (n2(k * 0.71) - 0.5) * 0.9, f = (s - ax) / (tx || 1), px = ax + tx * f, py = ay + ty * f;
        const a = (0.06 + 0.16 * n2(k * 0.37 + 3.1) ** 2) * ((k & 1) ? 1 : 0.6);
        x.beginPath();
        x.moveTo(px + nx * (-TH * 0.46) - ux * 0.6, py + ny * (-TH * 0.46) - uy * 0.6);
        x.lineTo(px + nx * (TH * 0.18) + ux * 0.5, py + ny * (TH * 0.18) + uy * 0.5);
        x.strokeStyle = `rgba(160,155,146,${a.toFixed(3)})`; x.lineWidth = 0.45; x.stroke();
      }
    }
    // 4. le lustre ciré : un filet de lumière sur le haut, qui va et vient le long du fil
    x.beginPath(); let started = false;
    for (const [a, b] of P) {
      const gl = n1(a * 0.008 + 11 + slide * 0.004) ** 2;
      if (gl < 0.18) { started = false; continue; }
      if (!started) { x.moveTo(a, b - TH * 0.32); started = true; } else x.lineTo(a, b - TH * 0.32);
    }
    x.strokeStyle = 'rgba(200,194,182,.2)'; x.lineWidth = 0.45; x.stroke();
    // 5. quelques fibres qui s'échappent (elles défilent avec le fil)
    for (const f of fibers) {
      const s = ((f.s - slide) % 2400 + 2400) % 2400 - 8;
      if (s > xEnd || s > W + 4) continue;
      const y = yAt(s), dir = f.up, l = f.len;
      x.beginPath();
      x.moveTo(s, y + dir * TH * 0.4);
      x.quadraticCurveTo(s + l * Math.cos(f.ang) * 0.6, y + dir * (TH * 0.4 + l * Math.sin(f.ang) * 0.6), s + l * Math.cos(f.ang + f.curl), y + dir * (TH * 0.4 + l * Math.sin(f.ang + f.curl)));
      x.strokeStyle = `rgba(120,116,108,${f.a.toFixed(3)})`; x.lineWidth = 0.35; x.stroke();
    }
  }
  // le texte change : le fil coulisse d'autant, dans le sens du geste, et ondule un peu
  function pull(dir = 1) {
    slideFrom = slide; slideTo = slide + dir * 64; slideT0 = t;
    waveDir = dir; waveT0 = t;
    if (!raf && on) raf = requestAnimationFrame(frame);
  }
  const ro = new ResizeObserver(() => { size(); draw(); });
  ro.observe(host);
  size();
  const vis = () => { on = !document.hidden; if (on && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  document.addEventListener('visibilitychange', vis);
  last = performance.now(); raf = requestAnimationFrame(frame);
  return {
    pull,
    destroy() { on = false; cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener('visibilitychange', vis); cv.remove(); },
  };
}
