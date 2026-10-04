// Matières des cartes, tirées des photos de ressources/cartes/photos (lancé une fois, hors exécution).
//   node tools/cards-assets.mjs
// 1) redresse chaque carte (4 bords ajustés par moindres carrés → homographie) à PXMM px/mm,
//    en gris, dans ressources/cartes/redresse/ (références du banc d'essai) ;
// 2) papier : relief relatif du dos (luminance / flou large, logo remplacé par du papier voisin)
//    → public/cards/paper.jpg ;
// 3) logo : distance signée (mm) au contour du SVG → public/cards/logo.png.
// Le décodage JPEG (avec orientation EXIF) et le dessin du SVG passent par Chromium (Playwright).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'ressources/cartes/photos');
const OUT_REF = path.join(ROOT, 'ressources/cartes/redresse');
const OUT_PUB = path.join(ROOT, 'public/cards');
const CARD_W = 87, CARD_H = 51.5;     // mm (relevé 04/10)
const PXMM = 24;                    // px/mm des textures
const BACK = 'IMG_0063.jpeg';       // dos, lumière diffuse

fs.mkdirSync(OUT_REF, { recursive: true });
fs.mkdirSync(OUT_PUB, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<canvas id=c></canvas>');

const dataUrl = (f, mime) => `data:${mime};base64,${fs.readFileSync(f).toString('base64')}`;
const save = (f, url) => fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));

