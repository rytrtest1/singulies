// La machine à écrire (18/10) : l'occlusion ambiante cuite par sommet — la lumière du décor n'entre pas dans les
// creux (entre les touches, sous le capot, au pied de la machine sur la table). Sans elle, chaque pièce reçoit la même
// ambiance que si elle flottait seule : un rendu « jouet ». Rayons depuis chaque sommet (deux hémisphères : le modèle
// n'est pas fermé partout, la normale peut pointer vers l'intérieur — on garde le côté le plus ouvert), arbre de boîtes,
// la table (z = 0) compte comme obstacle.
//   node tools/machine-ao.mjs [qdl39|royal]  → public/machine/<profil>-ao.bin (u8 par sommet, 255 = ouvert)
import { readFileSync, writeFileSync } from 'node:fs';

const prof = process.argv[2] || 'qdl39';
const meta = JSON.parse(readFileSync(`public/machine/${prof}.json`, 'utf8'));
const buf = readFileSync(`public/machine/${prof}.bin`);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const { nv, ni, offs } = meta;
const P = new Float32Array(ab, offs[0], nv * 3), N = new Int16Array(ab, offs[1], nv * 3), I = new Uint32Array(ab, offs[4], ni);
const nt = ni / 3;

// les triangles, et un arbre de boîtes (coupe au milieu de l'axe le plus long)
const tri = new Float32Array(nt * 9), cen = new Float32Array(nt * 3);
for (let t = 0; t < nt; t++) for (let v = 0; v < 3; v++) for (let c = 0; c < 3; c++) {
  const x = P[I[t * 3 + v] * 3 + c]; tri[t * 9 + v * 3 + c] = x; cen[t * 3 + c] += x / 3;
}
const order = new Uint32Array(nt).map((_, i) => i);
const nodes = [];   // { lo, hi, l, r, s, n }
function build(s, n) {
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (let k = s; k < s + n; k++) { const t = order[k]; for (let v = 0; v < 3; v++) for (let c = 0; c < 3; c++) { const x = tri[t * 9 + v * 3 + c]; if (x < lo[c]) lo[c] = x; if (x > hi[c]) hi[c] = x; } }
  const id = nodes.length, nd = { lo, hi, l: -1, r: -1, s, n }; nodes.push(nd);
  if (n <= 6) return id;
  const ax = [0, 1, 2].sort((a, b) => (hi[b] - lo[b]) - (hi[a] - lo[a]))[0];
  const sub = Array.from(order.subarray(s, s + n)).sort((a, b) => cen[a * 3 + ax] - cen[b * 3 + ax]);
  order.set(sub, s);
  const h = n >> 1;
  nd.l = build(s, h); nd.r = build(s + h, n - h);
  return id;
}
build(0, nt);

const EPS = 1e-7;
function hitTri(t, o, d, tmax) {
  const b = t * 9, ax = tri[b], ay = tri[b + 1], az = tri[b + 2];
  const e1x = tri[b + 3] - ax, e1y = tri[b + 4] - ay, e1z = tri[b + 5] - az, e2x = tri[b + 6] - ax, e2y = tri[b + 7] - ay, e2z = tri[b + 8] - az;
  const px = d[1] * e2z - d[2] * e2y, py = d[2] * e2x - d[0] * e2z, pz = d[0] * e2y - d[1] * e2x;
  const det = e1x * px + e1y * py + e1z * pz; if (det > -EPS && det < EPS) return false;
  const inv = 1 / det, tx = o[0] - ax, ty = o[1] - ay, tz = o[2] - az;
  const u = (tx * px + ty * py + tz * pz) * inv; if (u < 0 || u > 1) return false;
  const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
  const v = (d[0] * qx + d[1] * qy + d[2] * qz) * inv; if (v < 0 || u + v > 1) return false;
  const s = (e2x * qx + e2y * qy + e2z * qz) * inv;
  return s > 1e-3 && s < tmax;
}
const stack = new Int32Array(128);
function occluded(o, d, tmax) {
  if (d[2] < 0 && -o[2] / d[2] < tmax) return true;          // la table
  const id = [1 / d[0], 1 / d[1], 1 / d[2]];
  let sp = 0; stack[sp++] = 0;
  while (sp) {
    const nd = nodes[stack[--sp]];
    let t0 = 0, t1 = tmax;
    for (let c = 0; c < 3; c++) {
      let a = (nd.lo[c] - o[c]) * id[c], b = (nd.hi[c] - o[c]) * id[c];
      if (a > b) { const x = a; a = b; b = x; }
      if (a > t0) t0 = a; if (b < t1) t1 = b; if (t0 > t1) break;
    }
    if (t0 > t1) continue;
    if (nd.l < 0) { for (let k = nd.s; k < nd.s + nd.n; k++) if (hitTri(order[k], o, d, tmax)) return true; }
    else { stack[sp++] = nd.l; stack[sp++] = nd.r; }
  }
  return false;
}

// des directions cosinus autour de +z (suite de Hammersley), tournées vers chaque normale
const NR = 72, RANGE = 70;                                  // rayons par hémisphère ; portée (mm)
const dirs = [];
for (let k = 0; k < NR; k++) {
  let b = k, r = 0, f = 0.5; while (b) { if (b & 1) r += f; b >>= 1; f /= 2; }
  const u = (k + 0.5) / NR, phi = 2 * Math.PI * r, s = Math.sqrt(u);
  dirs.push([s * Math.cos(phi), s * Math.sin(phi), Math.sqrt(1 - u)]);
}
const ao = new Uint8Array(nv);
const t0 = Date.now();
for (let v = 0; v < nv; v++) {
  const o = [P[v * 3], P[v * 3 + 1], P[v * 3 + 2]];
  let n = [N[v * 3] / 32767, N[v * 3 + 1] / 32767, N[v * 3 + 2] / 32767];
  const ln = Math.hypot(...n) || 1; n = n.map(x => x / ln);
  let best = 0;
  for (const sg of [1, -1]) {
    const nn = n.map(x => x * sg);
    const a = Math.abs(nn[0]) > 0.9 ? [0, 1, 0] : [1, 0, 0];
    let tx = [nn[1] * a[2] - nn[2] * a[1], nn[2] * a[0] - nn[0] * a[2], nn[0] * a[1] - nn[1] * a[0]];
    const lt = Math.hypot(...tx); tx = tx.map(x => x / lt);
    const ty = [nn[1] * tx[2] - nn[2] * tx[1], nn[2] * tx[0] - nn[0] * tx[2], nn[0] * tx[1] - nn[1] * tx[0]];
    const oo = [o[0] + nn[0] * 0.05, o[1] + nn[1] * 0.05, o[2] + nn[2] * 0.05];
    let open = 0;
    for (const [x, y, z] of dirs) {
      const d = [tx[0] * x + ty[0] * y + nn[0] * z, tx[1] * x + ty[1] * y + nn[1] * z, tx[2] * x + ty[2] * y + nn[2] * z];
      if (!occluded(oo, d, RANGE)) open++;
    }
    best = Math.max(best, open / NR);
  }
  ao[v] = Math.round(best * 255);
  if (v % 4000 === 0) console.log(v, '/', nv, ((Date.now() - t0) / 1000).toFixed(1) + ' s');
}
writeFileSync(`public/machine/${prof}-ao.bin`, ao);
const h = new Array(10).fill(0); for (const a of ao) h[Math.min(9, a / 25.6 | 0)]++;
console.log('fini', ((Date.now() - t0) / 1000).toFixed(1) + ' s', 'histogramme', h.join(' '));
