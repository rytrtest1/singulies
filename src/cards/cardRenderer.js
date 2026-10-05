// Carte SINGULIÉS en volume : 87 × 51,5 × 0,125 mm, coins arrondis, tranche, léger gondolage.
// Dos : logo gaufré en relief ; recto : même logo en creux, vu en miroir. Papier = relief relatif
// tiré de la photo du dos (public/cards/paper.jpg) ; relief du logo = distance signée (logo.png).
// Unités du monde : mm. Lumière : lampe étendue (disque, ombres douces) + pièce (environnement neutre).
// Matière : papier noir mat — diffusion d'Oren-Nayar, reflet GGX large, lustre velouté (sheen),
// fibres qui scintillent ; tranche plus claire, bords un peu cassés, irréguliers.
import { program } from '../gl/gl.js';

export const CARD = { w: 87, h: 51.5, r: 3, t: 0.125, logoSq: 38.501, logoRange: 2 };

// ---------- petites matrices (colonnes, comme WebGL) ----------
export const M4 = {
  mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s;
    }
    return o;
  },
  perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), o = new Float32Array(16);
    o[0] = f / aspect; o[5] = f; o[10] = (far + near) / (near - far); o[11] = -1; o[14] = 2 * far * near / (near - far);
    return o;
  },
  lookAt(eye, at, up) {
    const z = norm(sub(eye, at)), x = norm(cross(up, z)), y = cross(z, x);
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
      -dot(x, eye), -dot(y, eye), -dot(z, eye), 1]);
  },
  // rotation autour de y (retournement) puis x (inclinaison), puis translation
  model(rx, ry, rz, tx = 0, ty = 0, tz = 0) {
    const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
    const Rz = new Float32Array([cz, sz, 0, 0, -sz, cz, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    const Ry = new Float32Array([cy, 0, -sy, 0, 0, 1, 0, 0, sy, 0, cy, 0, 0, 0, 0, 1]);
    const Rx = new Float32Array([1, 0, 0, 0, 0, cx, sx, 0, 0, -sx, cx, 0, 0, 0, 0, 1]);
    const m = M4.mul(Rx, M4.mul(Ry, Rz)); m[12] = tx; m[13] = ty; m[14] = tz; return m;
  },
};
function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function norm(a) { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }

// ---------- maillage indexé : deux faces en grille + tranche ----------
// Pas de 0,2 mm sur la zone du logo (le gaufrage y déforme réellement la feuille : il dépasse de la
// tranche vu de profil), 2 mm ailleurs (gondolage seulement).
// c : centre de la zone fine (la feuille A5 porte son logo plus bas)
function axis(half, dense, fine, coarse, c = 0) {
  const out = [];
  if (dense <= 0) { for (let x = -half; x < half - 1e-6; x += coarse) out.push(x); out.push(half); return out; }
  for (let x = -half; x < c - dense - 1e-6; x += coarse) out.push(x);
  for (let x = Math.max(-half, c - dense); x < Math.min(half, c + dense) - 1e-6; x += fine) out.push(x);
  for (let x = Math.min(half, c + dense); x < half - 1e-6; x += coarse) out.push(x);
  out.push(half);
  return out;
}
// dims : { w, h, r, t, fine: [demi-largeur, demi-hauteur, pas, cx, cy] de la zone fine } (défaut : la carte)
function cardMesh(fine = true, seg = 12, dims = null) {
  const { w, h, r, t } = dims || CARD, v = [], idx = [];
  const fit = (x, y) => {   // point de grille ramené dans le rectangle arrondi (coins projetés sur l'arc)
    const cx = w / 2 - r, cy = h / 2 - r, qx = Math.abs(x) - cx, qy = Math.abs(y) - cy;
    if (qx > 0 && qy > 0) { const l = Math.hypot(qx, qy); if (l > r) return [Math.sign(x) * (cx + qx * r / l), Math.sign(y) * (cy + qy * r / l)]; }
    return [x, y];
  };
  // maillage léger (cartes de la pile, vues de loin ou par la tranche) : 2 mm partout
  const fz = dims ? dims.fine : [22, 23, 0.2, 0, 0];
  const xs = fine && fz ? axis(w / 2, fz[0], fz[2], 2, fz[3]) : axis(w / 2, 0, 2, 2), ys = fine && fz ? axis(h / 2, fz[1], fz[2], 2, fz[4]) : axis(h / 2, 0, 2, 2);
  const nx = xs.length, ny = ys.length;
  for (const [z, s, f] of [[t / 2, 1, 0], [-t / 2, -1, 1]]) {      // 0 = dos (+z), 1 = recto (−z)
    const base = v.length / 7;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const [x, y] = fit(xs[i], ys[j]); v.push(x, y, z, 0, 0, s, f); }
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = base + j * nx + i, b = a + 1, c = a + nx + 1, d = a + nx;
      if (s > 0) idx.push(a, b, c, a, c, d); else idx.push(a, c, b, a, d, c);
    }
  }
  const ol = [];
  const corners = [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, 0.5], [-w / 2 + r, -h / 2 + r, 1], [w / 2 - r, -h / 2 + r, 1.5]];
  for (const [cx, cy, a0] of corners) for (let i = 0; i <= seg; i++) {
    const a = (a0 + 0.5 * i / seg) * Math.PI; ol.push([cx + r * Math.cos(a), cy + r * Math.sin(a), Math.cos(a), Math.sin(a)]);
  }
  const edge = [];   // côtés droits subdivisés (le gondolage les courbe aussi)
  for (let k = 0; k < ol.length; k++) {
    const a = ol[k], b = ol[(k + 1) % ol.length], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.5));
    for (let i = 0; i < n; i++) { const u = i / n; edge.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u, a[3] + (b[3] - a[3]) * u]); }
  }
  const e0 = v.length / 7;                                         // 2 = tranche
  for (const p of edge) { v.push(p[0], p[1], t / 2, p[2], p[3], 0, 2); v.push(p[0], p[1], -t / 2, p[2], p[3], 0, 2); }
  for (let i = 0; i < edge.length; i++) {
    const a = e0 + 2 * i, b = e0 + 2 * ((i + 1) % edge.length);
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  return { verts: new Float32Array(v), indices: new Uint32Array(idx) };
}