// ---- 1) redressement ----
const report = {};
for (const f of fs.readdirSync(SRC).filter(n => /\.jpe?g$/i.test(n)).sort()) {
  const r = await page.evaluate(async ({ url, CARD_W, CARD_H, PXMM }) => {
    const img = new Image(); img.src = url; await img.decode();
    const W = img.naturalWidth, H = img.naturalHeight;
    const cv = new OffscreenCanvas(W, H), cx = cv.getContext('2d');
    cx.drawImage(img, 0, 0);
    const d = cx.getImageData(0, 0, W, H).data;
    const L = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) L[i] = 0.2126 * d[4 * i] + 0.7152 * d[4 * i + 1] + 0.0722 * d[4 * i + 2];
    // la carte = composante sombre (grille de 8 px) qui contient le bloc 64 px le plus sombre ;
    // les chiffres de la règle et les coins assombris de la photo n'y sont pas reliés
    const T = 90, G = 8, gw = Math.floor(W / G), gh = Math.floor(H / G);
    const dark = new Uint8Array(gw * gh);
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) dark[j * gw + i] = L[j * G * W + i * G] < 70 ? 1 : 0;
    let best = 1e9, seed = 0;
    for (let j = 4; j < gh - 4; j += 8) for (let i = 4; i < gw - 4; i += 8) {
      let s = 0; for (let b = -4; b < 4; b++) for (let a = -4; a < 4; a++) s += L[(j + b) * G * W + (i + a) * G];
      if (s < best) { best = s; seed = j * gw + i; }
    }
    // fermeture des trous (texte, reflets du gaufrage) : remplissage depuis la graine avec tolérance
    const seen = new Uint8Array(gw * gh), st = [seed]; seen[seed] = 1;
    let x0 = W, x1 = 0, y0 = H, y1 = 0;
    while (st.length) {
      const k = st.pop(), i = k % gw, j = (k / gw) | 0;
      const x = i * G, y = j * G; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ii = i + a, jj = j + b; if (ii < 0 || jj < 0 || ii >= gw || jj >= gh) continue;
        const kk = jj * gw + ii; if (seen[kk]) continue;
        // voisin sombre, ou clair mais entouré de sombre à ±3 cases des deux côtés (encre, reflet)
        let ok = dark[kk];
        if (!ok) { let l = 0, r = 0; for (let t = 1; t <= 6; t++) { if (dark[jj * gw + Math.max(0, ii - t)]) l = 1; if (dark[jj * gw + Math.min(gw - 1, ii + t)]) r = 1; } ok = l && r && L[jj * G * W + ii * G] < 200; }
        if (ok) { seen[kk] = 1; st.push(kk); }
      }
    }
    // points de bord (sous-pixel) sur le tiers central de chaque côté, puis droite ajustée
    const at = (x, y) => L[Math.round(y) * W + Math.round(x)];
    const cross = (fx, fy, a, b, dir) => {     // premier passage sous T entre a et b le long d'une ligne
      for (let t = a; dir > 0 ? t < b : t > b; t += dir) {
        const v0 = at(fx(t), fy(t)), v1 = at(fx(t + dir), fy(t + dir));
        if (v0 >= T && v1 < T) return t + dir * (v0 - T) / (v0 - v1);
      }
      return null;
    };
    const fit = pts => {          // droite v = a·u + b (moindres carrés)
      let n = pts.length, su = 0, sv = 0, suu = 0, suv = 0;
      for (const [u, v] of pts) { su += u; sv += v; suu += u * u; suv += u * v; }
      const a = (n * suv - su * sv) / (n * suu - su * su); return [a, (sv - a * su) / n];
    };
    const m = 40, top = [], bot = [], lef = [], rig = [];
    for (let x = x0 + (x1 - x0) * 0.2; x < x0 + (x1 - x0) * 0.8; x += 6) {
      const a = cross(() => x, t => t, y0 - m, y1, 1); if (a != null) top.push([x, a]);
      const b = cross(() => x, t => t, y1 + m, y0, -1); if (b != null) bot.push([x, b]);
    }
    for (let y = y0 + (y1 - y0) * 0.2; y < y0 + (y1 - y0) * 0.8; y += 6) {
      const a = cross(t => t, () => y, x0 - m, x1, 1); if (a != null) lef.push([y, a]);
      const b = cross(t => t, () => y, x1 + m, x0, -1); if (b != null) rig.push([y, b]);
    }
    const [ta, tb] = fit(top), [ba, bb] = fit(bot), [la, lb] = fit(lef), [ra, rb] = fit(rig);
    // intersections : y = ta·x + tb et x = la·y + lb
    const meet = (ha, hb, va, vb) => { const y = (ha * vb + hb) / (1 - ha * va); return [va * y + vb, y]; };
    const C = [meet(ta, tb, la, lb), meet(ta, tb, ra, rb), meet(ba, bb, ra, rb), meet(ba, bb, la, lb)];
    // homographie destination (u,v en px) → source
    const DW = Math.round(CARD_W * PXMM), DH = Math.round(CARD_H * PXMM);
    const D = [[0, 0], [DW, 0], [DW, DH], [0, DH]];
    const A = [], B = [];
    for (let i = 0; i < 4; i++) {
      const [u, v] = D[i], [x, y] = C[i];
      A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]); B.push(x);
      A.push([0, 0, 0, u, v, 1, -u * y, -v * y]); B.push(y);
    }
    for (let i = 0; i < 8; i++) {   // Gauss
      let p = i; for (let k = i + 1; k < 8; k++) if (Math.abs(A[k][i]) > Math.abs(A[p][i])) p = k;
      [A[i], A[p]] = [A[p], A[i]]; [B[i], B[p]] = [B[p], B[i]];
      for (let k = 0; k < 8; k++) if (k !== i) {
        const f = A[k][i] / A[i][i]; for (let j = i; j < 8; j++) A[k][j] -= f * A[i][j]; B[k] -= f * B[i];
      }
    }
    const h = B.map((b, i) => b / A[i][i]);
    const out = new OffscreenCanvas(DW, DH), ox = out.getContext('2d'), od = ox.createImageData(DW, DH);
    const g = new Float32Array(DW * DH);
    for (let v = 0; v < DH; v++) for (let u = 0; u < DW; u++) {
      const w = h[6] * u + h[7] * v + 1, x = (h[0] * u + h[1] * v + h[2]) / w, y = (h[3] * u + h[4] * v + h[5]) / w;
      const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, k = yi * W + xi;
      const val = (L[k] * (1 - fx) + L[k + 1] * fx) * (1 - fy) + (L[k + W] * (1 - fx) + L[k + W + 1] * fx) * fy;
      g[v * DW + u] = val;
      const o = 4 * (v * DW + u); od.data[o] = od.data[o + 1] = od.data[o + 2] = val; od.data[o + 3] = 255;
    }
    ox.putImageData(od, 0, 0);
    const blob = await out.convertToBlob({ type: 'image/png' });
    const png = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
    // dimensions apparentes (px source) pour contrôle du rapport largeur/hauteur
    const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
    const ratio = (dist(C[0], C[1]) + dist(C[3], C[2])) / (dist(C[0], C[3]) + dist(C[1], C[2]));
    return { png, corners: C.map(p => p.map(Math.round)), ratio: +ratio.toFixed(3), key: url.length };
  }, { url: dataUrl(path.join(SRC, f), 'image/jpeg'), CARD_W, CARD_H, PXMM });
  save(path.join(OUT_REF, f.replace(/\.jpe?g$/i, '.png')), r.png);
  report[f] = { corners: r.corners, ratio: r.ratio, key: r.key };
}
console.log(JSON.stringify(Object.fromEntries(Object.entries(report).map(([k, v]) => [k, { coins: v.corners, rapport: v.ratio }])), null, 1));

