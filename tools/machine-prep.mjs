// La machine à écrire en 3D (18/10, essai) : un modèle existant (Royal des années 60, freddy1231, CC BY 4.0 —
// sketchfab.com/3d-models/typewriter-0b6766c2df0e4901b8c387283d544027, copie Objaverse) réduit à ce dont le moteur a
// besoin : positions (mm, repère du site : x à droite, y vers le fond, z vers le haut), normales, et pour chaque sommet
// sa matière (carrosserie, chromes, métal noir, touches, caoutchouc, papier…) et son île (une touche = une île). Les
// textures du modèle sont laissées : la matière est refaite dans le shader (papier noir, martelé, chromes sombres).
//   node tools/machine-prep.mjs <modèle.glb> [royal|qdl39]  → public/machine/<profil>.bin + <profil>.json
// (18/10, Maxence : « plutôt elle ») qdl39 : la 1939 Royal Quiet De Luxe (theforfeiterofmaidens, CC BY 4.0 —
// sketchfab.com/3d-models/1939-royal-quiet-de-luxe-56f705efbc534d339e582623735753a5), FBX converti en GLB par Blender
// (le script est dans le message du commit) ; elle n'a pas de feuille : le moteur pose la sienne.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const src = process.argv[2], prof = process.argv[3] || 'royal';
if (!src) { console.error('usage : node tools/machine-prep.mjs <modèle.glb> [royal|qdl39]'); process.exit(1); }
const f = readFileSync(src);
const jl = f.readUInt32LE(12), J = JSON.parse(f.subarray(20, 20 + jl).toString());
const binOff = 20 + jl + 8, BIN = f.subarray(binOff);

