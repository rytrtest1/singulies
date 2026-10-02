// Rendu WebGL2 : fond (charbon granuleux + vignette) et prénom central (SDF net) + curseur.
// Toutes les ressources sont recréables (perte de contexte) à partir des données CPU.
import { program, atlasTexture } from '../gl/gl.js';

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
  float g = hash(floor(frag / max(1.0, u_dpr)));
  float c = mix(5.0 / 255.0, g * g * g, 23.0 / 255.0);
  vec2 half_ = vec2(max(u_center.x, u_res.x - u_center.x), max(u_center.y, u_res.y - u_center.y)) * 1.41421;
  float r = length((frag - u_center) / half_);
  float a = 0.66 * clamp((r - 0.52) / 0.48, 0.0, 1.0);
  c *= (1.0 - a) * u_grain;
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

const STRIDE = 12; // floats par instance

export function createRenderer(canvas, gl, atlas) {
  let res = null;
  let cap = 64;
  let inst = new Float32Array(cap * STRIDE);

  function init() {
    const bg = program(gl, BG_VS, BG_FS);
    const gp = program(gl, GLYPH_VS, GLYPH_FS);
    const tex = atlasTexture(gl, atlas);
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
    res = { bg, gp, tex, vao, buf, empty };
  }

  init();

  // inst : liste de { box:[x0,y0,x1,y1], uv:[…] | null, alpha, pxEm }
  function draw(f) {
    if (gl.isContextLost()) return;
    const { bg, gp, tex, vao, buf, empty } = res;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.disable(gl.BLEND);
    gl.useProgram(bg.p);
    gl.uniform2f(bg.u.u_res, canvas.width, canvas.height);
    gl.uniform1f(bg.u.u_dpr, f.dpr);
    gl.uniform2f(bg.u.u_center, f.cx * f.dpr, f.cy * f.dpr);
    gl.uniform1f(bg.u.u_grain, f.grain ? 1 : 0);
    gl.uniform1f(bg.u.u_fade, f.fade);
    gl.bindVertexArray(empty);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    const list = f.glyphs;
    if (!list.length) return;
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
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(gp.p);
    gl.uniform2f(gp.u.u_view, f.w, f.h);
    gl.uniform1f(gp.u.u_dpr, f.dpr);
    gl.uniform1f(gp.u.u_fade, f.fade);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(gp.u.u_atlas, 0);
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, inst, 0, list.length * STRIDE);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, list.length);
    gl.bindVertexArray(null);
  }

  return { draw, restore: init, drawCalls: 2 };
}
