// Carte SINGULIÉS en volume : 87 × 51,5 × 0,4 mm, coins arrondis, tranche.
// Dos : logo gaufré en relief ; recto : même logo en creux, vu en miroir. Papier = relief relatif
// tiré de la photo du dos (public/cards/paper.jpg) ; relief du logo = distance signée (logo.png).
// Unités du monde : mm. Éclairage : lampe ponctuelle + ambiance, ombres propres du relief.
import { program } from '../gl/gl.js';

export const CARD = { w: 87, h: 51.5, r: 3, t: 0.4, logoSq: 38.501, logoRange: 2 };

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

// ---------- maillage : deux faces (éventail) + tranche ----------
function cardMesh(seg = 12) {
  const { w, h, r, t } = CARD, ol = [];
  const corners = [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, 0.5], [-w / 2 + r, -h / 2 + r, 1], [w / 2 - r, -h / 2 + r, 1.5]];
  for (const [cx, cy, a0] of corners) for (let i = 0; i <= seg; i++) {
    const a = (a0 + 0.5 * i / seg) * Math.PI; ol.push([cx + r * Math.cos(a), cy + r * Math.sin(a), Math.cos(a), Math.sin(a)]);
  }
  const v = [];   // x y z  nx ny nz  face
  const push = (x, y, z, nx, ny, nz, f) => v.push(x, y, z, nx, ny, nz, f);
  const n = ol.length;
  for (const [z, s, f] of [[t / 2, 1, 0], [-t / 2, -1, 1]]) {      // 0 = dos (+z), 1 = recto (−z)
    for (let i = 0; i < n; i++) {
      const a = ol[i], b = ol[(i + 1) % n];
      if (s > 0) { push(0, 0, z, 0, 0, 1, f); push(a[0], a[1], z, 0, 0, 1, f); push(b[0], b[1], z, 0, 0, 1, f); }
      else { push(0, 0, z, 0, 0, -1, f); push(b[0], b[1], z, 0, 0, -1, f); push(a[0], a[1], z, 0, 0, -1, f); }
    }
  }
  for (let i = 0; i < n; i++) {                                    // 2 = tranche
    const a = ol[i], b = ol[(i + 1) % n];
    push(a[0], a[1], t / 2, a[2], a[3], 0, 2); push(a[0], a[1], -t / 2, a[2], a[3], 0, 2); push(b[0], b[1], t / 2, b[2], b[3], 0, 2);
    push(b[0], b[1], t / 2, b[2], b[3], 0, 2); push(a[0], a[1], -t / 2, a[2], a[3], 0, 2); push(b[0], b[1], -t / 2, b[2], b[3], 0, 2);
  }
  return new Float32Array(v);
}

const VS = /* glsl */`#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNor;
layout(location=2) in float aFace;
uniform mat4 uVP, uModel;
out vec3 vWorld, vNor; out vec2 vMM; flat out int vFace;
void main() {
  vec4 w = uModel * vec4(aPos, 1.0);
  vWorld = w.xyz; vNor = mat3(uModel) * aNor; vMM = aPos.xy; vFace = int(aFace + 0.5);
  gl_Position = uVP * w;
}`;

