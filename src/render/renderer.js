// Rendu WebGL2 : fond (charbon granuleux + vignette), champ de mots (lettres projetées, flou continu)
// et prénom central (SDF net) + curseur. 3 draw calls.
// Toutes les ressources sont recréables (perte de contexte) à partir des données CPU.
import { program, atlasTexture, GLSL_COMMON } from '../gl/gl.js';
import { ZF, KB, KB_FAR } from '../field/camera.js';
import { STRIDE as FSTRIDE } from '../field/field.js';
import { BLUR_EM } from '../gl/atlas.js';

const BG_VS = /* glsl */`#version 300 es
void main() {
  vec2 p = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0);
  gl_Position = vec4(p, 0.0, 1.0);
}`;

const BG_FS = /* glsl */`#version 300 es
precision highp float;
uniform vec2 u_res;      // px physiques
uniform float u_dpr;
uniform vec2 u_center;   // centre de la vignette, px physiques (y vers le bas)
uniform float u_grain;   // 1 = charbon granuleux, 0 = noir pur
uniform float u_fade;
out vec4 o;
float hash(vec2 p) { // grain statique, stable d'une image à l'autre
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p.yx + 19.19);
  return fract((p.x + p.y) * p.x);
}
void main() {
  vec2 frag = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y);
  // fond du prototype : #050505 + grain rand³ (alpha 23/255) au px CSS, vignette 52 % → 0,66
  float g = hash(floor(frag / max(1.0, u_dpr)));
  float c = u_grain > 1.5 ? mix(5.0 / 255.0, g * g * g, 23.0 / 255.0) : 6.0 / 255.0; // grain seulement sur demande
  vec2 half_ = vec2(max(u_center.x, u_res.x - u_center.x), max(u_center.y, u_res.y - u_center.y)) * 1.41421;
  float r = length((frag - u_center) / half_);
  float a = 0.66 * clamp((r - 0.52) / 0.48, 0.0, 1.0);
  c *= (1.0 - a) * min(u_grain, 1.0);
  o = vec4(vec3(c * u_fade), 1.0);
}`;

// Quads instanciés en espace écran : lettres (SDF) ou rectangles pleins (curseur).
const GLYPH_VS = /* glsl */`#version 300 es
layout(location=0) in vec4 a_box;    // x0,y0,x1,y1 en px CSS
layout(location=1) in vec4 a_uv;     // u0,v0,u1,v1 (u0 < 0 : rectangle plein)
layout(location=2) in vec4 a_p;      // alpha, px CSS par em, —, —
uniform vec2 u_view;                 // taille CSS
out vec2 v_uv; out vec2 v_px; flat out vec4 v_box; flat out vec4 v_p; flat out float v_rect;
void main() {
  vec2 c = vec2(gl_VertexID & 1, gl_VertexID >> 1);
  bool rect = a_uv.x < 0.0;
  vec4 b = rect ? a_box + vec4(-1.0, -1.0, 1.0, 1.0) : a_box; // marge d'antialias du rectangle
  vec2 pos = mix(b.xy, b.zw, c);
  v_uv = mix(a_uv.xy, a_uv.zw, c);
  v_px = pos; v_box = a_box; v_p = a_p; v_rect = rect ? 1.0 : 0.0;
  gl_Position = vec4(pos / u_view * 2.0 - 1.0, 0.0, 1.0) * vec4(1.0, -1.0, 1.0, 1.0);
}`;

const GLYPH_FS = /* glsl */`#version 300 es
precision highp float;
uniform sampler2D u_atlas;
uniform float u_dpr;
uniform float u_fade;
in vec2 v_uv; in vec2 v_px; flat in vec4 v_box; flat in vec4 v_p; flat in float v_rect;
out vec4 o;
void main() {
  float cov;
  if (v_rect > 0.5) {
    vec2 d = min(v_px - v_box.xy, v_box.zw - v_px) * u_dpr;
    cov = clamp(d.x + 0.5, 0.0, 1.0) * clamp(d.y + 0.5, 0.0, 1.0);
  } else {
    float dEm = texture(u_atlas, v_uv).r;
    float dPx = dEm * v_p.y * u_dpr;           // distance en px physiques
    cov = clamp(dPx + 0.5, 0.0, 1.0);
    cov = pow(cov, 0.8);                         // clair sur sombre : préserve les déliés
  }
  float a = cov * v_p.x * u_fade;
  o = vec4(vec3(a), a);
}`;

