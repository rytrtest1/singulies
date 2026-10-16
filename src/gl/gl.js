// Utilitaires WebGL2 minimaux.

export function getGL(canvas) {
  const gl = canvas.getContext('webgl2', {
    alpha: false, antialias: false, depth: false, stencil: false,
    premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance',
  });
  return gl || null;
}

function shader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) {
    const log = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error('shader: ' + log + '\n' + src.split('\n').map((l, i) => `${i + 1}: ${l}`).join('\n'));
  }
  return s;
}

export function program(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, shader(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, shader(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  return linked(gl, p);
}
function linked(gl, p) {
  if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) {
    const sh = gl.getAttachedShaders(p) || [], log = sh.map(s => gl.getShaderInfoLog(s)).filter(Boolean).join('\n');
    throw new Error('link: ' + gl.getProgramInfoLog(p) + (log ? '\n' + log : ''));
  }
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, info.name); }
  return { p, u };
}

// (17/10) la même chose sans bloquer la page : le pilote compile en parallèle (KHR_parallel_shader_compile) et l'on
// attend, image après image, qu'il ait fini — le gros shader des objets bloquait 0,8 s par page voisine préparée (le
// « gel » à l'apparition du menu). Sans l'extension : comme program().
export async function programAsync(gl, vs, fs) {
  const ext = gl.getExtension('KHR_parallel_shader_compile');
  if (!ext) return program(gl, vs, fs);
  const p = gl.createProgram(), mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); gl.attachShader(p, s); };
  mk(gl.VERTEX_SHADER, vs); mk(gl.FRAGMENT_SHADER, fs);
  gl.linkProgram(p);
  while (!gl.isContextLost() && !gl.getProgramParameter(p, ext.COMPLETION_STATUS_KHR)) await new Promise(r => setTimeout(r, 16));
  return linked(gl, p);
}

// Texture R16F filtrable à partir d'un Float32Array (distance signée de l'atlas).
export function atlasTexture(gl, atlas) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, atlas.width, atlas.height, 0, gl.RED, gl.FLOAT, atlas.data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

// GLSL partagé : fonction de répartition gaussienne (profil d'un bord flouté).
export const GLSL_COMMON = /* glsl */`
float erfApprox(float x) { // Abramowitz–Stegun 7.1.26, erreur < 1.5e-7
  float s = sign(x); x = abs(x);
  float t = 1.0 / (1.0 + 0.3275911 * x);
  float y = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * exp(-x * x);
  return s * y;
}
float gaussCdf(float x) { return 0.5 + 0.5 * erfApprox(x * 0.70710678); }
`;
