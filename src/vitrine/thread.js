// Le fil noir en 3D (11/10, la carte mystère) : un fil de coton ciré retors, fin (≈ 0,7 mm), enroulé autour de la carte.
// Un tube le long d'un chemin (mm, monde), éclairé par la même lampe que les cartes, avec ce qui fait un vrai fil :
// deux brins tordus (des sillons en hélice, la lumière glisse le long de la torsion), un coton mat qui retient un peu de
// lumière dans ses fibres, un lustre ciré étroit, l'ombre propre dans les creux — même courbe et même gain que les cartes.
import { program } from '../gl/gl.js';
import { LUM } from '../app/lum.js';

const VS = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aN;
layout(location=2) in vec3 aT;
layout(location=3) in vec2 aUV;      // u : longueur (mm) ; v : tour (0–1)
uniform mat4 uVP;
out vec3 vW; out vec3 vN; out vec3 vT; out vec2 vUV;
void main() { vW = aPos; vN = aN; vT = aT; vUV = aUV; gl_Position = uVP * vec4(aPos, 1.0); }`;
const FS = `#version 300 es
precision highp float;
in vec3 vW; in vec3 vN; in vec3 vT; in vec2 vUV;
uniform vec3 uLightPos, uEye;
uniform float uLight, uExposure, uToe, uFade, uEnv, uPitch;
out vec4 o;
float h(float x) { return fract(sin(x * 127.1) * 43758.5453); }
void main() {
  vec3 n = normalize(vN), t = normalize(vT), L = uLightPos - vW; float d = length(L); L /= d;
  vec3 V = normalize(uEye - vW);
  // deux brins tordus : l'angle autour du fil avance avec la longueur (hélice) ; le creux entre deux brins s'assombrit
  float tw = fract(vUV.x / uPitch + vUV.y * 2.0);
  float groove = smoothstep(0.0, 0.16, tw) * smoothstep(1.0, 0.84, tw);
  // les fibres : une rugosité fine le long du brin (le coton n'est jamais lisse)
  float fib = 0.82 + 0.18 * h(floor(vUV.x * 9.0) + floor(vUV.y * 14.0) * 31.0);
  // la normale suit le brin (le brin est rond) : penchée dans le sens de la torsion
  vec3 b = normalize(cross(t, n));
  vec3 nb = normalize(n + b * (tw - 0.5) * 0.7 + t * (tw - 0.5) * 0.35);
  float irr = uLight * 250000.0 / (d * d);
  float NL = max(dot(nb, L), 0.0), wrap = max(0.0, (dot(nb, L) + 0.3) / 1.3);
  // lustre ciré : étroit, allongé le long du fil (reflet de Kajiya-Kay : il court sur la torsion)
  vec3 Hh = normalize(L + V);
  float TH = dot(normalize(t + b * (tw - 0.5) * 0.9), Hh), sinTH = sqrt(max(0.0, 1.0 - TH * TH));
  float spec = pow(sinTH, 60.0) * 0.55 * smoothstep(0.0, 0.25, NL);
  float alb = 0.075 * fib;
  vec3 col = vec3((alb * irr * wrap + irr * spec * 0.11) * mix(0.35, 1.0, groove) + uEnv * alb * 0.6 * (0.4 + 0.6 * max(nb.z, 0.0)));
  col *= uExposure;
  col = max(col - uToe, 0.0) / (1.0 - uToe);
  col = pow(max(col, 0.0), vec3(1.0 / 2.2));
  col = vec3(6.0 / 255.0) + max(col - 6.0 / 255.0, 0.0) * ${LUM.gain.toFixed(3)};
  o = vec4(mix(vec3(6.0 / 255.0), col, uFade), 1.0);
}`;

export function createThread(gl) {
  const prog = program(gl, VS, FS);
  const vao = gl.createVertexArray(), vbo = gl.createBuffer(), ibo = gl.createBuffer();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  const ST = 44;
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, ST, 0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, ST, 12);
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, ST, 24);
  gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 2, gl.FLOAT, false, ST, 36);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bindVertexArray(null);
  const SIDES = 8;
  // pts : [[x,y,z]…] ; r : rayon (mm) ; upTo : longueur dessinée (mm, depuis le début : le fil s'enroule) ; fade
  function draw(vp, eye, P, pts, r = 0.36, o = {}) {
    if (!pts || pts.length < 2) return;
    let path = pts;
    if (o.upTo != null) {
      path = [pts[0]]; let acc = 0;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
        if (acc + l >= o.upTo) { const u = l > 0 ? (o.upTo - acc) / l : 0; path.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]); break; }
        path.push(b); acc += l;
      }
      if (path.length < 2) return;
    }
    const n = path.length, verts = new Float32Array(n * SIDES * 11), idx = new Uint32Array((n - 1) * SIDES * 6);
    let prevN = null, s = 0;
    for (let i = 0; i < n; i++) {
      if (i) s += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1], path[i][2] - path[i - 1][2]);
      const a = path[Math.max(0, i - 1)], b = path[Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2]; const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
      let nx, ny, nz;
      if (prevN) { const d = prevN[0] * tx + prevN[1] * ty + prevN[2] * tz; nx = prevN[0] - d * tx; ny = prevN[1] - d * ty; nz = prevN[2] - d * tz; }
      else { const up = Math.abs(tz) < 0.9 ? [0, 0, 1] : [1, 0, 0]; const d = up[0] * tx + up[1] * ty + up[2] * tz; nx = up[0] - d * tx; ny = up[1] - d * ty; nz = up[2] - d * tz; }
      const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl; prevN = [nx, ny, nz];
      const bx = ty * nz - tz * ny, by = tz * nx - tx * nz, bz = tx * ny - ty * nx;
      // la pointe du fil s'affine (les derniers 0,8 mm)
      const end = o.taper ? Math.min(1, (o.upTo != null ? Math.min(s, 1e9) : s) / 0.8) : 1;
      for (let k = 0; k < SIDES; k++) {
        const an = (k / SIDES) * Math.PI * 2, c = Math.cos(an), sn = Math.sin(an);
        const ox = nx * c + bx * sn, oy = ny * c + by * sn, oz = nz * c + bz * sn, q = (i * SIDES + k) * 11, p = path[i], rr = r * end;
        verts.set([p[0] + ox * rr, p[1] + oy * rr, p[2] + oz * rr, ox, oy, oz, tx, ty, tz, s, k / SIDES], q);
      }
    }
    let m = 0;
    for (let i = 0; i < n - 1; i++) for (let k = 0; k < SIDES; k++) {
      const a = i * SIDES + k, b = i * SIDES + (k + 1) % SIDES, c = a + SIDES, d = b + SIDES;
      idx[m++] = a; idx[m++] = c; idx[m++] = b; idx[m++] = b; idx[m++] = c; idx[m++] = d;
    }
    const u = prog.u;
    gl.useProgram(prog.p);
    gl.uniformMatrix4fv(u.uVP, false, vp);
    gl.uniform3fv(u.uLightPos, P.lightPos); gl.uniform3fv(u.uEye, eye);
    gl.uniform1f(u.uLight, P.light); gl.uniform1f(u.uExposure, P.exposure); gl.uniform1f(u.uToe, P.toe || 0);
    gl.uniform1f(u.uFade, o.fade ?? 1); gl.uniform1f(u.uEnv, P.env ?? 0.3); gl.uniform1f(u.uPitch, o.pitch ?? 1.6);
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.DYNAMIC_DRAW);
    gl.drawElements(gl.TRIANGLES, m, gl.UNSIGNED_INT, 0);
    gl.bindVertexArray(null);
  }
  const free = () => { gl.deleteBuffer(vbo); gl.deleteBuffer(ibo); gl.deleteVertexArray(vao); gl.deleteProgram(prog.p); };
  return { draw, free };
}
export const pathLen = pts => { let l = 0; for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]); return l; };