// Champ : une instance par lettre, placée par la caméra unique (centre de la lettre projeté).
// Comme le prototype : la lettre reste un « sprite » face caméra, tourné rigidement selon la
// pente locale de la ligne de base et comprimé horizontalement par cos ψ — pas de cisaillement.
// Flou continu : σ_px = K·f·|1/z − 1/ZF| (K proche / K lointain = courbe du prototype),
// plafonné à 0,11 em ; cœur net + halo (aspect du prototype), puis fondu continu vers l'atlas pré-flouté.
const FIELD_VS = /* glsl */`#version 300 es
layout(location=0) in vec4 a_w;    // X, Y, z (monde), ψ signé
layout(location=1) in vec4 a_l;    // u (abscisse le long du mot), y ligne de base, S (taille d'un em), alpha
layout(location=2) in vec4 a_uv;
layout(location=3) in vec4 a_box;  // boîte du glyphe en em (origine = point de chasse)
layout(location=4) in vec4 a_x;    // gris, lumière L, étirement de traînée, angle de traînée
layout(location=5) in vec4 a_y;    // graine propre (déformation de la traînée), —, —, —
uniform vec2 u_view;               // px CSS
uniform vec2 u_c;                  // point de fuite, px CSS
uniform vec2 u_cam;                // translation caméra (monde)
uniform float u_f, u_dpr;
uniform highp int u_pass;          // 0 lettres, 1 traînées
out vec2 v_uv;
out float v_ty;                    // position le long de la traînée (0…1)
flat out float v_sig, v_aa, v_alpha, v_gray, v_L, v_str, v_seed;
flat out vec4 v_rect;              // rectangle uv du glyphe
flat out vec2 v_uvEm;              // uv par em
const float ZF = ${ZF.toFixed(3)}, KB = ${KB.toFixed(4)}, KB_FAR = ${KB_FAR.toFixed(4)};
vec2 proj(vec3 P) { return u_c + u_f * P.xy / max(P.z, 0.1); }
uniform float u_time;
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { float a = 0.5, r = 0.0; for (int i = 0; i < 3; i++) { r += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return r - 0.44; }
const float TRAIL_SEG = 16.0;      // la traînée est une bande de 16 segments, chacun déplacé par le bruit
void main() {
  vec2 c = vec2(gl_VertexID & 1, gl_VertexID >> 1);
  if (u_pass == 1) c.y /= TRAIL_SEG;
  float S = a_l.z, cp = cos(a_w.w), sp = sin(a_w.w);
  vec3 d = vec3(cp, 0.0, -sp);
  float ecx = 0.5 * (a_box.x + a_box.z);                    // centre horizontal du glyphe (em)
  vec3 Pc = vec3(a_w.xy - u_cam, a_w.z) + d * (a_l.x + ecx * S);
  float zc = max(0.5, Pc.z);
  vec2 sc = proj(Pc);
  vec2 dir = proj(Pc + d * 0.5 * S) - proj(Pc - d * 0.5 * S);
  float g = atan(dir.y, dir.x);                              // pente locale de la ligne de base
  float k = u_f * S / zc;                                    // px CSS par em
  vec2 e = mix(a_box.xy, a_box.zw, c);
  vec2 loc = vec2((e.x - ecx) * cp, e.y + a_l.y / S) * k;
  vec2 scr = sc + mat2(cos(g), sin(g), -sin(g), cos(g)) * loc;
  if (u_pass == 1) {
    // traînée : copie floue étirée le long d'un axe parti de la verticale, sans étalement horizontal
    if (a_x.y < 0.15 || a_x.z < 1.02) { gl_Position = vec4(2.0, 2.0, 0.0, 1.0); return; }
    // aurore : la bande entière se plie, ondule et respire (bruit lent, graine et vitesse propres) ;
    // ancrée sur la lettre, de plus en plus libre vers les extrémités
    float sd = fract(a_y.x * 0.0137) * 97.0, fr = 0.7 + 0.6 * fract(a_y.x * 0.31), t = u_time;
    float yv = c.y * 2.0 - 1.0, ay = abs(yv);
    float th = a_x.w + 0.45 * fbm(vec2(t * 0.22 * fr, sd));                         // l'axe lui-même vacille
    float str = a_x.z * (1.0 + 0.6 * fbm(vec2(sd + 3.0, t * 0.18 * fr)));              // longueur qui respire
    vec2 tl = vec2((e.x - ecx) * cp * 0.85, (e.y + a_l.y / S) * str) * k;
    float fold = fbm(vec2(yv * 0.9 + sd, t * 0.45 * fr)) * 1.9                       // grands plis du rideau
               + fbm(vec2(yv * 2.3 - t * 0.9 * fr, sd + 7.0)) * 0.8;                 // ondes qui remontent
    tl.x += fold * (0.08 + 0.92 * ay) * k;
    tl.y += fbm(vec2(yv * 1.7 + t * 0.3 * fr, sd + 11.0)) * 0.6 * ay * k;            // étirement inégal
    scr = sc + mat2(cos(th), sin(th), -sin(th), cos(th)) * tl;
  }
  float sig = (zc < ZF ? KB : KB_FAR) * u_f * abs(1.0 / zc - 1.0 / ZF) / k;
  v_sig = min(sig, ${BLUR_EM.toFixed(3)});                    // σ en em (plafond = atlas pré-flouté)
  v_aa = 0.42 / (k * u_dpr);                                 // antialias ≈ 1 px physique, en em
  v_alpha = a_l.w; v_gray = a_x.x; v_L = a_x.y; v_str = a_x.z; v_seed = a_y.x;
  v_ty = c.y; v_rect = a_uv; v_uvEm = (a_uv.zw - a_uv.xy) / (a_box.zw - a_box.xy);
  v_uv = mix(a_uv.xy, a_uv.zw, c);
  gl_Position = vec4((scr / u_view * 2.0 - 1.0) * vec2(1.0, -1.0), 0.0, 1.0);
}`;

