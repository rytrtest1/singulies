// Atlas de lettres en champ de distance signé (SDF), EDT maison (Felzenszwalb–Huttenlocher)
// avec correction sous-pixel d'après la couverture antialiasée (même principe que tiny-sdf).
// Stockage : distance signée en em (positive à l'intérieur), Float32 → texture R16F filtrable.

export const ATLAS_EM = 128;         // px par em dans l'atlas
export const ATLAS_RADIUS = 48;      // portée du champ en px atlas (≈ 0,375 em)
const INF = 1e20;

function edt1d(grid, offset, stride, length, f, v, z) {
  v[0] = 0; z[0] = -INF; z[1] = INF;
  for (let q = 0; q < length; q++) f[q] = grid[offset + q * stride];
  for (let q = 1, k = 0, s = 0; q < length; q++) {
    do {
      const r = v[k];
      s = (f[q] - f[r] + q * q - r * r) / (q - r) / 2;
    } while (s <= z[k] && --k > -1);
    k++; v[k] = q; z[k] = s; z[k + 1] = INF;
  }
  for (let q = 0, k = 0; q < length; q++) {
    while (z[k + 1] < q) k++;
    const r = v[k];
    grid[offset + q * stride] = f[r] + (q - r) * (q - r);
  }
}

function edt(grid, w, h, f, v, z) {
  for (let x = 0; x < w; x++) edt1d(grid, x, w, h, f, v, z);
  for (let y = 0; y < h; y++) edt1d(grid, y * w, 1, w, f, v, z);
}

// Construit l'atlas pour `chars` (famille CSS, graisse).
export function buildAtlas(chars, family, weight = 500) {
  const fontAt = (px) => `${weight} ${px}px ${family}`;
  const R = ATLAS_RADIUS, pad = R + 2, EM = ATLAS_EM;
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.font = fontAt(EM);
  const metr = [...chars].map((ch) => {
    const m = ctx.measureText(ch);
    const l = Math.ceil(m.actualBoundingBoxLeft), r = Math.ceil(m.actualBoundingBoxRight);
    const a = Math.ceil(m.actualBoundingBoxAscent), d = Math.ceil(m.actualBoundingBoxDescent);
    return { ch, adv: m.width, l, r, a, d, w: l + r + 2 * pad, h: a + d + 2 * pad };
  });
  // métriques globales utiles à la mise en page
  const mH = ctx.measureText('H');
  const capHeight = mH.actualBoundingBoxAscent / EM;
  const mx = ctx.measureText('x');
  const xHeight = mx.actualBoundingBoxAscent / EM;

  // rangement en étagères
  const W = 2048;
  let x = 0, y = 0, rowH = 0;
  for (const g of metr) {
    if (x + g.w > W) { x = 0; y += rowH; rowH = 0; }
    g.x = x; g.y = y; x += g.w; rowH = Math.max(rowH, g.h);
  }
  const H = Math.ceil((y + rowH) / 4) * 4; // multiple de 4 : l'atlas flou (¼) couvre exactement la même étendue
  const data = new Float32Array(W * H).fill(-R / EM);

  const maxW = Math.max(...metr.map((g) => g.w)), maxH = Math.max(...metr.map((g) => g.h));
  cv.width = maxW; cv.height = maxH;
  ctx.font = fontAt(EM);
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff';
  const N = maxW * maxH;
  const outer = new Float64Array(N), inner = new Float64Array(N);
  const L = Math.max(maxW, maxH);
  const f = new Float64Array(L), v = new Uint16Array(L), z = new Float64Array(L + 1);

  const glyphs = {};
  for (const g of metr) {
    const { w, h } = g;
    ctx.clearRect(0, 0, maxW, maxH);
    ctx.fillText(g.ch, pad + g.l, pad + g.a);
    const img = ctx.getImageData(0, 0, w, h).data;
    for (let i = 0; i < w * h; i++) {
      const a = img[i * 4 + 3] / 255;
      if (a === 1) { outer[i] = 0; inner[i] = INF; }
      else if (a === 0) { outer[i] = INF; inner[i] = 0; }
      else { const d = 0.5 - a; outer[i] = d > 0 ? d * d : 0; inner[i] = d < 0 ? d * d : 0; }
    }
    edt(outer, w, h, f, v, z);
    edt(inner, w, h, f, v, z);
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
      const i = yy * w + xx;
      const d = Math.sqrt(inner[i]) - Math.sqrt(outer[i]); // > 0 à l'intérieur
      data[(g.y + yy) * W + g.x + xx] = Math.max(-R, Math.min(R, d)) / EM;
    }
    // rectangle atlas (texels) et boîte plane (em, origine = point de chasse sur la ligne de base, y vers le bas)
    glyphs[g.ch] = {
      adv: g.adv / EM,
      u0: g.x / W, v0: g.y / H, u1: (g.x + w) / W, v1: (g.y + h) / H,
      x0: -(pad + g.l) / EM, y0: -(pad + g.a) / EM, x1: (w - pad - g.l) / EM, y1: (h - pad - g.a) / EM,
    };
  }
  return { width: W, height: H, data, glyphs, capHeight, xHeight, radiusEm: R / EM, blur: blurAtlas(data, W, H) };
}

// Atlas pré-flouté (couverture, σ = BLUR_EM), au ¼ de résolution : niveau de flou maximal du prototype.
// Le shader le mélange en continu avec le flou analytique (aucun palier visible).
export const BLUR_EM = 0.11;
function blurAtlas(sdf, W, H) {
  const bw = W / 4, bh = H / 4, EM = ATLAS_EM;
  const a = new Float32Array(bw * bh), t = new Float32Array(bw * bh);
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    let s = 0;
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) s += Math.min(1, Math.max(0, sdf[(y * 4 + j) * W + x * 4 + i] * EM + 0.5));
    a[y * bw + x] = s / 16;
  }
  const sg = BLUR_EM * EM / 4, r = Math.ceil(sg * 3), k = [];
  let n = 0;
  for (let i = -r; i <= r; i++) { const v = Math.exp(-i * i / (2 * sg * sg)); k.push(v); n += v; }
  for (let i = 0; i < k.length; i++) k[i] /= n;
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    let s = 0;
    for (let i = -r; i <= r; i++) { const xx = x + i; if (xx >= 0 && xx < bw) s += a[y * bw + xx] * k[i + r]; }
    t[y * bw + x] = s;
  }
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    let s = 0;
    for (let i = -r; i <= r; i++) { const yy = y + i; if (yy >= 0 && yy < bh) s += t[yy * bw + x] * k[i + r]; }
    a[y * bw + x] = s;
  }
  return { width: bw, height: bh, data: a };
}