const VS = /* glsl */`#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNor;
layout(location=2) in float aFace;
uniform mat4 uVP, uModel;
uniform vec2 uCard;
uniform vec3 uWarp;          // gondolage (mm) : courbure en x, en y, torsion
uniform vec3 uCurl;          // coin corné : sens du coin (x, y : ±1, repère de la carte), soulèvement (mm, signé)
uniform sampler2D uLogo;
uniform float uLogoSq, uLogoRange, uH, uB, uFoot, uFootW, uNoLogo;
uniform vec2 uLogoOff, uLogoScale;
out vec3 vWorld, vT, vB, vN; out vec2 vMM; flat out int vFace;
// même profil que le shader de surface, pied un peu adouci (le maillage a un pas de 0,2 mm)
float gaufrage(vec2 p) {
  if (uNoLogo > 0.5) return 0.0;
  vec2 uv = (p - uLogoOff) / (uLogoSq * uLogoScale) + 0.5; uv.y = 1.0 - uv.y;
  if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return 0.0;
  float d = textureLod(uLogo, uv, 0.0).r * min(uLogoScale.x, uLogoScale.y);
  float fw = max(uFootW, 0.22);
  float a = clamp(-d / fw, 0.0, 1.0), b = clamp(-d / uB, 0.0, 1.0);
  return uH * (uFoot * a * a * (3.0 - 2.0 * a) + (1.0 - uFoot) * b * b * (3.0 - 2.0 * b));
}
void main() {
  vec2 q = 2.0 * aPos.xy / uCard;
  float z = uWarp.x * q.x * q.x + uWarp.y * q.y * q.y + uWarp.z * q.x * q.y;
  float dzx = (2.0 * uWarp.x * q.x + uWarp.z * q.y) * 2.0 / uCard.x;
  float dzy = (2.0 * uWarp.y * q.y + uWarp.z * q.x) * 2.0 / uCard.y;
  // coin corné : le papier se soulève en douceur sur un petit triangle de 8 mm (courbe quadratique)
  float cc = 8.0, cd = (uCurl.x * aPos.x - (uCard.x * 0.5 - cc)) + (uCurl.y * aPos.y - (uCard.y * 0.5 - cc));
  if (cd > 0.0 && uCurl.z != 0.0) {
    float k = cd / cc;
    z += uCurl.z * k * k;
    dzx += uCurl.z * 2.0 * k / cc * uCurl.x;
    dzy += uCurl.z * 2.0 * k / cc * uCurl.y;
  }
  int f = int(aFace + 0.5);
  // la feuille entière est poussée vers le dos : bosse au dos, creux au recto (même déplacement)
  float g = f == 2 ? 0.0 : gaufrage(aPos.xy);
  vec3 p = aPos + vec3(0.0, 0.0, z + g);
  vec3 T = normalize(vec3(1.0, 0.0, dzx)), B = normalize(vec3(0.0, 1.0, dzy));
  vec3 Nu = normalize(cross(T, B));
  vec3 N = f == 0 ? Nu : f == 1 ? -Nu : normalize(vec3(aNor.xy, -dot(aNor.xy, vec2(dzx, dzy))));
  mat3 m = mat3(uModel);
  vec4 w = uModel * vec4(p, 1.0);
  vWorld = w.xyz; vT = m * T; vB = m * B; vN = m * N; vMM = aPos.xy; vFace = f;
  gl_Position = uVP * w;
}`;