const FIELD_FS = /* glsl */`#version 300 es
precision highp float;
uniform sampler2D u_atlas, u_blur;
uniform float u_fade, u_dim, u_time;
uniform highp int u_pass;
in vec2 v_uv;
in float v_ty;
flat in float v_sig, v_aa, v_alpha, v_gray, v_L, v_str, v_seed;
flat in vec4 v_rect;
flat in vec2 v_uvEm;
out vec4 o;
${GLSL_COMMON}
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { float a = 0.5, r = 0.0; for (int i = 0; i < 3; i++) { r += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return r - 0.44; } // ≈ −0,44…0,44
const float S_MID = 0.045, S_MAX = ${BLUR_EM.toFixed(3)};
// flou analytique : cœur net + halo (aspect du prototype), à σ donné
float soft(float dEm, float sig) {
  float wc = 0.45 * (1.0 - smoothstep(0.03, S_MID, sig));
  float halo = gaussCdf(dEm / sqrt(1.56 * sig * sig + v_aa * v_aa));
  float core = gaussCdf(dEm / sqrt(0.2 * sig * sig + v_aa * v_aa));
  return mix(halo, core, wc);
}
void main() {
  if (u_pass == 1) {
    // traînée floue de la lettre, déformée par un bruit lent (pas de sinus réguliers) :
    // courbure, torsion, étirement inégal, longueur et éclat qui varient — graine propre,
    // ancrée sur la lettre, de plus en plus libre vers les extrémités
    float y = v_ty * 2.0 - 1.0, ay = abs(y), t = u_time, sd = fract(v_seed * 0.0137) * 97.0;
    float fr = 0.7 + 0.6 * fract(v_seed * 0.31);              // vitesse propre
    float xl = (v_uv.x - 0.5 * (v_rect.x + v_rect.z)) / v_uvEm.x; // abscisse dans la lettre (em)
    float bend = 0.0;                                                                       // (courbure : géométrie, VS)
    float twist = fbm(vec2(y * 3.4 - t * 0.7 * fr, xl * 1.7 + sd)) * 0.3 * ay;               // torsion locale
    float slide = fbm(vec2(xl * 1.3 + sd * 2.0, y * 1.8 + t * 0.11 * fr)) * 0.18 * ay;        // étirement inégal
    vec2 uv = v_uv + vec2((bend + twist) * v_uvEm.x, slide * v_uvEm.y);
    uv = clamp(uv, v_rect.xy, v_rect.zw);
    float ext = (y < 0.0 ? 0.8 : 0.95) + 0.35 * fbm(vec2(sd + (y < 0.0 ? 5.0 : 0.0), t * 0.09 * fr)); // longueur vivante
    float env = 1.0 - smoothstep(0.25 * ext, ext, ay);
    float glow = max(0.0, 0.75 + 1.5 * fbm(vec2(y * 1.8 - t * 0.9 * fr, sd + xl * 0.5)));  // vagues d'éclat qui parcourent la traînée
    float a = texture(u_blur, uv).r * env * glow * clamp(v_L - 0.1, 0.0, 1.0) * 0.95 * v_alpha * u_fade;
    o = vec4(vec3(a), 0.0);                                  // additif
    return;
  }
  float dEm = texture(u_atlas, v_uv).r;
  float c;
  if (v_sig <= S_MID) c = soft(dEm, v_sig);
  else c = mix(soft(dEm, S_MID), texture(u_blur, v_uv).r, (v_sig - S_MID) / (S_MAX - S_MID)); // vers le vrai flou pré-calculé
  float a = c * v_alpha * u_fade;
  o = vec4(vec3(a * min(1.0, v_gray * u_dim + v_L)), a);  // allumée : s'ajoute au gris éteint
}`;

const STRIDE = 12; // floats par instance

