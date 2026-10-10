// Le fil noir (10/10, la vitrine) : un tube fin le long d'un chemin (mm, monde), éclairé par la même lampe que les
// cartes (diffus doux, un lustre de coton ciré), même courbe et même gain que leur rendu (cardRenderer) — sinon il
// ne serait qu'un trait noir sur le noir. Le maillage est refait à chaque appel (quelques centaines de points).
import { program } from '../gl/gl.js';
import { LUM } from '../app/lum.js';

const VS = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aN;
uniform mat4 uVP;
out vec3 vW; out vec3 vN;
void main() { vW = aPos; vN = aN; gl_Position = uVP * vec4(aPos, 1.0); }`;
const FS = `#version 300 es
precision highp float;
in vec3 vW; in vec3 vN;
uniform vec3 uLightPos, uEye;
uniform float uLight, uExposure, uToe, uAlb, uFade, uEnv;
out vec4 o;
void main() {
  vec3 n = normalize(vN), L = uLightPos - vW; float d = length(L); L /= d;
  vec3 V = normalize(uEye - vW), H = normalize(L + V);
  float irr = uLight * 250000.0 / (d * d);
  float NL = max(dot(n, L), 0.0);
  float wrap = max(0.0, (dot(n, L) + 0.35) / 1.35);                 // fibres : la lumière entre un peu
  float spec = 0.9 * pow(max(dot(n, H), 0.0), 26.0) * NL;            // lustre du fil ciré
  float amb = uEnv * uAlb * (0.35 + 0.65 * max(n.z, 0.0));
  vec3 col = vec3(uAlb * irr * wrap + irr * spec * 0.06 + amb);
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
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bindVertexArray(null);
  const SIDES = 6;
  // pts : [[x,y,z]…] ; r : rayon (mm) ; upTo : longueur dessinée (mm, depuis le début) ; fade
  function draw(vp, eye, P, pts, r = 0.45, o = {}) {
    if (!pts || pts.length < 2) return;
    // coupe à la longueur voulue (la pointe du fil avance)
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
    const n = path.length, verts = new Float32Array(n * SIDES * 6), idx = new Uint32Array((n - 1) * SIDES * 6);
    let prevN = null;
    for (let i = 0; i < n; i++) {
      const a = path[Math.max(0, i - 1)], b = path[Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2]; const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
      // repère transporté (pas de torsion brusque)
      let nx, ny, nz;
      if (prevN) { const d = prevN[0] * tx + prevN[1] * ty + prevN[2] * tz; nx = prevN[0] - d * tx; ny = prevN[1] - d * ty; nz = prevN[2] - d * tz; }
      else { const up = Math.abs(tz) < 0.9 ? [0, 0, 1] : [1, 0, 0]; const d = up[0] * tx + up[1] * ty + up[2] * tz; nx = up[0] - d * tx; ny = up[1] - d * ty; nz = up[2] - d * tz; }
      const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl; prevN = [nx, ny, nz];
      const bx = ty * nz - tz * ny, by = tz * nx - tx * nz, bz = tx * ny - ty * nx;
      for (let s = 0; s < SIDES; s++) {
        const an = (s / SIDES) * Math.PI * 2, c = Math.cos(an), sn = Math.sin(an);
        const ox = nx * c + bx * sn, oy = ny * c + by * sn, oz = nz * c + bz * sn, k = (i * SIDES + s) * 6, p = path[i];
        verts[k] = p[0] + ox * r; verts[k + 1] = p[1] + oy * r; verts[k + 2] = p[2] + oz * r; verts[k + 3] = ox; verts[k + 4] = oy; verts[k + 5] = oz;
      }
    }
    let m = 0;
    for (let i = 0; i < n - 1; i++) for (let s = 0; s < SIDES; s++) {
      const a = i * SIDES + s, b = i * SIDES + (s + 1) % SIDES, c = a + SIDES, d = b + SIDES;
      idx[m++] = a; idx[m++] = c; idx[m++] = b; idx[m++] = b; idx[m++] = c; idx[m++] = d;
    }
    const u = prog.u;
    gl.useProgram(prog.p);
    gl.uniformMatrix4fv(u.uVP, false, vp);
    gl.uniform3fv(u.uLightPos, P.lightPos); gl.uniform3fv(u.uEye, eye);
    gl.uniform1f(u.uLight, P.light); gl.uniform1f(u.uExposure, P.exposure); gl.uniform1f(u.uToe, P.toe || 0);
    gl.uniform1f(u.uAlb, o.albedo ?? 0.075); gl.uniform1f(u.uFade, o.fade ?? 1); gl.uniform1f(u.uEnv, P.env ?? 0.3);
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.DYNAMIC_DRAW);
    gl.drawElements(gl.TRIANGLES, m, gl.UNSIGNED_INT, 0);
    gl.bindVertexArray(null);
  }
  const free = () => { gl.deleteBuffer(vbo); gl.deleteBuffer(ibo); gl.deleteVertexArray(vao); gl.deleteProgram(prog.p); };
  return { draw, free };
}
// longueur d'un chemin
export const pathLen = pts => { let l = 0; for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]); return l; };