// ---- 3) logo : SDF en mm (sert aussi à masquer le logo dans le papier) ----
const LOGO_PX = 1024;           // texture carrée ; le SVG fait 1254 unités
const svg = fs.readFileSync(path.join(ROOT, 'ressources/cartes/logo_singulies.svg'), 'utf8');
const logo = await page.evaluate(async ({ svg, N }) => {
  const img = new Image(); img.src = 'data:image/svg+xml;base64,' + btoa(svg); await img.decode();
  const S = 2048, cv = new OffscreenCanvas(S, S), cx = cv.getContext('2d');
  cx.fillStyle = '#fff'; cx.fillRect(0, 0, S, S); cx.drawImage(img, 0, 0, S, S);
  const d = cx.getImageData(0, 0, S, S).data;
  // boîte englobante du logo (unités SVG)
  let x0 = S, x1 = 0, y0 = S, y1 = 0;
  const inside = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) { const c = 1 - d[4 * i] / 255; inside[i] = c; if (c > 0.5) { const x = i % S, y = (i / S) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
  // EDT 1D (Felzenszwalb) sur les deux phases → distance signée en px de S
  const edt = (f, n) => {
    const v = new Int32Array(n), z = new Float64Array(n + 1), out = new Float64Array(n); let k = 0; v[0] = 0; z[0] = -1e20; z[1] = 1e20;
    const sx = (q, p) => ((f[q] + q * q) - (f[p] + p * p)) / (2 * q - 2 * p);
    for (let q = 1; q < n; q++) {
      let s = sx(q, v[k]);
      while (s <= z[k]) { k--; s = sx(q, v[k]); }
      k++; v[k] = q; z[k] = s; z[k + 1] = 1e20;
    }
    k = 0; for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; const p = v[k]; out[q] = (q - p) * (q - p) + f[p]; } return out;
  };
  const dt = inv => {
    const g = new Float64Array(S * S), INF = 1e20;
    for (let i = 0; i < S * S; i++) g[i] = (inv ? inside[i] <= 0.5 : inside[i] > 0.5) ? 0 : INF;
    const col = new Float64Array(S);
    for (let x = 0; x < S; x++) { for (let y = 0; y < S; y++) col[y] = g[y * S + x]; const r = edt(col, S); for (let y = 0; y < S; y++) g[y * S + x] = r[y]; }
    for (let y = 0; y < S; y++) { const r = edt(g.subarray(y * S, y * S + S), S); g.set(r, y * S); }
    return g;
  };
  const dOut = dt(false), dIn = dt(true);
  return { x0, x1, y0, y1, S, sd: Array.from({ length: N * N }, (_, i) => {
    const x = Math.floor((i % N) * S / N), y = Math.floor(Math.floor(i / N) * S / N), k = y * S + x;
    return Math.sqrt(dOut[k]) - Math.sqrt(dIn[k]);      // > 0 dehors, < 0 dedans (px de S)
  }) };
}, { svg, N: LOGO_PX });
console.log('logo boîte (px de 2048) :', logo.x0, logo.x1, logo.y0, logo.y1);