export function createRenderer(canvas, gl, atlas) {
  let res = null;
  let cap = 64;
  let inst = new Float32Array(cap * STRIDE);
  let fcap = 1024;   // lettres du champ

  function init() {
    const bg = program(gl, BG_VS, BG_FS);
    const gp = program(gl, GLYPH_VS, GLYPH_FS);
    const tex = atlasTexture(gl, atlas);
    const btex = atlasTexture(gl, atlas.blur);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, inst.byteLength, gl.DYNAMIC_DRAW);
    for (let i = 0; i < 3; i++) {
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, 4, gl.FLOAT, false, STRIDE * 4, i * 16);
      gl.vertexAttribDivisor(i, 1);
    }
    gl.bindVertexArray(null);
    const empty = gl.createVertexArray();
    // champ
    const fp = program(gl, FIELD_VS, FIELD_FS);
    const fvao = gl.createVertexArray();
    gl.bindVertexArray(fvao);
    const fbuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, fbuf);
    gl.bufferData(gl.ARRAY_BUFFER, fcap * FSTRIDE * 4, gl.DYNAMIC_DRAW);
    for (let i = 0; i < 6; i++) {
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, 4, gl.FLOAT, false, FSTRIDE * 4, i * 16);
      gl.vertexAttribDivisor(i, 1);
    }
    gl.bindVertexArray(null);
    res = { bg, gp, tex, btex, vao, buf, empty, fp, fvao, fbuf };
  }

  init();

  // inst : liste de { box:[x0,y0,x1,y1], uv:[…] | null, alpha, pxEm }
  function draw(f) {
    if (gl.isContextLost()) return 0;
    const { bg, gp, tex, vao, buf, empty } = res;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.disable(gl.BLEND);
    gl.useProgram(bg.p);
    gl.uniform2f(bg.u.u_res, canvas.width, canvas.height);
    gl.uniform1f(bg.u.u_dpr, f.dpr);
    gl.uniform2f(bg.u.u_center, f.cx * f.dpr, f.cy * f.dpr);
    gl.uniform1f(bg.u.u_grain, f.grain);
    gl.uniform1f(bg.u.u_fade, f.fade);
    gl.bindVertexArray(empty);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    let calls = 1;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);

    // champ (instances déjà triées loin → proche)
    const fl = f.field;
    if (fl && fl.count) {
      const { fp, fvao, fbuf } = res;
      gl.bindBuffer(gl.ARRAY_BUFFER, fbuf);
      if (fl.count > fcap) {
        while (fcap < fl.count) fcap *= 2;
        gl.bufferData(gl.ARRAY_BUFFER, fcap * FSTRIDE * 4, gl.DYNAMIC_DRAW);
      }
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, fl.data, 0, fl.count * FSTRIDE);
      gl.useProgram(fp.p);
      gl.uniform2f(fp.u.u_view, f.w, f.h);
      gl.uniform2f(fp.u.u_c, f.vx, f.vy);
      gl.uniform2f(fp.u.u_cam, f.cam.x, f.cam.y);
      gl.uniform1f(fp.u.u_f, f.focal);
      gl.uniform1f(fp.u.u_dpr, f.dpr);
      gl.uniform1f(fp.u.u_fade, f.fade);
      gl.uniform1f(fp.u.u_dim, f.dim ?? 1);
      gl.uniform1f(fp.u.u_time, (f.time ?? 0) % 1000);
      gl.uniform1i(fp.u.u_atlas, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, res.btex);
      gl.uniform1i(fp.u.u_blur, 1);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1i(fp.u.u_pass, 0);
      gl.bindVertexArray(fvao);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, fl.count);
      calls++;
      if (f.litCount) {          // traînées des lettres allumées (même tampon, passage additif)
        gl.uniform1i(fp.u.u_pass, 1);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 34, fl.count);   // 16 segments
        calls++;
      }
      gl.bindVertexArray(null);
    }

    const list = f.glyphs;
    if (!list.length) return calls;
    if (list.length > cap) {
      while (cap < list.length) cap *= 2;
      inst = new Float32Array(cap * STRIDE);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, inst.byteLength, gl.DYNAMIC_DRAW);
    }
    for (let i = 0; i < list.length; i++) {
      const g = list[i], o = i * STRIDE;
      inst.set(g.box, o);
      if (g.uv) inst.set(g.uv, o + 4); else inst.set([-1, -1, -1, -1], o + 4);
      inst[o + 8] = g.alpha; inst[o + 9] = g.pxEm; inst[o + 10] = 0; inst[o + 11] = 0;
    }
    gl.useProgram(gp.p);
    gl.uniform2f(gp.u.u_view, f.w, f.h);
    gl.uniform1f(gp.u.u_dpr, f.dpr);
    gl.uniform1f(gp.u.u_fade, f.fade);
    gl.uniform1i(gp.u.u_atlas, 0);
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, inst, 0, list.length * STRIDE);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, list.length);
    gl.bindVertexArray(null);
    return calls + 1;
  }

  return { draw, restore: init };
}