const FS = /* glsl */`#version 300 es
precision highp float;
in vec3 vWorld, vT, vB, vN; in vec2 vMM; flat in int vFace;
uniform sampler2D uPaper, uLogo, uInk, uInkBack;   // encre du recto (question) et du verso (réponse)
uniform float uHasInkBack;
uniform vec4 uCursor; uniform float uCursorFace;     // curseur de frappe : x, y (mm, bas), hauteur, opacité ; face (0/1, -1 aucun)
uniform float uHasInk, uInkAlb, uInkPress, uInkWear, uInkThr, uInkVar, uInkPaper, uInkOrg;
uniform vec2 uCard;          // largeur, hauteur (mm)
uniform vec2 uPaperSize;     // la photo du papier, à l'échelle réelle (celle d'une carte ; une feuille plus grande la répète en miroir)
uniform float uRadius;       // rayon des coins (mm)
uniform float uPaperTile;    // > 0 : grande feuille — la partie centrale de la photo, répétée en miroir (taille d'un motif, mm)
uniform float uPaperLo;      // part des nuages du papier (1 = carte ; la feuille, plus lisse, moins)
uniform float uLogoSq, uLogoRange, uNoLogo;
uniform vec2 uLogoOff;       // décalage du logo (mm), propre à chaque carte
uniform vec2 uLogoScale;     // échelle du dessin (x, y) par rapport au SVG
uniform vec3 uLightPos, uEye, uRoomUp;
// ombre portée par une autre carte (la carte retournée au-dessus du paquet) : rectangle à la hauteur uOccZ
uniform vec4 uOcc; uniform float uOccZ, uOccRot, uHasOcc;
// projecteur de mise en valeur (carte active) : cône doux
uniform vec3 uSpotPos, uSpotDir; uniform float uSpot, uSpotCosOut, uSpotCosIn;
uniform float uLight, uLightR, uEnv, uAlbedo, uExposure;
uniform float uH, uB, uCrease, uFiber, uFoot, uFootW, uParallax;
uniform float uRough, uSpec, uSheen, uGlint, uEdge, uGrain, uDiffRough, uEnvSpec, uToe;
uniform vec4 uPaperXf;       // décalage (mm) + rotation du papier, propre à chaque carte
uniform float uSeed;
uniform float uFade;        // 1 = carte présente, 0 = fondue dans le fond (6/255), jamais un rectangle noir
uniform float uShade;       // occlusion (cartes sous d'autres dans la pile)
out vec4 o;
const float PI = 3.14159265;

float logoD(vec2 p) {        // distance signée au contour (mm), < 0 dans le logo
  if (uNoLogo > 0.5) return uLogoRange;   // feuille sans logo
  vec2 uv = (p - uLogoOff) / (uLogoSq * uLogoScale) + 0.5; uv.y = 1.0 - uv.y;
  if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return uLogoRange;
  return texture(uLogo, uv).r * min(uLogoScale.x, uLogoScale.y);
}
// profil du gaufrage : pied raide (pli du papier) puis épaule arrondie ; pied élargi à l'empreinte du pixel
float gFootW = 0.08;
float prof(float d) {
  float a = clamp(-d / gFootW, 0.0, 1.0), b = clamp(-d / uB, 0.0, 1.0);
  return uFoot * a * a * (3.0 - 2.0 * a) + (1.0 - uFoot) * b * b * (3.0 - 2.0 * b);
}
float height(vec2 p, float s) { return s * uH * prof(logoD(p)); }
// parallaxe (relief vu de biais) : on suit le regard dans le relief. Le plan de la face est pris au
// sommet du relief (dos : sommet du gaufrage ; recto : niveau du papier) ; profondeur ≥ 0 sous ce plan.
float depthAt(vec2 p, float s) { float k = prof(logoD(p)); return uH * (s > 0.0 ? 1.0 - k : k); }
vec2 parallax(vec2 p0, float s, vec3 Vt) {
  if (uH <= 0.0 || uParallax <= 0.0) return p0;
  float vz = max(Vt.z, 0.08);
  float n = floor(mix(40.0, 8.0, vz));
  vec2 delta = -Vt.xy / vz * uH * uParallax / n;
  float stepL = 1.0 / n, layer = 0.0;
  vec2 p = p0; float d = depthAt(p, s) / uH;
  for (int i = 0; i < 40; i++) {
    if (float(i) >= n || layer >= d) break;
    p += delta; layer += stepL; d = depthAt(p, s) / uH;
  }
  vec2 prev = p - delta;
  float a = d - layer, b = depthAt(prev, s) / uH - (layer - stepL);
  float w = a / (a - b + 1e-5);
  return mix(p, prev, clamp(w, 0.0, 1.0));
}
vec2 paperUV(vec2 p) {
  float c = cos(uPaperXf.z), s = sin(uPaperXf.z);
  if (uPaperTile > 0.0) {
    // onde triangulaire : continue aux raccords, ne lit jamais les bords de la photo (redressement, zone du logo comblée)
    vec2 r = (mat2(c, s, -s, c) * p + uPaperXf.xy) / uPaperTile;
    vec2 tri = abs(fract(r * 0.5 + 0.25) * 2.0 - 1.0) * 2.0 - 1.0;
    return vec2(0.5 + 0.3 * tri.x, 0.5 - 0.3 * tri.y);
  }
  // la carte ne lit que les 70 % centraux de la photo du papier, agrandis (grain plus large, moins
  // « plastique ») ; le décalage propre à chaque carte (±2,5 mm) ne sort jamais de l'image
  vec2 q = (mat2(c, s, -s, c) * p) * 0.7 + uPaperXf.xy;
  return vec2(q.x / uPaperSize.x + 0.5, 0.5 - q.y / uPaperSize.y);
}
// grain : seul le détail fin (fibres) est amplifié, pas les nuages du papier
float paper(vec2 p) {
  vec2 uv = paperUV(p);
  float r = texture(uPaper, uv).r, lo = texture(uPaper, uv, 3.0).r;
  return 1.0 + (uPaperLo * (lo - 0.502) + uGrain * (r - lo)) * 255.0 / 255.0;
}
float paperHF(vec2 p) { vec2 uv = paperUV(p); return texture(uPaper, uv).r - texture(uPaper, uv, 3.0).r; }
// encre du recto : la face est lue retournée (axe x local vers la gauche de l'écran)
vec2 inkUV(vec2 p) { return vFace == 1 ? vec2(0.5 - p.x / uCard.x, 0.5 - p.y / uCard.y) : vec2(0.5 + p.x / uCard.x, 0.5 - p.y / uCard.y); }
float inkTex(vec2 p, float bias) { vec2 uv = inkUV(p); return vFace == 1 ? texture(uInk, uv, bias).r : texture(uInkBack, uv, bias).r; }
float hash1(vec2 c) { return fract(sin(dot(c, vec2(127.1, 311.7)) + uSeed) * 43758.5453); }
float vnoise(vec2 x) {
  vec2 i = floor(x), f = fract(x), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash1(i), hash1(i + vec2(1, 0)), u.x), mix(hash1(i + vec2(0, 1)), hash1(i + vec2(1, 1)), u.x), u.y);
}
vec2 hash2(vec2 c) { c = vec2(dot(c, vec2(127.1, 311.7)), dot(c, vec2(269.5, 183.3))) + uSeed; return fract(sin(c) * 43758.5453); }
float noise1(float x) {
  float i = floor(x), f = fract(x);
  float a = fract(sin(i * 91.7 + uSeed) * 43758.5), b = fract(sin((i + 1.0) * 91.7 + uSeed) * 43758.5);
  return mix(a, b, f * f * (3.0 - 2.0 * f));
}

// pièce neutre : sol sombre, plafond diffus, grande source douce du côté de la lampe
float env(vec3 d, vec3 Ld) {
  return 0.06 + 0.5 * smoothstep(-0.2, 0.9, dot(d, uRoomUp)) + 2.5 * pow(max(dot(d, Ld), 0.0), 8.0);
}
float D_GGX(float NH, float a) { float a2 = a * a, d = NH * NH * (a2 - 1.0) + 1.0; return a2 / (PI * d * d); }
float V_Smith(float NL, float NV, float a) { float k = a * 0.5; return 0.25 / ((NL * (1.0 - k) + k) * (NV * (1.0 - k) + k)); }
float D_Charlie(float NH, float r) { float ir = 1.0 / r, s2 = max(1.0 - NH * NH, 1e-4); return (2.0 + ir) * pow(s2, ir * 0.5) / (2.0 * PI); }
float V_Neubelt(float NL, float NV) { return 1.0 / (4.0 * (NL + NV - NL * NV) + 1e-4); }
float orenNayar(vec3 n, vec3 L, vec3 V, float sig) {
  float s2 = sig * sig, A = 1.0 - 0.5 * s2 / (s2 + 0.33), B = 0.45 * s2 / (s2 + 0.09);
  float NL = clamp(dot(n, L), 0.0, 1.0), NV = clamp(dot(n, V), 1e-3, 1.0);
  vec3 lp = L - n * NL, vp = V - n * NV;
  float cphi = dot(lp, vp) / max(1e-4, length(lp) * length(vp));
  float ta = acos(NL), tb = acos(NV), a = max(ta, tb), b = min(ta, tb);
  return NL * (A + B * max(cphi, 0.0) * sin(a) * tan(min(b, 1.5)));
}

// ombre douce d'une carte posée au-dessus (rectangle arrondi à la hauteur uOccZ, tourné de uOccRot) :
// on suit le rayon vers la lampe jusqu'à ce plan ; pénombre ∝ distance × taille apparente de la lampe
float occShadow(vec3 L, float dist) {
  if (uHasOcc < 0.5 || L.z <= 1e-3) return 1.0;
  float s = (uOccZ - vWorld.z) / L.z;
  if (s <= 0.05) return 1.0;
  vec2 q = vWorld.xy + L.xy * s - uOcc.xy;
  float c = cos(uOccRot), sn = sin(uOccRot);
  q = vec2(c * q.x + sn * q.y, -sn * q.x + c * q.y);
  vec2 e = abs(q) - (uOcc.zw - 3.0);
  float d = length(max(e, 0.0)) + min(max(e.x, e.y), 0.0) - 3.0;     // distance au rectangle arrondi (mm)
  float pen = max(0.4, s * uLightR / dist);
  return 1.0 - 0.9 * (1.0 - smoothstep(-pen, pen, d));
}

void main() {
  vec3 Ng = normalize(vN), T = normalize(vT), Bv = normalize(vB);
  vec3 L = uLightPos - vWorld; float dist = length(L); L /= dist;
  vec3 V = normalize(uEye - vWorld);
  float irr = uLight * 250000.0 / (dist * dist);      // éclairement ∝ 1/d² (normalisé à 500 mm)
  float tanL = uLightR / dist;                         // demi-angle apparent de la lampe
  vec3 col;
  if (vFace == 2) {                                    // tranche : cœur du carton, plus clair, fibreux
    float n1 = noise1(atan(vMM.y, vMM.x) * 180.0);
    float alb = uAlbedo * (1.6 + 0.5 * n1);
    float NL = max(dot(Ng, L), 0.0);
    vec3 He = normalize(L + V);
    float specE = uSpec * D_GGX(max(dot(Ng, He), 0.0), 0.35) * 0.25;
    col = vec3(alb * (irr * NL * occShadow(L, dist) + uEnv * env(Ng, L)) + irr * NL * specE);
  } else {
    float s = vFace == 0 ? 1.0 : -1.0;
    // relief du logo (dos : bosse, recto : creux) ; le pied est élargi à l'empreinte du pixel
    float fw = fwidth(logoD(vMM));
    gFootW = max(uFootW, fw * 1.2);
    vec3 Vt0 = normalize(uEye - vWorld);
    vec2 p = parallax(vMM, s, vec3(dot(Vt0, T), dot(Vt0, Bv), dot(Vt0, Ng)));
    float e = max(0.02, fw * 0.5);
    float hx = (height(p + vec2(e, 0.0), s) - height(p - vec2(e, 0.0), s)) / (2.0 * e);
    float hy = (height(p + vec2(0.0, e), s) - height(p - vec2(0.0, e), s)) / (2.0 * e);
    float pe = 0.05;
    float R0 = paper(p);
    float fx = (paper(p + vec2(pe, 0.0)) - paper(p - vec2(pe, 0.0))) / (2.0 * pe);
    float fy = (paper(p + vec2(0.0, pe)) - paper(p - vec2(0.0, pe))) / (2.0 * pe);
    hx += uFiber * fx; hy += uFiber * fy;
    // frappe : le caractère enfonce un peu le papier (creux doux sous l'encre)
    float ink = 0.0;
    if ((vFace == 1 && uHasInk > 0.5) || (vFace == 0 && uHasInkBack > 0.5)) {
      float ie = 0.06;
      hx -= uInkPress * (inkTex(p + vec2(ie, 0.0), 1.5) - inkTex(p - vec2(ie, 0.0), 1.5)) / (2.0 * ie);
      hy -= uInkPress * (inkTex(p + vec2(0.0, ie), 1.5) - inkTex(p - vec2(0.0, ie), 1.5)) / (2.0 * ie);
      // carte d'encre : c = forme × pression (0–1). Le carbone se dépose en grains serrés (≈ 0,07 mm),
      // plus denses sur le bord de la lettre (le caractère y appuie plus), avec des manques ;
      // les grains accrochent les sommets des fibres ; le creux du logo est moins bien frappé.
      // lettre nette mais organique : la carte d'encre est lue un peu adoucie (≈ 0,08 mm), si bien que
      // la force de la frappe (c) déplace le bord : chaque lettre a sa graisse. Le seuil varie en
      // douceur dans la lettre (épaisseur ≈ 0,7 mm d'échelle) et finement le long du bord (≈ 0,12 mm) ;
      // uInkWear déforme un peu le dessin du caractère.
      vec2 wob = vec2(vnoise(p * 2.2 + 5.0), vnoise(p * 2.2 + 41.0)) - 0.5;
      vec2 pw = p + wob * 0.05 * uInkWear;
      float c = 0.5 * inkTex(pw, 0.0) + 0.5 * inkTex(pw, 1.3);
      float thr = uInkThr
        + (vnoise(p * 1.4 + 11.0) - 0.5) * 0.3 * uInkOrg
        + (vnoise(p * 8.0 + 23.0) - 0.5) * 0.22 * uInkOrg;
      float cw = max(fwidth(c) * 0.6, 0.02);
      float shape = smoothstep(thr - cw, thr + cw, c);
      // opacité : l'encre se dépose plus à un endroit qu'à un autre dans une même lettre (variation douce,
      // ≈ 0,5–1 mm), selon la pression de la frappe (c) et le creux du logo
      float hollow = prof(logoD(p));
      float var = 0.55 * vnoise(p * 1.6 + 3.0) + 0.45 * vnoise(p * 3.7 + 29.0);
      float op = clamp((0.45 + 0.6 * c) * mix(1.0, 0.35 + 0.95 * var, uInkVar) * (1.0 - 0.25 * hollow), 0.0, 1.0);
      // la texture du papier passe à travers l'encre : fibres plus blanches, creux moins couverts
      op *= clamp(1.0 + uInkPaper * paperHF(p) * uGrain, 0.35, 1.3);
      // parois raides du creux : le caractère n'y frappe presque pas
      ink = shape * op / (1.0 + 0.4 * length(vec2(hx, hy)));
    }
    // curseur de frappe : trait fin à l'encre, effilé aux extrémités, qui respire
    if (uCursorFace == float(vFace) && uCursor.w > 0.0) {
      float u = clamp((p.y - uCursor.y) / uCursor.z, 0.0, 1.0);
      float halfW = 0.07 * (0.35 + 0.65 * sin(3.14159 * u));
      float dx = abs(p.x - uCursor.x) - halfW;
      float dy = max(uCursor.y - p.y, p.y - (uCursor.y + uCursor.z));
      float dd = max(dx, dy), aaC = max(fwidth(p.x), 0.015);
      ink = max(ink, (1.0 - smoothstep(-aaC, aaC, dd)) * uCursor.w);
    }
    // hauteur comptée le long de la normale sortante de la face (Ng) : n = Ng − hx T − hy B
    vec3 n = normalize(Ng - hx * T - hy * Bv);
    // bord : la coupe arrondit et casse le papier sur ~0,15 mm (plus aux coins), irrégulier
    vec2 q = abs(p) - (uCard * 0.5 - uRadius);
    vec2 qo = max(q, 0.0);
    float rr = length(qo) + min(max(q.x, q.y), 0.0) - uRadius;
    vec2 od = length(qo) > 0.0 ? normalize(qo) * sign(p) : (q.x > q.y ? vec2(sign(p.x), 0.0) : vec2(0.0, sign(p.y)));
    float per = p.x + 3.7 * p.y;
    float wr = uEdge * (0.10 + 0.10 * noise1(per * 1.3) + (length(qo) > 0.0 ? 0.08 : 0.0));
    float rim = smoothstep(-wr, 0.0, rr);
    n = normalize(n + (T * od.x + Bv * od.y) * rim * 1.8);
    // ombre propre, douce (la lampe a une taille) : marche vers la lampe dans le plan de la face
    vec2 Lt = vec2(dot(L, T), dot(L, Bv)); float Lz = dot(L, Ng);
    float h0 = height(p, s), sh = 1.0;
    if (Lz > 0.0 && length(Lt) > 1e-4) {
      vec2 dir = normalize(Lt); float slope = Lz / length(Lt);
      for (int i = 1; i <= 10; i++) {
        float t = float(i) * 0.07;
        float occl = (height(p + dir * t, s) - (h0 + t * slope)) / (t * max(tanL, 0.02));
        sh = min(sh, clamp(0.5 - 0.5 * occl, 0.0, 1.0));
      }
    }
    float d = logoD(p);
    float crease = 1.0 - uCrease * exp(-pow(d / max(0.04, fw), 2.0));
    // matière
    float alb = mix(uAlbedo * R0 * (1.0 + 0.5 * rim), uInkAlb * (0.9 + 0.2 * R0), ink);
    float NL = max(dot(n, L), 0.0), NV = max(dot(n, V), 1e-3);
    vec3 H = normalize(L + V); float NH = max(dot(n, H), 0.0), VH = max(dot(V, H), 0.0);
    float a = clamp(uRough * uRough + tanL * 0.5, 0.02, 1.0);       // lampe étendue → lobe élargi
    float F = 0.04 + 0.96 * pow(1.0 - VH, 5.0);
    float spec = uSpec * (1.0 - 0.6 * ink) * D_GGX(NH, a) * V_Smith(NL, NV, a) * F;
    float sheen = uSheen * D_Charlie(NH, 0.45) * V_Neubelt(NL, NV);
    // fibres : chaque texel clair est une fibre à facette propre, qui s'allume sous un angle précis
    vec2 cellf = paperUV(p) * vec2(textureSize(uPaper, 0));
    vec2 hr = hash2(floor(cellf)) - 0.5;
    vec3 ng = normalize(n + (T * hr.x + Bv * hr.y) * 0.9);
    float glint = uGlint * smoothstep(1.06, 1.35, R0) * pow(max(dot(ng, H), 0.0), 220.0) * clamp(1.6 - fwidth(cellf.x), 0.0, 1.0);
    float diff = orenNayar(n, L, V, uDiffRough) * sh;
    float Fv = 0.04 + 0.96 * pow(1.0 - NV, 5.0);
    vec3 Rv = reflect(-V, n);
    float amb = uEnv * (alb * env(n, L) + uEnvSpec * Fv * env(Rv, L));
    sh *= occShadow(L, dist);
    // projecteur : éclaire la carte active (l'encre surtout, le papier reste sombre), cône à bord doux
    vec3 Ls = uSpotPos - vWorld; float ds = length(Ls); Ls /= ds;
    float cone = smoothstep(uSpotCosOut, uSpotCosIn, dot(-Ls, uSpotDir));
    float irrS = uSpot * 250000.0 / (ds * ds) * cone;
    float NLs = max(dot(n, Ls), 0.0);
    vec3 Hs = normalize(Ls + V);
    float specS = uSpec * D_GGX(max(dot(n, Hs), 0.0), a) * V_Smith(NLs, NV, a) * (0.04 + 0.96 * pow(1.0 - max(dot(V, Hs), 0.0), 5.0));
    // surtout l'encre (la question ressort), à peine le papier (il reste noir)
    amb += irrS * NLs * (alb * mix(0.1, 1.0, ink) + 0.25 * specS * (1.0 - 0.6 * ink));
    // le bord cassé accroche la lumière : reflet renforcé sur le liseré, du côté de la lampe
    spec *= 1.0 + 2.5 * rim;
    col = vec3((alb * irr * diff + irr * NL * sh * (spec + sheen + glint) + amb) * crease);
  }
  col *= uExposure * uShade;
  // courbe « photo » : pied qui écrase les noirs (papier presque noir), hautes lumières intactes
  col = max(col - uToe, 0.0) / (1.0 - uToe);
  col = pow(max(col, 0.0), vec3(1.0 / 2.2));
  o = vec4(mix(vec3(6.0 / 255.0), col, uFade), 1.0);
}`;

