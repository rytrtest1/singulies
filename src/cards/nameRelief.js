// Prénom de la scène 2 en relief : lettres EB Garamond (atlas SDF de l'accueil) bombées sur leur bord,
// éclairées par la même lampe que les cartes (leurs flancs suivent l'inclinaison du téléphone), en gris
// « en retrait ». uGlow (par lettre, 0–1) les allumera de l'intérieur quand on tapera la réponse.
import { program, atlasTexture } from '../gl/gl.js';
import { buildAtlas } from '../gl/atlas.js';

const VS = /* glsl */`#version 300 es
layout(location=0) in vec2 aPos;     // monde (mm), plan z = 0
layout(location=1) in vec2 aUV;
layout(location=2) in float aGlow;
uniform mat4 uVP;
out vec2 vUV; out vec3 vWorld; out float vGlow;
void main() { vUV = aUV; vGlow = aGlow; vWorld = vec3(aPos, 0.0); gl_Position = uVP * vec4(aPos, 0.0, 1.0); }`;

const FS = /* glsl */`#version 300 es
precision highp float;
in vec2 vUV; in vec3 vWorld; in float vGlow;
uniform sampler2D uAtlas;
uniform vec2 uTexel;                 // taille d'un texel de l'atlas (uv)
uniform float uTexelEm;              // taille d'un texel (em)
uniform vec3 uLightPos, uEye;
uniform float uLight, uEnv, uAlb, uRelief, uBevel, uExposure, uToe, uSpec;
out vec4 o;
void main() {
  float d = texture(uAtlas, vUV).r;                       // em, > 0 dans la lettre
  float aa = max(fwidth(d) * 0.7, 1e-4);
  float cov = smoothstep(-aa, aa, d);
  if (cov <= 0.0) discard;
  // bombé : le bord monte sur uBevel em puis plateau ; normale par différences dans l'atlas
  float gx = (texture(uAtlas, vUV + vec2(uTexel.x, 0.0)).r - texture(uAtlas, vUV - vec2(uTexel.x, 0.0)).r) / (2.0 * uTexelEm);
  float gy = (texture(uAtlas, vUV + vec2(0.0, uTexel.y)).r - texture(uAtlas, vUV - vec2(0.0, uTexel.y)).r) / (2.0 * uTexelEm);
  float t = clamp(d / uBevel, 0.0, 1.0), slope = uRelief / uBevel * 6.0 * t * (1.0 - t);
  vec3 n = normalize(vec3(-slope * gx, slope * gy, 1.0));  // y de l'atlas vers le bas
  vec3 L = uLightPos - vWorld; float dist = length(L); L /= dist;
  vec3 V = normalize(uEye - vWorld), H = normalize(L + V);
  float irr = uLight * 250000.0 / (dist * dist);
  float diff = max(dot(n, L), 0.0);
  float spec = uSpec * pow(max(dot(n, H), 0.0), 24.0);
  vec3 col = vec3(uAlb * (irr * diff + uEnv * (0.4 + 0.6 * n.z)) + irr * diff * spec);
  col += vec3(vGlow) * 0.6;                                // allumage intérieur (réponse tapée)
  col *= uExposure;
  col = max(col - uToe, 0.0) / (1.0 - uToe);
  o = vec4(pow(col, vec3(1.0 / 2.2)) * cov, cov);          // alpha prémultiplié
}`;

export async function createNameRelief(gl, family = '"SG Garamond", serif') {
  try { await document.fonts.load(`500 64px ${family}`); } catch (e) { /* police système en repli */ }
  const atlas = buildAtlas('ABCDEFGHIJKLMNOPQRSTUVWXYZ', family, 500);
  const tex = atlasTexture(gl, atlas);
  const prog = program(gl, VS, FS);
  const vao = gl.createVertexArray(), vbo = gl.createBuffer();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 20, 0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 20, 8);
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 20, 16);
  gl.bindVertexArray(null);
  let count = 0;

  // mise en page : centre (mm), hauteur de capitale (mm), largeur max (mm) ; interlettrage 0,45 em
  function layout(text, cx, cy, capMm, maxW, glow = []) {
    const chars = [...text.toUpperCase()].filter(ch => atlas.glyphs[ch] || ch === ' ');
    let em = capMm / atlas.capHeight;
    const width = e => chars.reduce((s, ch) => s + (ch === ' ' ? 0.3 : atlas.glyphs[ch].adv) * e, 0) + 0.45 * e * Math.max(0, chars.length - 1);
    if (width(em) > maxW) em *= maxW / width(em);
    let x = cx - width(em) / 2;
    const base = cy - atlas.capHeight * em / 2;          // ligne de base : capitales centrées sur cy
    const v = [];
    chars.forEach((ch, i) => {
      if (ch === ' ') { x += (0.3 + 0.45) * em; return; }
      const g = atlas.glyphs[ch], G = glow[i] || 0;
      const x0 = x + g.x0 * em, x1 = x + g.x1 * em, y0 = base - g.y0 * em, y1 = base - g.y1 * em;   // y monde vers le haut
      const q = [[x0, y0, g.u0, g.v0], [x1, y0, g.u1, g.v0], [x1, y1, g.u1, g.v1], [x0, y1, g.u0, g.v1]];
      for (const k of [0, 1, 2, 0, 2, 3]) v.push(q[k][0], q[k][1], q[k][2], q[k][3], G);
      x += (g.adv + 0.45) * em;
    });
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.DYNAMIC_DRAW);
    count = v.length / 5;
  }

  function draw(vp, eye, P, look) {
    if (!count) return;
    const u = prog.u;
    gl.useProgram(prog.p);
    gl.uniformMatrix4fv(u.uVP, false, vp);
    gl.uniform3fv(u.uLightPos, P.lightPos); gl.uniform3fv(u.uEye, eye);
    gl.uniform1f(u.uLight, P.light); gl.uniform1f(u.uEnv, P.env);
    gl.uniform1f(u.uExposure, P.exposure); gl.uniform1f(u.uToe, P.toe);
    gl.uniform1f(u.uAlb, look.nameAlb); gl.uniform1f(u.uRelief, look.nameRelief); gl.uniform1f(u.uBevel, look.nameBevel);
    gl.uniform1f(u.uSpec, look.nameSpec);
    gl.uniform2f(u.uTexel, 1 / atlas.width, 1 / atlas.height); gl.uniform1f(u.uTexelEm, 1 / 128);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(u.uAtlas, 0);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLES, 0, count);
    gl.bindVertexArray(null);
    gl.depthMask(true); gl.disable(gl.BLEND);
  }
  return { layout, draw, capHeight: atlas.capHeight };
}