const CT = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array };
const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
function acc(i) {
  const a = J.accessors[i], bv = J.bufferViews[a.bufferView], T = CT[a.componentType], n = NC[a.type];
  const off = (bv.byteOffset || 0) + (a.byteOffset || 0), stride = bv.byteStride || T.BYTES_PER_ELEMENT * n;
  const out = new T(a.count * n);
  for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) {
    const p = off + k * stride + c * T.BYTES_PER_ELEMENT;
    out[k * n + c] = T === Float32Array ? BIN.readFloatLE(p) : T === Uint32Array ? BIN.readUInt32LE(p) : T === Uint16Array ? BIN.readUInt16LE(p) : BIN[p];
  }
  return out;
}
// matrices 4×4 (colonnes)
const mul = (a, b) => { const o = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return o; };
function local(nd) {
  if (nd.matrix) return nd.matrix.slice();
  const [x, y, z, w] = nd.rotation || [0, 0, 0, 1], [sx, sy, sz] = nd.scale || [1, 1, 1], t = nd.translation || [0, 0, 0];
  return [(1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
    2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0, t[0], t[1], t[2], 1];
}
// la matière, d'après le nom de la matière du modèle
const KIND = { body: 0, chrome: 1, black: 2, keys: 3, rubber: 4, paper: 5, label: 6, plastic: 7, other: 8 };
const PROFILS = {
  royal: { width: 300, source: 'Royal typewriter (1960s), freddy1231, CC BY 4.0, https://sketchfab.com/3d-models/typewriter-0b6766c2df0e4901b8c387283d544027',
    kindOf: n => /Default/.test(n) ? KIND.body : /Chrome/.test(n) ? KIND.chrome : /Metal_black/.test(n) ? KIND.black : /Buttons/.test(n) ? KIND.keys
      : /Rubber/.test(n) ? KIND.rubber : /Paper/.test(n) ? KIND.paper : /Label/.test(n) ? KIND.label : /Plastic/.test(n) ? KIND.plastic : KIND.other },
  // la carrosserie de 1939 : 11,5 pouces de large (292 mm)
  qdl39: { width: 292, rotZ: -Math.PI / 2, source: '1939 Royal Quiet De Luxe, theforfeiterofmaidens, CC BY 4.0, https://sketchfab.com/3d-models/1939-royal-quiet-de-luxe-56f705efbc534d339e582623735753a5',
    kindOf: n => /Black matte/.test(n) ? KIND.body : /chrome/i.test(n) ? KIND.chrome : /Scratched/.test(n) ? KIND.black : /^Keys$/.test(n) ? KIND.keys
      : /Rubber/.test(n) ? KIND.rubber : /Brand/.test(n) ? KIND.label : /fabric/i.test(n) ? KIND.other : /Brass/.test(n) ? KIND.plastic : KIND.other },
};
const PR = PROFILS[prof];
const kindOf = PR.kindOf;

const P = [], N = [], K = [], I = [], meshes = [];
function walk(i, M) {
  const nd = J.nodes[i], W = mul(M, local(nd));
  if (nd.mesh != null) for (const pr of J.meshes[nd.mesh].primitives) {
    const mat = J.materials[pr.material]?.name || '', kind = kindOf(mat);
    const pos = acc(pr.attributes.POSITION), nor = acc(pr.attributes.NORMAL), idx = pr.indices != null ? acc(pr.indices) : null;
    const v0 = P.length / 3, nv = pos.length / 3;
    for (let k = 0; k < nv; k++) {
      const x = pos[k * 3], y = pos[k * 3 + 1], z = pos[k * 3 + 2];
      P.push(W[0] * x + W[4] * y + W[8] * z + W[12], W[1] * x + W[5] * y + W[9] * z + W[13], W[2] * x + W[6] * y + W[10] * z + W[14]);
      const a = nor[k * 3], b = nor[k * 3 + 1], c = nor[k * 3 + 2];
      let nx = W[0] * a + W[4] * b + W[8] * c, ny = W[1] * a + W[5] * b + W[9] * c, nz = W[2] * a + W[6] * b + W[10] * c;
      const l = Math.hypot(nx, ny, nz) || 1; N.push(nx / l, ny / l, nz / l); K.push(kind);
    }
    const i0 = I.length;
    if (idx) for (const t of idx) I.push(v0 + t); else for (let k = 0; k < nv; k++) I.push(v0 + k);
    meshes.push({ name: J.meshes[nd.mesh].name, mat, kind, v0, nv, i0, ni: I.length - i0 });
  }
  for (const c of nd.children || []) walk(c, W);
}
for (const s of J.scenes[J.scene || 0].nodes) walk(s, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

// glTF : y vers le haut, z vers l'avant (vers nous) → repère du site : x, y = −z (vers le fond), z = y (vers le haut)
const nv = P.length / 3;
for (let k = 0; k < nv; k++) {
  const y = P[k * 3 + 1], z = P[k * 3 + 2]; P[k * 3 + 1] = -z; P[k * 3 + 2] = y;
  const ny = N[k * 3 + 1], nz = N[k * 3 + 2]; N[k * 3 + 1] = -nz; N[k * 3 + 2] = ny;
}
// l'avant de la machine vers −y (qdl39 : il regardait vers +x) — quart de tour autour de la verticale
if (PR.rotZ) for (let k = 0; k < nv; k++) for (const A of [P, N]) {
  const x = A[k * 3], y = A[k * 3 + 1], c = Math.round(Math.cos(PR.rotZ)), sn = Math.round(Math.sin(PR.rotZ));
  A[k * 3] = c * x - sn * y; A[k * 3 + 1] = sn * x + c * y;
}
// boîte, mise à l'échelle : la largeur du corps d'une Royal de bureau ≈ 300 mm (sans le levier ni les boutons)
const box = (sel) => { const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (let k = 0; k < nv; k++) if (sel(k)) for (let c = 0; c < 3; c++) { lo[c] = Math.min(lo[c], P[k * 3 + c]); hi[c] = Math.max(hi[c], P[k * 3 + c]); } return { lo, hi }; };
const bb = box(k => K[k] === KIND.body), all = box(() => true);
const s = PR.width / (bb.hi[0] - bb.lo[0]);
const cx = (bb.lo[0] + bb.hi[0]) / 2, cy = (bb.lo[1] + bb.hi[1]) / 2, z0 = all.lo[2];
for (let k = 0; k < nv; k++) { P[k * 3] = (P[k * 3] - cx) * s; P[k * 3 + 1] = (P[k * 3 + 1] - cy) * s; P[k * 3 + 2] = (P[k * 3 + 2] - z0) * s; }

// les îles des touches : sommets soudés par position (le modèle double les sommets aux arêtes vives)
const key = k => `${Math.round(P[k * 3] * 50)},${Math.round(P[k * 3 + 1] * 50)},${Math.round(P[k * 3 + 2] * 50)}`;
const par = new Int32Array(nv).map((_, i) => i);
const find = a => { while (par[a] !== a) a = par[a] = par[par[a]]; return a; };
const join = (a, b) => { a = find(a); b = find(b); if (a !== b) par[a] = b; };
const weld = new Map();
for (let k = 0; k < nv; k++) { const q = key(k); if (weld.has(q)) join(k, weld.get(q)); else weld.set(q, k); }
for (let t = 0; t < I.length; t += 3) { join(I[t], I[t + 1]); join(I[t], I[t + 2]); }
const isl = new Uint16Array(nv), ids = new Map(), info = [];
for (let k = 0; k < nv; k++) {
  const r = find(k);
  if (!ids.has(r)) { ids.set(r, ids.size); info.push({ kind: K[k], n: 0, lo: [1e9, 1e9, 1e9], hi: [-1e9, -1e9, -1e9] }); }
  const id = ids.get(r), o = info[id]; isl[k] = id; o.n++;
  for (let c = 0; c < 3; c++) { o.lo[c] = Math.min(o.lo[c], P[k * 3 + c]); o.hi[c] = Math.max(o.hi[c], P[k * 3 + c]); }
}

// sortie : positions f32, normales i16 (×32767), matière u8, île u16, indices u32
mkdirSync('public/machine', { recursive: true });
const pos = new Float32Array(P), nor = new Int16Array(N.map(v => Math.round(v * 32767))), kd = new Uint8Array(K), idx = new Uint32Array(I);
const parts = [pos, nor, kd, isl, idx];
const pad = b => { const r = (4 - b.byteLength % 4) % 4; return Buffer.concat([Buffer.from(b.buffer, b.byteOffset, b.byteLength), Buffer.alloc(r)]); };
const bufs = parts.map(pad), offs = []; let o = 0; for (const b of bufs) { offs.push(o); o += b.length; }
writeFileSync(`public/machine/${prof}.bin`, Buffer.concat(bufs));
const r1 = v => Math.round(v * 10) / 10;
const islands = info.map((o, i) => ({ i, kind: o.kind, n: o.n, lo: o.lo.map(r1), hi: o.hi.map(r1) }));
writeFileSync(`public/machine/${prof}.json`, JSON.stringify({
  source: PR.source,
  kinds: KIND, nv, ni: idx.length, offs, islands,
}));
console.log('sommets', nv, 'triangles', idx.length / 3, 'échelle', s.toFixed(3), 'boîte (mm)', all.hi.map((h, c) => r1((h - all.lo[c]) * s)));
for (const m of meshes) console.log(m.kind, m.mat, m.nv, m.ni / 3);
const byKind = {}; for (const o of islands) (byKind[o.kind] ??= []).push(o);
for (const [k, l] of Object.entries(byKind)) console.log('matière', k, 'îles', l.length);
console.log('touches (îles) :', byKind[KIND.keys]?.slice(0, 80).map(o => `${o.i}:${o.n}@${o.lo.map(Math.round)}–${o.hi.map(Math.round)}`).join('  '));