function loadImage(url) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
}

function imageTexture(gl, img) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const an = gl.getExtension('EXT_texture_filter_anisotropic');
  if (an) gl.texParameterf(gl.TEXTURE_2D, an.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(an.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
  return t;
}

// relief du logo : PNG 16 bits (R fort, V faible) → distance signée en mm, texture R16F filtrable
async function logoTexture(gl, img) {
  const bm = await createImageBitmap(img, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  const c = new OffscreenCanvas(bm.width, bm.height), x = c.getContext('2d');
  x.drawImage(bm, 0, 0);
  const d = x.getImageData(0, 0, bm.width, bm.height).data, n = bm.width * bm.height, f = new Float32Array(n);
  for (let i = 0; i < n; i++) f[i] = ((d[4 * i] * 256 + d[4 * i + 1]) / 65535 * 2 - 1) * CARD.logoRange;
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, bm.width, bm.height, 0, gl.RED, gl.FLOAT, f);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

export async function createCardRenderer(gl, base = './') {
  const [paperImg, logoImg] = await Promise.all([loadImage(base + 'cards/paper.jpg'), loadImage(base + 'cards/logo.png')]);
  const prog = program(gl, VS, FS);
  const meshes = {};
  function upload(name, mesh, dims = CARD) {
    const vao = gl.createVertexArray(), vbo = gl.createBuffer(), ibo = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.verts, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 28, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 28, 24);
    gl.bindVertexArray(null);
    meshes[name] = { vao, count: mesh.indices.length, dims };
  }
  for (const [name, fine] of [['fine', true], ['coarse', false]]) upload(name, cardMesh(fine));
  // autre format (feuille A5…) : dims = { w, h, r, t, fine } ; dessiné avec { lod: name }
  function addShape(name, dims) { if (!meshes[name]) upload(name, cardMesh(true, 6, dims), dims); return name; }
  const paperTex = imageTexture(gl, paperImg), logoTex = await logoTexture(gl, logoImg);
  // papier en répétition miroir : la feuille réponse peut faire défiler son grain (le papier monte)
  gl.bindTexture(gl.TEXTURE_2D, paperTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);

  // params : éclairage + matière ; card : { model, logoOff, paperXf }
  function draw(vp, eye, params, card) {
    const u = prog.u;
    gl.useProgram(prog.p);
    gl.uniformMatrix4fv(u.uVP, false, vp);
    gl.uniformMatrix4fv(u.uModel, false, card.model);
    const m = meshes[card.lod || 'fine'], dm = m.dims;
    gl.uniform2f(u.uCard, dm.w, dm.h); gl.uniform1f(u.uRadius, dm.r);
    gl.uniform2f(u.uPaperSize, CARD.w, CARD.h);
    gl.uniform1f(u.uPaperTile, card.paperTile || 0); gl.uniform1f(u.uPaperLo, card.paperLo ?? 1);
    gl.uniform1f(u.uLogoSq, CARD.logoSq); gl.uniform1f(u.uLogoRange, CARD.logoRange);
    gl.uniform2fv(u.uLogoOff, card.logoOff || [0, 0]);
    gl.uniform2fv(u.uLogoScale, card.logoScale || [1, 1]);
    gl.uniform1f(u.uNoLogo, card.noLogo ? 1 : 0);
    gl.uniform4fv(u.uPaperXf, card.paperXf || [0, 0, 0, 0]);
    gl.uniform3fv(u.uWarp, card.warp || [0, 0, 0]);
    gl.uniform3fv(u.uCurl, card.curl || [0, 0, 0]);
    gl.uniform1f(u.uSeed, card.seed || 0);
    gl.uniform3fv(u.uLightPos, params.lightPos); gl.uniform3fv(u.uEye, eye);
    const oc = card.occ;
    gl.uniform1f(u.uHasOcc, oc ? 1 : 0);
    gl.uniform3fv(u.uSpotPos, params.spotPos || [0, 0, 1000]); gl.uniform3fv(u.uSpotDir, params.spotDir || [0, 0, -1]);
    gl.uniform1f(u.uSpot, params.spotI || 0); gl.uniform1f(u.uSpotCosOut, params.spotCosOut || 0.9); gl.uniform1f(u.uSpotCosIn, params.spotCosIn || 0.95);
    if (oc) { gl.uniform4f(u.uOcc, oc.x, oc.y, CARD.w / 2, CARD.h / 2); gl.uniform1f(u.uOccZ, oc.z); gl.uniform1f(u.uOccRot, oc.rz); }
    gl.uniform3fv(u.uRoomUp, params.roomUp || [0, 0, 1]);
    for (const k of ['Light', 'LightR', 'Env', 'Albedo', 'Exposure', 'H', 'B', 'Crease', 'Fiber', 'Foot', 'FootW', 'Rough', 'Spec', 'Sheen', 'Glint', 'Edge', 'Grain', 'DiffRough', 'Parallax', 'EnvSpec', 'Toe', 'InkAlb', 'InkPress', 'InkWear', 'InkThr', 'InkVar', 'InkPaper', 'InkOrg']) gl.uniform1f(u['u' + k], params[k[0].toLowerCase() + k.slice(1)]);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, paperTex); gl.uniform1i(u.uPaper, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, logoTex); gl.uniform1i(u.uLogo, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, card.ink || null); gl.uniform1i(u.uInk, 2);
    gl.uniform1f(u.uHasInk, card.ink ? 1 : 0);
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, card.inkBack || null); gl.uniform1i(u.uInkBack, 3);
    gl.uniform1f(u.uHasInkBack, card.inkBack ? 1 : 0);
    gl.uniform4fv(u.uCursor, card.cursor || [0, 0, 0, 0]); gl.uniform1f(u.uCursorFace, card.cursorFace ?? -1);
    gl.uniform1f(u.uShade, card.shade ?? 1); gl.uniform1f(u.uFade, card.fade ?? 1);
    gl.bindVertexArray(m.vao);
    gl.drawElements(gl.TRIANGLES, m.count, gl.UNSIGNED_INT, 0);
    gl.bindVertexArray(null);
  }
  // carte d'encre (canvas) → texture R8 avec mipmaps ; à libérer avec freeInk quand la carte quitte la scène
  function makeInk(canvas) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, gl.RED, gl.UNSIGNED_BYTE, canvas);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  const freeInk = t => gl.deleteTexture(t);
  return { draw, makeInk, freeInk, paperTex, addShape };
}
