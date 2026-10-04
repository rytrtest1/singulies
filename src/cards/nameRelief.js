// Prénom de la scène 2 en relief : lettres EB Garamond (atlas SDF de l'accueil) bombées sur leur bord, dans
// la même matière que les cartes (papier photographié : grain, fibres, petits reflets), éclairées par la même lampe (leurs flancs suivent l'inclinaison du téléphone), en gris
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
uniform sampler2D uAtlas, uPaper;
uniform float uGrain, uFiber, uGlint, uSeed;
uniform vec2 uOrigin;
uniform float uFlat;                 // > 0 : prénom à plat, gris uFlat (affiché), seulement assombri par l'ombre d'une carte
uniform vec4 uOcc; uniform float uOccZ, uOccRot, uHasOcc, uLightR;
uniform vec2 uTexel;                 // taille d'un texel de l'atlas (uv)
uniform float uTexelEm;              // taille d'un texel (em)
uniform vec3 uLightPos, uEye;
uniform float uLight, uEnv, uAlb, uRelief, uBevel, uExposure, uToe, uSpec;
out vec4 o;
float occShadow(vec3 L, float dist) {
  if (uHasOcc < 0.5 || L.z <= 1e-3) return 1.0;
  float s = (uOccZ - vWorld.z) / L.z;
  if (s <= 0.05) return 1.0;
  vec2 q = vWorld.xy + L.xy * s - uOcc.xy;
  float c = cos(uOccRot), sn = sin(uOccRot);
  q = vec2(c * q.x + sn * q.y, -sn * q.x + c * q.y);
  vec2 e = abs(q) - (uOcc.zw - 3.0);
  float d = length(max(e, 0.0)) + min(max(e.x, e.y), 0.0) - 3.0;
  float pen = max(0.4, s * uLightR / dist);
  return 1.0 - 0.85 * (1.0 - smoothstep(-pen, pen, d));
}
void main() {
  float d = texture(uAtlas, vUV).r;                       // em, > 0 dans la lettre
  float aa = max(fwidth(d) * 0.7, 1e-4);
  float cov = smoothstep(-aa, aa, d);
  if (cov <= 0.0) discard;
  if (uFlat > 0.0) {
    vec3 Lf = uLightPos - vWorld; float df = length(Lf);
    float shf = occShadow(Lf / df, df);
    float g = uFlat * shf + vGlow * 0.5;
    o = vec4(vec3(g) * cov, cov);
    return;
  }
  // bombé : le bord monte sur uBevel em puis plateau ; normale par différences dans l'atlas
  float gx = (texture(uAtlas, vUV + vec2(uTexel.x, 0.0)).r - texture(uAtlas, vUV - vec2(uTexel.x, 0.0)).r) / (2.0 * uTexelEm);
  float gy = (texture(uAtlas, vUV + vec2(0.0, uTexel.y)).r - texture(uAtlas, vUV - vec2(0.0, uTexel.y)).r) / (2.0 * uTexelEm);
  float t = clamp(d / uBevel, 0.0, 1.0), slope = uRelief / uBevel * 6.0 * t * (1.0 - t);
  // papier des cartes (même photo, à l'échelle réelle : 87 mm = largeur de l'image) : grain et relief des fibres
  vec2 puv = (vWorld.xy - uOrigin) * vec2(0.7 / 87.0, -0.7 / 51.5) + vec2(0.5, 0.5);   // centré sur le prénom
  float r = texture(uPaper, puv).r, lo = texture(uPaper, puv, 3.0).r;
  float R0 = 1.0 + ((lo - 0.502) + uGrain * (r - lo));
  vec2 pe = vec2(0.05 * 0.7 / 87.0, 0.0);
  float fx = (texture(uPaper, puv + pe.xy).r - texture(uPaper, puv - pe.xy).r) / 0.1;
  float fy = (texture(uPaper, puv - pe.yx * 1.69).r - texture(uPaper, puv + pe.yx * 1.69).r) / 0.1;
  vec3 n = normalize(vec3(-slope * gx - uFiber * fx * 255.0 / 255.0, slope * gy - uFiber * fy, 1.0));  // y de l'atlas vers le bas
  vec3 L = uLightPos - vWorld; float dist = length(L); L /= dist;
  vec3 V = normalize(uEye - vWorld), H = normalize(L + V);
  float irr = uLight * 250000.0 / (dist * dist);
  float diff = max(dot(n, L), 0.0);
  float spec = uSpec * pow(max(dot(n, H), 0.0), 24.0) * (1.0 + 2.0 * t * (1.0 - t) * 4.0);   // le bord accroche
  // fibres claires : petites facettes qui s'allument sous un angle précis
  vec2 cell = floor(puv * 2088.0);
  vec2 hr = fract(sin(vec2(dot(cell, vec2(127.1, 311.7)), dot(cell, vec2(269.5, 183.3))) + uSeed) * 43758.5453) - 0.5;
  float glint = uGlint * smoothstep(1.06, 1.35, R0) * pow(max(dot(normalize(n + vec3(hr * 0.9, 0.0)), H), 0.0), 220.0);
  vec3 col = vec3(uAlb * R0 * (irr * diff + uEnv * (0.4 + 0.6 * n.z)) + irr * diff * (spec + glint));
  col += vec3(vGlow) * 0.6;                                // allumage intérieur (réponse tapée)
  col *= uExposure;
  col = max(col - uToe, 0.0) / (1.0 - uToe);
  o = vec4(pow(col, vec3(1.0 / 2.2)) * cov, cov);          // alpha prémultiplié
}`;

export async function createNameRelief(gl, paperTex, family = '"SG Garamond", serif') {
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
  let count = 0, origin = [0, 0];

  // mise en page : centre de la 1re ligne (mm), hauteur de capitale (mm), largeur max (mm) ; interlettrage
  // 0,45 em. lines : coupure de l'accueil (1 ou 2 lignes, mêmes mots) ; les lignes suivantes descendent de 2,4
  // capitales, comme sur l'accueil. glow : par caractère du texte (espaces compris)
  function layout(text, cx, cy, capMm, maxW, glow = [], lines = null) {
    const T = [...text.toUpperCase()];
    const L = (lines || [text]).map(l => [...l.toUpperCase()]);
    let em = capMm / atlas.capHeight;
    const width = (cs, e) => cs.reduce((s, ch) => s + (ch === ' ' ? 0.3 : atlas.glyphs[ch] ? atlas.glyphs[ch].adv : 0) * e, 0) + 0.45 * e * Math.max(0, cs.length - 1);
    const wMax = Math.max(...L.map(cs => width(cs, em)));
    if (wMax > maxW) em *= maxW / wMax;
    const base0 = cy - atlas.capHeight * em / 2;          // ligne de base : capitales de la 1re ligne centrées sur cy
    origin = [cx, cy];
    const v = [], pens = [];
    let gi = 0, base = base0;
    L.forEach((cs, li) => {
      let x = cx - width(cs, em) / 2;
      base = base0 - li * 2.4 * atlas.capHeight * em;
      for (const ch of cs) {
        const i = gi++;
        if (ch === ' ' || !atlas.glyphs[ch]) { x += (0.3 + 0.45) * em; continue; }
        pens.push({ ch, x, base });
        const g = atlas.glyphs[ch], G = glow[i] || 0;
        const x0 = x + g.x0 * em, x1 = x + g.x1 * em, y0 = base - g.y0 * em, y1 = base - g.y1 * em;   // y monde vers le haut
        const q = [[x0, y0, g.u0, g.v0], [x1, y0, g.u1, g.v0], [x1, y1, g.u1, g.v1], [x0, y1, g.u0, g.v1]];
        for (const k of [0, 1, 2, 0, 2, 3]) v.push(q[k][0], q[k][1], q[k][2], q[k][3], G);
        x += (g.adv + 0.45) * em;
      }
      if (li < L.length - 1 && T[gi] === ' ') gi++;      // l'espace de la coupure
    });
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.DYNAMIC_DRAW);
    count = v.length / 5;
    return { em, glyphs: pens };   // monde (mm) : origine de chasse et ligne de base de chaque lettre
  }

  function draw(vp, eye, P, look, occ) {
    if (!count) return;
    const u = prog.u;
    gl.useProgram(prog.p);
    gl.uniformMatrix4fv(u.uVP, false, vp);
    gl.uniform3fv(u.uLightPos, P.lightPos); gl.uniform3fv(u.uEye, eye);
    gl.uniform1f(u.uLight, P.light); gl.uniform1f(u.uEnv, P.env);
    gl.uniform1f(u.uExposure, P.exposure); gl.uniform1f(u.uToe, P.toe);
    gl.uniform1f(u.uAlb, look.nameAlb); gl.uniform1f(u.uRelief, look.nameRelief); gl.uniform1f(u.uBevel, look.nameBevel);
    gl.uniform1f(u.uSpec, look.nameSpec);
    gl.uniform1f(u.uFlat, look.nameFlat || 0); gl.uniform1f(u.uLightR, P.lightR);
    gl.uniform1f(u.uHasOcc, occ ? 1 : 0);
    if (occ) { gl.uniform4f(u.uOcc, occ.x, occ.y, 43.5, 25.75); gl.uniform1f(u.uOccZ, occ.z); gl.uniform1f(u.uOccRot, occ.rz); }
    gl.uniform2f(u.uTexel, 1 / atlas.width, 1 / atlas.height); gl.uniform1f(u.uTexelEm, 1 / 128);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(u.uAtlas, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, paperTex); gl.uniform1i(u.uPaper, 1);
    gl.uniform1f(u.uGrain, look.nameGrain); gl.uniform1f(u.uFiber, look.nameFiber); gl.uniform1f(u.uGlint, look.nameGlint); gl.uniform1f(u.uSeed, 11.0); gl.uniform2fv(u.uOrigin, origin);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLES, 0, count);
    gl.bindVertexArray(null);
    gl.depthMask(true); gl.disable(gl.BLEND);
  }
  return { layout, draw, capHeight: atlas.capHeight, adv: ch => atlas.glyphs[ch]?.adv ?? 0.6 };
}