const FS = /* glsl */`#version 300 es
precision highp float;
in vec3 vWorld, vNor; in vec2 vMM; flat in int vFace;
uniform mat4 uModel;
uniform sampler2D uPaper, uLogo;
uniform vec2 uCard;          // largeur, hauteur (mm)
uniform float uLogoSq, uLogoRange;
uniform vec2 uLogoOff;       // décalage du logo (mm), propre à chaque carte
uniform vec2 uLogoScale;     // échelle du dessin (x, y) par rapport au SVG
uniform vec3 uLightPos, uEye;
uniform float uLight, uAmb, uAlbedo, uExposure;
uniform float uH, uB, uCrease, uFiber, uSheen, uGloss, uFoot, uFootW;
uniform vec4 uPaperXf;       // décalage (mm) + rotation du papier, propre à chaque carte
out vec4 o;

float logoD(vec2 p) {        // distance signée au contour (mm), < 0 dans le logo
  vec2 uv = (p - uLogoOff) / (uLogoSq * uLogoScale) + 0.5; uv.y = 1.0 - uv.y;
  if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return uLogoRange;
  return texture(uLogo, uv).r * min(uLogoScale.x, uLogoScale.y);
}
// profil du gaufrage : pied raide (pli du papier, uFoot de la hauteur sur uFootW mm) puis épaule
// arrondie sur uB mm ; uFootW est élargi à l'empreinte d'un pixel (pas de scintillement au loin)
float gFootW = 0.08;
float prof(float d) {
  float a = clamp(-d / gFootW, 0.0, 1.0), b = clamp(-d / uB, 0.0, 1.0);
  return uFoot * a * a * (3.0 - 2.0 * a) + (1.0 - uFoot) * b * b * (3.0 - 2.0 * b);
}
float height(vec2 p, float s) { return s * uH * prof(logoD(p)); }
vec2 paperUV(vec2 p) {
  float c = cos(uPaperXf.z), s = sin(uPaperXf.z);
  vec2 q = mat2(c, s, -s, c) * p + uPaperXf.xy;
  return vec2(q.x / uCard.x + 0.5, 0.5 - q.y / uCard.y);
}
float paper(vec2 p) { return 1.0 + (texture(uPaper, paperUV(p)).r * 255.0 - 128.0) / 255.0; }

void main() {
  vec3 N = normalize(vNor);
  vec3 L = uLightPos - vWorld; float dist = length(L); L /= dist;
  vec3 V = normalize(uEye - vWorld);
  float irr = uLight * 250000.0 / (dist * dist);      // lampe : éclairement ∝ 1/d² (normalisé à 500 mm)
  vec3 col;
  if (vFace == 2) {                                    // tranche : cœur du carton, un peu plus clair
    float diff = max(dot(N, L), 0.0);
    col = vec3(uAlbedo * 1.25 * (uAmb + irr * diff));
  } else {
    // repère de la face : le recto voit le logo en miroir et en creux
    float s = vFace == 0 ? 1.0 : -1.0;
    vec2 p = vMM;                                      // coordonnées (mm) sur la face
    vec3 T = normalize(mat3(uModel) * vec3(1.0, 0.0, 0.0));
    vec3 B = normalize(mat3(uModel) * vec3(0.0, 1.0, 0.0));
    vec3 Nf = normalize(mat3(uModel) * vec3(0.0, 0.0, s));
    // gradient du relief (différences centrées, pas lié à la résolution de l'écran)
    float fw = fwidth(logoD(p));
    gFootW = max(uFootW, fw * 1.2);
    float e = max(0.02, fw * 0.5);
    float hx = (height(p + vec2(e, 0.0), s) - height(p - vec2(e, 0.0), s)) / (2.0 * e);
    float hy = (height(p + vec2(0.0, e), s) - height(p - vec2(0.0, e), s)) / (2.0 * e);
    // fibres : micro-relief tiré du papier (son gradient)
    float pe = 0.06;
    float fx = (paper(p + vec2(pe, 0.0)) - paper(p - vec2(pe, 0.0))) / (2.0 * pe);
    float fy = (paper(p + vec2(0.0, pe)) - paper(p - vec2(0.0, pe))) / (2.0 * pe);
    hx += uFiber * fx; hy += uFiber * fy;
    // normale de la face : (−hx, −hy, 1) dans le repère (T, B, Nf) ; T,B tels que la normale sorte
    vec3 n = normalize(-hx * T - hy * B + Nf);
    // ombre propre : marche vers la lampe dans le plan de la face
    vec2 Lt = vec2(dot(L, T), dot(L, B)); float Lz = max(dot(L, Nf), 1e-3);
    float h0 = height(p, s), sh = 1.0;
    if (length(Lt) > 1e-4) {
      vec2 dir = normalize(Lt); float slope = Lz / length(Lt);
      for (int i = 1; i <= 10; i++) {
        float t = float(i) * 0.06;
        float need = h0 + t * slope;
        sh = min(sh, clamp(1.0 - (height(p + dir * t, s) - need) / 0.02, 0.0, 1.0));
      }
    }
    // pli au pied du gaufrage (le papier y est cassé) : fine ligne sombre, largeur ≥ 1 px écran
    float d = logoD(p);
    float wpx = fwidth(d);
    float crease = 1.0 - uCrease * exp(-pow(d / max(0.045, wpx), 2.0));
    float diff = max(dot(n, L), 0.0) * sh;
    vec3 H = normalize(L + V);
    float spec = uSheen * pow(max(dot(n, H), 0.0), uGloss) * sh;
    float alb = uAlbedo * paper(p);
    col = vec3((alb * (uAmb + irr * diff) + irr * spec) * crease);
  }
  col *= uExposure;
  col = pow(max(col, 0.0), vec3(1.0 / 2.2));
  o = vec4(col, 1.0);
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
  const mesh = cardMesh();
  const vao = gl.createVertexArray(), vbo = gl.createBuffer();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 28, 12);
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 28, 24);
  gl.bindVertexArray(null);
  const paperTex = imageTexture(gl, paperImg), logoTex = await logoTexture(gl, logoImg);
  const count = mesh.length / 7;

  // params : éclairage + matière ; card : { model, logoOff, paperXf }
  function draw(vp, eye, params, card) {
    const u = prog.u;
    gl.useProgram(prog.p);
    gl.uniformMatrix4fv(u.uVP, false, vp);
    gl.uniformMatrix4fv(u.uModel, false, card.model);
    gl.uniform2f(u.uCard, CARD.w, CARD.h);
    gl.uniform1f(u.uLogoSq, CARD.logoSq); gl.uniform1f(u.uLogoRange, CARD.logoRange);
    gl.uniform2fv(u.uLogoOff, card.logoOff || [0, 0]);
    gl.uniform2fv(u.uLogoScale, card.logoScale || [1, 1]);
    gl.uniform4fv(u.uPaperXf, card.paperXf || [0, 0, 0, 0]);
    gl.uniform3fv(u.uLightPos, params.lightPos); gl.uniform3fv(u.uEye, eye);
    for (const k of ['Light', 'Amb', 'Albedo', 'Exposure', 'H', 'B', 'Crease', 'Fiber', 'Sheen', 'Gloss', 'Foot', 'FootW']) gl.uniform1f(u['u' + k], params[k[0].toLowerCase() + k.slice(1)]);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, paperTex); gl.uniform1i(u.uPaper, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, logoTex); gl.uniform1i(u.uLogo, 1);
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLES, 0, count);
    gl.bindVertexArray(null);
  }
  return { draw };
}