// Encodage : distance signée en mm, ±LOGO_RANGE → 16 bits (R = octet fort, V = octet faible ; 0,5 = contour), carré de LOGO_SQ mm
// (le SVG : boîte du logo mesurée sur le dos redressé ≈ 33,2 mm de large, 33 mm de haut).
const LOGO_W_MM = 33.2, LOGO_RANGE = 2;
const unitsPerPx = 1254 / logo.S, logoWUnits = (logo.x1 - logo.x0) * unitsPerPx;
const mmPerUnit = LOGO_W_MM / logoWUnits, mmPerPx2048 = mmPerUnit * unitsPerPx;
const LOGO_SQ = 1254 * mmPerUnit;
const logoPng = await page.evaluate(async ({ sd, N, k, R }) => {
  const cv = new OffscreenCanvas(N, N), cx = cv.getContext('2d'), im = cx.createImageData(N, N);
  for (let i = 0; i < N * N; i++) { const v = Math.max(0, Math.min(65535, Math.round((0.5 + 0.5 * sd[i] * k / R) * 65535))); im.data[4 * i] = v >> 8; im.data[4 * i + 1] = v & 255; im.data[4 * i + 2] = 0; im.data[4 * i + 3] = 255; }
  cx.putImageData(im, 0, 0);
  const blob = await cv.convertToBlob({ type: 'image/png' });
  return await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
}, { sd: logo.sd, N: LOGO_PX, k: mmPerPx2048, R: LOGO_RANGE });
save(path.join(OUT_PUB, 'logo.png'), logoPng);

// ---- 2) papier : relief relatif du dos ----
// R = L / moyenne locale (σ ≈ 6 mm, convolution normalisée sur l'intérieur de la carte) ;
// la zone du logo est remplie par du papier voisin (gauche et droite), coutures fondues.
const LOGO_BOX = { x0: 23.5, x1: 61.5, y0: 6.0, y1: 43.0 };   // mm, dos redressé, logo + marge
const paper = await page.evaluate(async ({ url, PXMM, CW, CH, B }) => {
  const img = new Image(); img.src = url; await img.decode();
  const W = img.naturalWidth, H = img.naturalHeight, cv = new OffscreenCanvas(W, H), cx = cv.getContext('2d');
  cx.drawImage(img, 0, 0); const d = cx.getImageData(0, 0, W, H).data;
  const L = new Float32Array(W * H); for (let i = 0; i < W * H; i++) L[i] = d[4 * i];
  const mm = v => v * PXMM, sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  // masque intérieur : rectangle arrondi (r 3 mm) rentré de 1 mm ; la moyenne locale ignore la zone du logo
  const M = new Float32Array(W * H), Mb = new Float32Array(W * H), r = mm(3), ins = mm(1);
  const inBox = (x, y) => x > mm(B.x0) && x < mm(B.x1) && y > mm(B.y0) && y < mm(B.y1);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const qx = Math.max(0, Math.abs(x - W / 2) - (W / 2 - r)), qy = Math.max(0, Math.abs(y - H / 2) - (H / 2 - r));
    const k = y * W + x; M[k] = Math.hypot(qx, qy) <= r - ins && Math.abs(x - W / 2) < W / 2 - ins && Math.abs(y - H / 2) < H / 2 - ins ? 1 : 0;
    Mb[k] = M[k] && !inBox(x, y) ? 1 : 0;
  }
  const blur = (src, rad) => {   // 3 flous boîte ≈ gaussienne
    let a = src.slice(), b = new Float32Array(W * H);
    for (let p = 0; p < 3; p++) {
      for (let y = 0; y < H; y++) { let s = 0; for (let x = -rad; x <= rad; x++) s += a[y * W + Math.min(W - 1, Math.max(0, x))]; for (let x = 0; x < W; x++) { b[y * W + x] = s / (2 * rad + 1); s += a[y * W + Math.min(W - 1, x + rad + 1)] - a[y * W + Math.max(0, x - rad)]; } }
      for (let x = 0; x < W; x++) { let s = 0; for (let y = -rad; y <= rad; y++) s += b[Math.min(H - 1, Math.max(0, y)) * W + x]; for (let y = 0; y < H; y++) { a[y * W + x] = s / (2 * rad + 1); s += b[Math.min(H - 1, y + rad + 1) * W + x] - b[Math.max(0, y - rad) * W + x]; } }
    }
    return a;
  };
  const LM = new Float32Array(W * H); for (let i = 0; i < W * H; i++) LM[i] = L[i] * Mb[i];
  const rad = Math.round(mm(6) * 0.58);
  const bl = blur(LM, rad), bm = blur(Mb, rad);
  const R0 = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) R0[i] = M[i] ? L[i] / Math.max(1, bl[i] / Math.max(1e-3, bm[i])) : 1;
  // zone du logo : relief relatif pris à gauche (moitié gauche) et à droite (moitié droite), retourné
  // verticalement pour ne pas répéter les marques voisines ; bords et couture fondus sur 2 mm
  const mid = (B.x0 + B.x1) / 2, sh = mm(mid - B.x0 + 2.0), F = mm(2), yS = mm(B.y0 + B.y1);
  const R = R0.slice();
  for (let y = Math.round(mm(B.y0) - F); y < mm(B.y1) + F; y++) for (let x = Math.round(mm(B.x0) - F); x < mm(B.x1) + F; x++) {
    const inX = Math.min(sm(mm(B.x0) - F, mm(B.x0), x), 1 - sm(mm(B.x1), mm(B.x1) + F, x));
    const inY = Math.min(sm(mm(B.y0) - F, mm(B.y0), y), 1 - sm(mm(B.y1), mm(B.y1) + F, y));
    const w = inX * inY; if (w <= 0) continue;
    const ys = Math.min(H - 1, Math.max(0, Math.round(yS - y)));
    const a = R0[ys * W + Math.round(x - sh)], b = R0[ys * W + Math.round(x + sh)];
    const s = sm(mm(mid) - F / 2, mm(mid) + F / 2, x);
    R[y * W + x] = R0[y * W + x] * (1 - w) + (a * (1 - s) + b * s) * w;
  }
  const out = new OffscreenCanvas(W, H), ox = out.getContext('2d'), od = ox.createImageData(W, H);
  let n = 0, s1 = 0, s2 = 0, lo = 1e9, hi = 0, meanL = 0;
  for (let i = 0; i < W * H; i++) {
    if (M[i]) { n++; s1 += R[i]; s2 += R[i] * R[i]; lo = Math.min(lo, R[i]); hi = Math.max(hi, R[i]); meanL += L[i]; }
    const v = Math.max(0, Math.min(255, Math.round(128 + (R[i] - 1) * 255)));
    od.data[4 * i] = od.data[4 * i + 1] = od.data[4 * i + 2] = v; od.data[4 * i + 3] = 255;
  }
  ox.putImageData(od, 0, 0);
  const blob = await out.convertToBlob({ type: 'image/jpeg', quality: 0.92 });
  const jpg = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
  const mean = s1 / n;
  return { jpg, stats: { moyenne: +mean.toFixed(3), ecartType: +Math.sqrt(s2 / n - mean * mean).toFixed(3), min: +lo.toFixed(2), max: +hi.toFixed(2), luminancePhoto: +(meanL / n).toFixed(1) } };
}, { url: dataUrl(path.join(OUT_REF, BACK.replace(/\.jpe?g$/i, '.png')), 'image/png'), PXMM, CW: CARD_W, CH: CARD_H, B: LOGO_BOX });
save(path.join(OUT_PUB, 'paper.jpg'), paper.jpg);
console.log('papier :', JSON.stringify(paper.stats));

await browser.close();
const meta = { carte: { largeur: CARD_W, hauteur: CARD_H, rayon: 3 }, papier: { pxmm: PXMM, encodage: 'R = 1 + (v - 128) / 255' },
  logo: { carre: +LOGO_SQ.toFixed(3), largeur: LOGO_W_MM, encodage: `v = (R·256 + V) / 65535 ; d_mm = (2v − 1) × ${LOGO_RANGE}, < 0 dedans` } };
fs.writeFileSync(path.join(OUT_PUB, 'cards.json'), JSON.stringify(meta, null, 1));
console.log(JSON.stringify(meta));
