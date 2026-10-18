// La machine à écrire en direct (18/10, essai — Maxence : « on peut pas voir avec un modèle existant ? ») : une Royal
// (tools/machine-prep.mjs → public/machine/<modèle>.bin) dans la lumière du site — par défaut la 1939 Royal Quiet De Luxe
// (theforfeiterofmaidens, CC BY 4.0 ; Maxence : « plutôt elle »), sinon la Royal des années 60 (freddy1231, ?modele=royal) :
// la même courbe « photo » que les cartes (exposition, pied, gamma, gain du boost, le noir du fond à 6), des ombres
// portées (carte d'ombre depuis la lampe). (18/10, Maxence : « elle fait cheap, presque jouet, la lumière dessus fait
// faux, elle change trop ») une prise de vue de studio, fixe : une grande lampe douce, loin, de côté et un peu en
// arrière (jamais du côté du regard), qui ne tourne plus (elle respire à peine) ; une lumière de contour derrière, à
// droite (la silhouette se détache du noir) ; un décor de studio pour les reflets (le noir, la boîte à lumière, une
// bande) — les chromes et le vernis ne reflètent plus un dégradé gris, mais des sources ; l'ombre ambiante cuite par
// sommet (tools/machine-ao.mjs : les creux, le pied sur la table) ; une table noire qui reçoit l'ombre et se fond dans
// le fond. Matières : peinture noire au fer martelé (cuvettes lisses, peu profondes, lues dans le reflet de la lampe,
// effacées quand elles deviennent plus petites qu'un pixel), chromes, touches en verre noir cerclées de chrome, leur
// lettre blanche dessous.
// Les touches fonctionnent : chacune (et son levier) pivote autour de l'arrière du levier ; le chariot avance d'un cran
// (pica, 2,54 mm) à chaque frappe ; la lettre s'imprime en blanc sur la feuille noire. (18/10, Maxence : « on veut
// écrire le prénom en colonne pour l'acrostiche, et visible ») une lettre par ligne : frappée, puis le chariot revient
// à la marge et la feuille monte d'une ligne ; une espace = une ligne blanche (deux strophes). La 1939 n'a pas de
// feuille : (18/10, Maxence : « la feuille doit être de la même texture que celle des scènes suivantes et les lettres du
// prénom les mêmes aussi ») c'est LA feuille du poème — l'A4 du moteur des cartes (même papier photographié, même logo
// gaufré en tête, même lumière), dressée contre le cylindre, coupée à la ligne de frappe (en dessous, elle est dans la
// machine) — et les lettres de la colonne sont celles de l'acrostiche (Garamond allumé, nameRelief), à leur taille et
// à leur place sur la feuille (capitale 6,4, interligne 10,5, marge COL_X : sheet.js) ; la feuille glisse avec le chariot.
import { M4, createCardRenderer } from '../cards/cardRenderer.js';
import { LOOK } from '../cards/scene.js';
import { createNameRelief } from '../cards/nameRelief.js';
import { SHEET, LOGO_Y, LOGO_K, COL_X as SCOL_X } from '../sheet/sheet.js';
import { objLamp } from '../livres/book3d.js';
import { LUM } from '../app/lum.js';

export const PITCH = 2.54;                     // pica : 10 caractères au pouce
const DOWN_T = 0.05, HOLD_T = 0.04, UP_T = 0.16;
const KEY_ANG = 0.075;                          // rad : la touche descend d'≈ 7 mm
// l'encre de la feuille, en coordonnées de la feuille (mm) : x (repère du modèle, avant le chariot), v le long de la feuille
// vers le haut, 0 = la ligne de frappe
const INK = { x0: -115, x1: 115, v0: -215, v1: 35, W: 1840, H: 2000 };
// (18/10, Maxence : « pas du tout assez gros pour être vu ») les lettres de la colonne à la taille de l'acrostiche de
// la feuille du site — capitale 6,4 mm, interligne 10,5 mm (sheet.js) — et non au pica réel (capitale ≈ 2,5 mm) ; la
// colonne à 35 mm à gauche du milieu de la feuille (la place des vers à sa droite) — le chariot y revient à chaque
// ligne, la colonne se forme au point de frappe, au milieu
const LS = 10.5, CAP = 6.4, COL_X = -35;
const RET_T = 0.2;                              // s : après la frappe, le retour du chariot et l'interligne
const PRINT_X = 0;                              // le point de frappe, fixe (le chariot passe devant lui)

const VS = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNor;
layout(location=2) in uint aKind;
layout(location=3) in uint aSlot;
layout(location=4) in vec2 aPaper;
layout(location=5) in float aAO;
uniform mat4 uVP;
uniform float uKeyA[64];
uniform vec2 uKeyP[64];
uniform float uCarX;
out vec3 vWorld; out vec3 vN; out vec3 vObj; out vec3 vObjN; out vec2 vPaper; out float vAO; flat out uint vKind; flat out uint vSlot;
void main() {
  vec3 p = aPos, n = aNor;
  if (aSlot > 0u && aSlot < 64u) {
    // la touche et son levier : rotation autour de l'axe x passant par l'arrière du levier
    float a = uKeyA[aSlot]; vec2 c = uKeyP[aSlot];
    float ca = cos(a), sa = sin(a);
    vec2 q = p.yz - c; p.yz = c + vec2(ca * q.x + sa * q.y, -sa * q.x + ca * q.y);
    n.yz = vec2(ca * n.y + sa * n.z, -sa * n.y + ca * n.z);
  } else if (aSlot == 255u) p.x += uCarX;
  vObj = aPos; vObjN = aNor; vPaper = aPaper; vKind = aKind; vSlot = aSlot; vAO = aAO; vWorld = p; vN = n;
  gl_Position = uVP * vec4(p, 1.0);
}`;

const FS = `#version 300 es
precision highp float;
precision highp sampler2DShadow;
in vec3 vWorld; in vec3 vN; in vec3 vObj; in vec3 vObjN; in vec2 vPaper; in float vAO; flat in uint vKind; flat in uint vSlot;
uniform vec3 uLightPos, uEye, uKeyDir, uRimDir;
uniform float uLight, uLightR, uEnv, uExposure, uToe, uHammer, uFlat, uPaperK, uFeed, uRim;
uniform mat4 uShadowVP;
uniform sampler2DShadow uShadow;
uniform sampler2D uInk, uGlyph;
uniform vec4 uInkBox;     // x0, v0, 1/(x1−x0), 1/(v1−v0)
uniform vec3 uKeyC[64];   // touche : centre (x, y), rayon du dessus (0 = pas ronde)
uniform float uKeyG[64];  // sa lettre dans l'atlas (−1 : aucune)
uniform vec4 uFoot;       // l'empreinte de la machine sur la table (x0, y0, x1, y1)
uniform vec2 uGround;     // la table se fond dans le fond entre ces deux rayons (mm)
out vec4 outColor;
const float PI = 3.14159265;
float h3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
// le martelé : des cuvettes rondes et lisses (Voronoï adouci : pas d'arêtes vives entre deux coups, sinon c'est du cuir)
float dimples(vec3 p) {
  vec3 i = floor(p), f = fract(p); float r = 0.0;
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec3 g = vec3(x, y, z), o = vec3(h3(i + g), h3(i + g + 11.7), h3(i + g + 23.1));
    vec3 d = g + 0.1 + 0.8 * o - f; r += exp(-6.0 * sqrt(dot(d, d)));
  }
  float d = -log(r) / 6.0;
  return d * d;
}
float hammer(vec3 p) { return dimples(p / 4.2) + 0.35 * dimples(p / 1.9 + 7.0); }
// le studio : noir, une grande boîte à lumière (la lampe), une bande derrière à droite (le contour), un plafond à peine
float studio(vec3 d) {
  float k = smoothstep(0.86, 0.99, dot(d, uKeyDir));
  float r = smoothstep(0.955, 0.985, dot(d, uRimDir)) * smoothstep(-0.1, 0.3, d.z);
  return 0.01 + 0.025 * smoothstep(-0.2, 0.9, d.z) + 1.3 * k * k + 0.9 * r;
}
// la même, vue par une surface mate (tout l'hémisphère)
float studioDiff(vec3 n) { return 0.07 + 0.04 * n.z + 0.22 * max(dot(n, uKeyDir), 0.0) + 0.08 * max(dot(n, uRimDir), 0.0); }
float D_GGX(float NH, float a) { float a2 = a * a, d = NH * NH * (a2 - 1.0) + 1.0; return a2 / (PI * d * d); }
float V_Smith(float NL, float NV, float a) { float k = a * 0.5; return 0.25 / ((NL * (1.0 - k) + k) * (NV * (1.0 - k) + k)); }
float shadowAt(vec3 w, float NL) {
  vec4 s = uShadowVP * vec4(w, 1.0); s.xyz = s.xyz / s.w * 0.5 + 0.5;
  if (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0) return 1.0;
  float b = 0.0005 + 0.002 * (1.0 - NL);
  vec2 px = 1.0 / vec2(textureSize(uShadow, 0));
  // pénombre douce (une grande lampe) : 16 échantillons sur un disque
  float acc = 0.0;
  for (int k = 0; k < 16; k++) {
    float a = float(k) * 2.39996, r = sqrt((float(k) + 0.5) / 16.0) * 3.2;
    acc += texture(uShadow, vec3(s.xy + vec2(cos(a), sin(a)) * r * px, s.z - b));
  }
  return acc / 16.0;
}
void main() {
  uint k = vKind;
  if (k == 9u) discard;                         // pièces retirées (la plaque « DIGITAL DESIGN », un plan perdu)
  vec3 n = normalize(vN);
  vec3 V = normalize(uEye - vWorld);
  if (dot(n, V) < 0.0) n = -n;                  // faces vues de dos (le modèle n'est pas fermé partout)
  vec3 L = uLightPos - vWorld; float dist = length(L); L /= dist;
  float irr = uLight * 250000.0 / (dist * dist);
  float ao = vAO;
  // matières : albédo, rugosité, F0 (métal), force du reflet direct, du reflet du décor
  float alb = 0.029, rough = 0.6, F0 = 0.04, ks = 1.0, envK = 1.0, ink = 0.0, legend = 0.0;
  float fw = length(fwidth(vObj));              // mm par pixel
  if (k == 0u) {
    // carrosserie : peinture noire au fer martelé, satinée — le martelé se lit dans le reflet de la lampe
    float hk = uHammer * (1.0 - smoothstep(0.35, 1.1, fw));
    if (hk > 0.0) {
      float e = 0.3, h0 = hammer(vObj);
      vec3 g = vec3(hammer(vObj + vec3(e, 0, 0)) - h0, hammer(vObj + vec3(0, e, 0)) - h0, hammer(vObj + vec3(0, 0, e)) - h0) / e;
      g -= n * dot(g, n);
      n = normalize(n - hk * g);
    }
    alb = 0.05; rough = 0.3; ks = 1.0; envK = 1.0;
  } else if (k == 1u) { alb = 0.0; rough = 0.12; F0 = 0.6; ks = 1.0; envK = 1.0; }          // chromes
  else if (k == 2u) { alb = 0.04; rough = 0.42; F0 = 0.06; ks = 1.0; envK = 0.8; }          // métal noir (leviers, rails)
  else if (k == 3u) {
    // touches : verre noir cerclé de chrome, la lettre blanche sous le verre
    alb = 0.012; rough = 0.08; F0 = 0.045; ks = 1.0; envK = 1.0;
    vec3 c = uKeyC[vSlot];
    vec2 q = (vObj.xy - c.xy) / max(c.z, 1e-3);
    float r = length(q);
    if (c.z > 0.0 && vObjN.z > 0.7 && r < 1.08) {
      if (r > 0.8) { alb = 0.0; rough = 0.14; F0 = 0.6; }
      else if (uKeyG[vSlot] >= 0.0) {
        float gi = uKeyG[vSlot];
        vec2 cell = vec2(mod(gi, 8.0), floor(gi / 8.0));
        vec2 uv = (cell + 0.5 + vec2(q.x, -q.y) * 0.5) / vec2(8.0, 5.0);
        legend = texture(uGlyph, uv).r;
      }
    } else if (c.z > 0.0 && vObjN.z <= 0.7) { alb = 0.0; rough = 0.16; F0 = 0.6; }       // le flanc du cercle
  }
  else if (k == 4u) { alb = 0.03; rough = 0.7; F0 = 0.035; ks = 0.6; envK = 0.4; }          // caoutchouc (cylindre, barre)
  else if (k == 5u) {                                                                         // la feuille (Royal 60) : papier noir
    alb = 0.029 * uPaperK; rough = 0.5; ks = 1.5; envK = 0.3;
    vec2 uv = vec2((vPaper.x - uInkBox.x) * uInkBox.z, 1.0 - (vPaper.y - uFeed - uInkBox.y) * uInkBox.w);
    if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) ink = texture(uInk, uv).r;
  } else if (k == 7u) { alb = 0.02; rough = 0.25; F0 = 0.5; ks = 1.0; envK = 0.8; }          // boutons, laiton noirci
  else if (k == 6u) { alb = 0.015; rough = 0.18; F0 = 0.05; envK = 1.0; }                   // la plaque de la marque
  else if (k == 10u) {
    // la table : papier noir mat ; l'ombre ambiante au pied de la machine (distance à son empreinte)
    alb = 0.016; rough = 0.8; F0 = 0.035; ks = 0.5; envK = 0.0;
    vec2 dq = max(max(uFoot.xy - vWorld.xy, vWorld.xy - uFoot.zw), 0.0);
    float dd = length(dq), inside = step(dd, 0.0);
    ao = mix(smoothstep(0.0, 45.0, dd) * 0.75 + 0.25, 0.12, inside);
  }
  else { alb = 0.02; rough = 0.5; ks = 0.8; envK = 0.5; }
  if (uFlat > 0.0) { alb = 0.3; F0 = 0.04; envK = 0.0; legend = 0.0; }
  alb = mix(alb, 0.85 * ${LUM.ink.toFixed(3)}, ink);
  alb = mix(alb, 0.42, legend);
  // le grain fin de la surface : la rugosité varie un peu (rien n'est parfaitement lisse)
  rough = clamp(rough * (0.9 + 0.2 * h3(floor(vObj * 2.0))), 0.04, 1.0);
  float NL = max(dot(n, L), 0.0), NV = max(dot(n, V), 1e-3);
  vec3 H = normalize(L + V);
  // la taille apparente de la lampe élargit le reflet
  float a = clamp(rough * rough + 0.5 * uLightR / dist, 0.02, 1.0);
  float F = F0 + (1.0 - F0) * pow(1.0 - max(dot(V, H), 0.0), 5.0);
  float spec = ks * D_GGX(max(dot(n, H), 0.0), a) * V_Smith(NL, NV, a) * F * (1.0 - ink);
  float sh = NL > 0.0 ? shadowAt(vWorld + n * 0.3, NL) : 0.0;
  // le contour : sans ombre portée, retenu par l'occlusion (il n'entre pas sous le capot)
  float NLr = max(dot(n, uRimDir), 0.0);
  vec3 Hr = normalize(uRimDir + V);
  float ar = clamp(rough * rough + 0.08, 0.02, 1.0);
  float Fr = F0 + (1.0 - F0) * pow(1.0 - max(dot(V, Hr), 0.0), 5.0);
  float rim = uRim * NLr * (alb + ks * D_GGX(max(dot(n, Hr), 0.0), ar) * V_Smith(NLr, NV, ar) * Fr) * ao * ao;
  // le décor : diffus (tout l'hémisphère) et reflet (une direction), éteints dans les creux
  vec3 R = reflect(-V, n);
  float Fv = F0 + (1.0 - F0) * pow(1.0 - NV, 5.0);
  float gls = 1.0 - rough;                                   // une surface rugueuse voit un décor flou : moins de contraste
  float envR = mix(studioDiff(R), studio(R), gls * gls);
  float amb = uEnv * (alb * studioDiff(n) * ao + envK * Fv * envR * ao * (0.4 + 0.6 * sh));
  vec3 col = vec3(irr * (NL * sh * (alb + spec) + rim) + amb);
  col *= uExposure;
  col = max(col - uToe, 0.0) / (1.0 - uToe);
  col = pow(max(col, 0.0), vec3(1.0 / 2.2));
  col = vec3(6.0 / 255.0) + max(col - 6.0 / 255.0, 0.0) * ${LUM.gain.toFixed(3)};
  if (k == 10u) col = mix(col, vec3(6.0 / 255.0), smoothstep(uGround.x, uGround.y, length(vWorld.xy - 0.5 * (uFoot.xy + uFoot.zw))));
  outColor = vec4(col, 1.0);
}`;

const SVS = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=2) in uint aKind;
layout(location=3) in uint aSlot;
uniform mat4 uVP;
uniform float uKeyA[64];
uniform vec2 uKeyP[64];
uniform float uCarX;
flat out uint vKind;
void main() {
  vec3 p = aPos;
  if (aSlot > 0u && aSlot < 64u) { float a = uKeyA[aSlot]; vec2 c = uKeyP[aSlot]; float ca = cos(a), sa = sin(a); vec2 q = p.yz - c; p.yz = c + vec2(ca * q.x + sa * q.y, -sa * q.x + ca * q.y); }
  else if (aSlot == 255u) p.x += uCarX;
  vKind = aKind;
  gl_Position = uVP * vec4(p, 1.0);
}`;
const SFS = `#version 300 es
precision highp float;
flat in uint vKind;
out vec4 o;
void main() { if (vKind == 9u || vKind == 10u) discard; o = vec4(1); }`;

function compile(gl, vs, fs) {
  const p = gl.createProgram();
  for (const [t, s] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
    const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    gl.attachShader(p, sh);
  }
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = new Proxy({}, { get: (o, k) => (k in o ? o[k] : (o[k] = gl.getUniformLocation(p, k))) });
  return { p, u };
}

// le clavier de la Royal (QWERTY, comme la vraie) : rangées de l'avant vers l'arrière, touches de gauche à droite
const ROWS = ['ZXCVBNM', 'ASDFGHJKL', 'QWERTYUIOP', '23456789'];

export async function createMachine(gl, base = './', model = 'qdl39') {
  const meta = await fetch(base + `machine/${model}.json`).then(r => r.json());
  const buf = await fetch(base + `machine/${model}.bin`).then(r => r.arrayBuffer());
  // l'ombre ambiante cuite (tools/machine-ao.mjs) ; absente : tout ouvert
  const aoBuf = await fetch(base + `machine/${model}-ao.bin`).then(r => (r.ok ? r.arrayBuffer() : null)).catch(() => null);
  const { nv: nv0, ni: ni0, offs, kinds: KD } = meta;
  const pos0 = new Float32Array(buf, offs[0], nv0 * 3), nor0 = new Int16Array(buf, offs[1], nv0 * 3);
  const kind0 = new Uint8Array(buf, offs[2], nv0), isl = new Uint16Array(buf, offs[3], nv0), idx0 = new Uint32Array(buf, offs[4], ni0);
  const I = meta.islands, ctr = o => o.lo.map((l, c) => (l + o.hi[c]) / 2), wid = o => o.hi[0] - o.lo[0];
  const hide = new Uint8Array(I.length);

  // les touches : îles « touches » ; les lettres ont toutes la même largeur (la médiane), les touches de fonction —
  // majuscules, blocage, tabulation, retour — sont plus larges : elles ne prennent pas de lettre
  const caps = I.filter(o => o.kind === KD.keys && o.hi[2] - o.lo[2] > 1);
  for (const o of I) if (o.kind === KD.keys && o.hi[2] - o.lo[2] <= 1 && wid(o) > 100) hide[o.i] = 1;   // (1939 : un plan perdu au-dessus des touches)
  const med = caps.map(wid).sort((a, b) => a - b)[caps.length >> 1];
  const narrow = o => wid(o) < med * 1.15;
  // les leviers : îles de métal noir longues et fines, sous les touches
  const levers = I.filter(o => o.kind === KD.black && o.hi[1] - o.lo[1] > 20 && wid(o) < 3 && o.hi[2] < 90);
  const slotOf = new Uint8Array(I.length);
  const keys = [], letter = {};
  // (une rangée = au moins 7 touches à la même hauteur : une touche isolée, comme le blocage, n'en fait pas une)
  const zc = new Map(); for (const o of caps.filter(narrow)) { const z = Math.round(o.lo[2]); zc.set(z, (zc.get(z) || 0) + 1); }
  const rowsZ = [...zc].filter(([, n]) => n >= 7).map(([z]) => z).sort((a, b) => a - b);
  let slot = 1;
  const addKey = (c, lv) => {
    const cc = ctr(c);
    // toutes pivotent loin à l'arrière (comme les vrais leviers) : la touche descend presque droit
    const k = { slot, cap: c.i, lever: lv ? lv.i : -1, x: cc[0], y: cc[1], z: c.lo[2], w: wid(c), piv: [cc[1] + 95, c.lo[2] - 15], t0: -1 };
    slotOf[c.i] = slot; if (lv) slotOf[lv.i] = slot;
    keys.push(k); slot++; return k;
  };
  for (const c of caps) {
    const lv = levers.filter(l => l.lo[0] > c.lo[0] - 2 && l.hi[0] < c.hi[0] + 2 && Math.abs(l.lo[1] - c.lo[1]) < 25)
      .sort((a, b) => Math.abs(a.lo[1] - c.lo[1]) - Math.abs(b.lo[1] - c.lo[1]))[0];
    addKey(c, lv);
  }
  // les lettres : par rangée (même hauteur de touche), de gauche à droite, les touches étroites seulement
  for (let r = 0; r < rowsZ.length && r < ROWS.length; r++) {
    const row = keys.filter(k => Math.round(k.z) === rowsZ[r] && k.w < med * 1.15).sort((a, b) => a.x - b.x);
    [...ROWS[r]].forEach((ch, j) => { if (row[j]) letter[ch] = row[j]; });
  }
  // la barre d'espace : la pièce longue tout devant, en bas (touche ou caoutchouc selon le modèle)
  const frontY = Math.min(...caps.map(o => o.lo[1]));
  const sp = I.filter(o => wid(o) > 100 && o.hi[2] < 45 && o.lo[1] < frontY + 5 && o.n < 2000).sort((a, b) => a.lo[1] - b.lo[1])[0];
  const space = sp ? (keys.find(k => k.cap === sp.i) || addKey(sp, null)) : null;
  if (space) space.piv = [space.y + 70, space.z - 10];

  // le cylindre : la pièce de caoutchouc la plus large, en haut
  const pl = I.filter(o => o.kind === KD.rubber && wid(o) > 200 && o.lo[2] > 90).sort((a, b) => wid(b) - wid(a))[0];
  const platen = pl ? { y: (pl.lo[1] + pl.hi[1]) / 2, z: (pl.lo[2] + pl.hi[2]) / 2, r: (pl.hi[2] - pl.lo[2]) / 2 } : { y: 70, z: 155, r: 20 };

  // le chariot : ce qui est au-dessus et derrière le cylindre (cylindre, feuille, boutons, rails du chariot, levier de
  // retour) glisse d'un bloc ; pas le corps ni le guide des caractères (au point de frappe)
  const carriage = new Uint8Array(I.length);
  for (const o of I) {
    const c = ctr(o);
    if (o.kind === KD.label || slotOf[o.i]) continue;
    if (model === 'royal') { if (o.n <= 7000 && c[2] > 128 && (c[1] > 30 || (o.kind === KD.chrome && o.lo[0] < -117))) carriage[o.i] = 1; }
    else if (c[1] > platen.y - 20 && c[2] > 100 && o.n < 800) carriage[o.i] = 1;
  }
  // la plaque « DIGITAL DESIGN » (Royal 60) : retirée
  if (model === 'royal') for (const o of I) if ((o.kind === KD.other && o.lo[1] < -80 && o.lo[2] > 110) || o.kind === KD.label) hide[o.i] = 1;

  // la feuille de la 1939 (le modèle n'en a pas) : une bande de 210 mm, son profil (y, z) suivi pas à pas — elle sort
  // de sous le cylindre, monte contre l'avant, s'enroule jusque sous les galets (≈ 65°), puis se redresse et se dresse
  // en arrière (≈ 26° de la verticale) ; v = longueur le long de la feuille depuis la ligne de frappe (juste au-dessus du
  // guide du ruban)
  let sheet = null, plane = null, sheetAt = v => [platen.y - platen.r, platen.z + 15 + v];
  const hasPaper = I.some(o => o.kind === KD.paper);
  if (!hasPaper) {
    // (sous la ligne de frappe, la feuille s'enroule sur le cylindre ; elle le quitte en tangente à ≈ 50°, au-dessus du
    // guide du ruban et derrière la barre du presse-papier : de là, un plan — la feuille du moteur des cartes)
    const R = platen.r + 0.35, prof = [], TH1 = 0.87;
    let th = -0.7, s = 0;
    for (; th <= TH1 + 1e-6; th += 1.5 / R, s += 1.5) prof.push([platen.y - R * Math.cos(th), platen.z + R * Math.sin(th), s, th]);
    const sLine = s;
    plane = { o: [0, platen.y - R * Math.cos(TH1), platen.z + R * Math.sin(TH1)], u: [0, Math.sin(TH1), Math.cos(TH1)], n: [0, -Math.cos(TH1), Math.sin(TH1)] };
    const XS = [-105, 105], nP = prof.length;
    const P = new Float32Array(nP * 2 * 3), Nn = new Int16Array(nP * 2 * 3), UV = new Float32Array(nP * 2 * 2), ix2 = [];
    prof.forEach(([py, pz, ps, pphi], i) => {
      XS.forEach((x, j) => {
        const v = i * 2 + j;
        P.set([x, py, pz], v * 3);
        // normale vers l'avant de la feuille (le côté imprimé)
        Nn.set([0, Math.round(-Math.cos(pphi) * 32767), Math.round(Math.sin(pphi) * 32767)], v * 3);
        UV.set([x, ps - sLine], v * 2);
      });
      if (i) ix2.push(i * 2 - 2, i * 2 - 1, i * 2, i * 2 - 1, i * 2 + 1, i * 2);
    });
    sheet = { P, N: Nn, UV, I: ix2, n: nP * 2 };
    // un point de la feuille (y, z) à v mm de la ligne de frappe, le long de la feuille
    sheetAt = v => [plane.o[1] + plane.u[1] * v, plane.o[2] + plane.u[2] * v];
  }

  // la table : un carré de papier noir sous la machine (il se fond dans le fond bien avant ses bords)
  const bodyI = I.filter(o => o.kind === KD.body);
  const foot = [Math.min(...bodyI.map(o => o.lo[0])), Math.min(...bodyI.map(o => o.lo[1])), Math.max(...bodyI.map(o => o.hi[0])), Math.max(...bodyI.map(o => o.hi[1]))];
  const GR = 900;
  const ground = { P: new Float32Array([-GR, -GR, -0.1, GR, -GR, -0.1, GR, GR, -0.1, -GR, GR, -0.1]), I: [0, 1, 2, 0, 2, 3], n: 4 };

  // les tampons : le modèle (+ la feuille ajoutée, + la table)
  const nS = sheet ? sheet.n : 0, nvS = nv0 + nS;
  const nv = nvS + ground.n, ni = ni0 + (sheet ? sheet.I.length : 0) + 6;
  const pos = new Float32Array(nv * 3), nor = new Int16Array(nv * 3), kind = new Uint8Array(nv), slotV = new Uint8Array(nv), paper = new Float32Array(nv * 2), idx = new Uint32Array(ni);
  const aoV = new Uint8Array(nv).fill(255);
  if (aoBuf && aoBuf.byteLength === nv0) aoV.set(new Uint8Array(aoBuf));
  pos.set(pos0); nor.set(nor0); kind.set(kind0); idx.set(idx0);
  for (let v = 0; v < nv0; v++) {
    const o = isl[v];
    if (hide[o]) kind[v] = 9;
    slotV[v] = slotOf[o] || (carriage[o] ? 255 : 0);
    // (Royal 60 : sa feuille, en x et en hauteur — la ligne de frappe à z = 186)
    if (kind0[v] === KD.paper) { paper[v * 2] = pos0[v * 3]; paper[v * 2 + 1] = pos0[v * 3 + 2] - 186; slotV[v] = 255; }
  }
  if (sheet) {
    pos.set(sheet.P, nv0 * 3); nor.set(sheet.N, nv0 * 3); paper.set(sheet.UV, nv0 * 2);
    kind.fill(KD.paper, nv0); slotV.fill(255, nv0);
    idx.set(sheet.I.map(i => i + nv0), ni0);
  }
  pos.set(ground.P, nvS * 3); kind.fill(10, nvS);
  for (let v = 0; v < 4; v++) nor[(nvS + v) * 3 + 2] = 32767;
  idx.set(ground.I.map(i => i + nvS), ni - 6);

  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const vb = (data, loc, size, type, norm, int) => {
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(loc);
    if (int) gl.vertexAttribIPointer(loc, size, type, 0, 0); else gl.vertexAttribPointer(loc, size, type, norm, 0, 0);
  };
  vb(pos, 0, 3, gl.FLOAT, false); vb(nor, 1, 3, gl.SHORT, true); vb(kind, 2, 1, gl.UNSIGNED_BYTE, false, true); vb(slotV, 3, 1, gl.UNSIGNED_BYTE, false, true);
  vb(paper, 4, 2, gl.FLOAT, false); vb(aoV, 5, 1, gl.UNSIGNED_BYTE, true);
  const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  gl.bindVertexArray(null);

  const prog = compile(gl, VS, FS), sprog = compile(gl, SVS, SFS);

  // la feuille du poème et ses lettres (1939) : le moteur des cartes et le prénom en relief, dans le même contexte
  const MMU = Math.SQRT1_2;                       // unités de la feuille par mm (A4 = 148 × 210 unités)
  let card = null, nameR = null, sheetV = null, CS = null;
  if (plane) {
    card = await createCardRenderer(gl, base);
    card.addShape('msheet', { ...SHEET, fine: [10, 10, 0.25, 0, LOGO_Y] });
    nameR = await createNameRelief(gl, card.paperTex);
    const r = (a, b) => a + Math.random() * (b - a);
    sheetV = { seed: Math.random() * 100, paperXf: [r(-2.5, 2.5), r(-1.5, 1.5), Math.random() < 0.5 ? 0 : Math.PI, 0], warp: [0, 0, 0],
      logoOff: [0, LOGO_Y], logoScale: [LOGO_K, LOGO_K], noLogo: false, paperTile: 0.6 * 87 / 0.7, paperLo: 0.35 };
    // la colonne de la feuille (sheet.js) : capitale 6,4, interligne 10,5, haut sous le logo ; l'axe de la colonne fixé
    // par la lettre la plus large (on ne connaît pas le prénom entier pendant qu'on le tape)
    const LEAD = 10.5, CAPU = 6.4, emT = CAPU / nameR.capHeight;
    const W_COL = Math.max(...[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map(c => nameR.adv(c))) * emT;
    CS = { LEAD, CAPU, emT, Y0: SHEET.h / 2 - 32 - CAPU, COL_C: SCOL_X + W_COL / 2 };
  }

  // les lettres des touches (blanches sous le verre, linéales comme sur les vraies Royal) : un atlas 8 × 5
  const ATL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ23456789';
  const gC = document.createElement('canvas'); gC.width = 1024; gC.height = 640;
  { const g = gC.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 1024, 640); g.fillStyle = '#fff';
    g.font = '500 58px Futura, "Century Gothic", "Avenir Next", "Helvetica Neue", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    [...ATL].forEach((ch, i) => g.fillText(ch, (i % 8) * 128 + 64, Math.floor(i / 8) * 128 + 66)); }
  const glyphTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, glyphTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, gC);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.generateMipmap(gl.TEXTURE_2D);
  const keyC = new Float32Array(64 * 3), keyG = new Float32Array(64).fill(-1);
  for (const kk of keys) { keyC.set([kk.x, kk.y, kk.w < med * 1.15 ? kk.w / 2 : 0], kk.slot * 3); }
  for (const [ch, kk] of Object.entries(letter)) keyG[kk.slot] = ATL.indexOf(ch);

  // la carte d'ombre
  const SM = 2048;
  const smTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, smTex);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, SM, SM);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const smFb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, smFb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, smTex, 0);
  gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  // l'encre de la feuille : un canvas (x, v de la feuille) où les lettres s'impriment
  const inkC = document.createElement('canvas'); inkC.width = INK.W; inkC.height = INK.H;
  const ix = inkC.getContext('2d', { willReadFrequently: true });
  ix.fillStyle = '#000'; ix.fillRect(0, 0, INK.W, INK.H);
  const inkTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, inkTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, INK.W, INK.H, 0, gl.RED, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  let inkDirty = true;
  const upInk = () => {
    const d = ix.getImageData(0, 0, INK.W, INK.H).data, r = new Uint8Array(INK.W * INK.H);
    for (let i = 0; i < r.length; i++) r[i] = d[i * 4];
    gl.bindTexture(gl.TEXTURE_2D, inkTex); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, INK.W, INK.H, gl.RED, gl.UNSIGNED_BYTE, r);
    gl.generateMipmap(gl.TEXTURE_2D); inkDirty = false;
  };
  const sx = INK.W / (INK.x1 - INK.x0), sz = INK.H / (INK.v1 - INK.v0);
  // une frappe : la lettre (Courier, pica), un peu décalée, appui inégal, à la place du point de frappe sur
  // la feuille (le chariot s'est déplacé : la feuille aussi)
  let capK = 0;
  function strikeInk(ch, xPaper, vPaper = 0) {
    // la capitale mesurée sur la police (Courier) : CAP mm de haut
    if (!capK) { ix.font = '100px "SG Machine", "Courier New", monospace'; capK = (ix.measureText('H').actualBoundingBoxAscent || 57) / 100; }
    const fs = CAP / capK * sz;
    ix.save();
    ix.font = `${fs}px "SG Machine", "Courier New", monospace`;
    ix.textAlign = 'center'; ix.textBaseline = 'alphabetic';
    const X = (xPaper - INK.x0) * sx + (Math.random() - 0.5) * 0.12 * sx, Y = (INK.v1 - vPaper) * sz + (Math.random() - 0.5) * 0.15 * sz;
    const v = 0.78 + Math.random() * 0.22;
    ix.translate(X, Y); ix.rotate((Math.random() - 0.5) * 0.02);
    ix.fillStyle = `rgb(${Math.round(255 * v)},0,0)`;
    ix.fillText(ch, 0, 0);
    // l'encre du ruban épaissit le trait (le Courier seul est trop fin pour se lire de loin)
    ix.strokeStyle = ix.fillStyle; ix.lineWidth = 0.32 * sz; ix.lineJoin = 'round'; ix.strokeText(ch, 0, 0);
    // appui inégal : un côté pâlit
    const g = ix.createLinearGradient(-fs * 0.3, 0, fs * 0.3, 0), side = Math.random() < 0.5;
    g.addColorStop(side ? 0 : 1, 'rgba(0,0,0,0.35)'); g.addColorStop(side ? 1 : 0, 'rgba(0,0,0,0)');
    ix.globalCompositeOperation = 'source-atop'; ix.fillStyle = g; ix.fillRect(-fs, -fs, 2 * fs, 1.4 * fs);
    ix.restore();
    inkDirty = true;
  }

  // l'état : le chariot (sa position cible, son glissement), les frappes en cours
  // la feuille monte d'une ligne à chaque retour ; quand on s'arrête de taper, encore deux interlignes : la dernière
  // lettre sort de derrière le ruban et le presse-papier (on roule la feuille pour se relire, comme sur la vraie
  // machine) ; elle redescend si l'on reprend
  const LSM = CS ? CS.LEAD / MMU : LS;             // l'interligne (mm)
  const FEED = model === 'royal' ? 0 : (CS ? 1.6 : 2.6) * LSM, FEED_AFTER = 0.6;
  const st = { car0: -COL_X, car: -COL_X, carV: -COL_X, typed: [], nowT: 0, last: -9, ret: -9, feed: 0 };
  const now = () => performance.now() / 1000;
  function press(k, t = now()) { if (k) k.t0 = t; }
  // taper un caractère : la touche s'enfonce ; au fond de sa course la lettre s'imprime (ligne i de la colonne), le
  // chariot avance d'un cran, puis revient à la marge et la feuille monte d'une ligne. La place de chaque lettre ne
  // dépend que de son rang (frappe rapide : jamais deux lettres sur la même ligne)
  function type(ch) {
    const c = ch.toUpperCase();
    const k = c === ' ' ? space : letter[c];
    const t = now();
    press(k, t); st.last = t; st.ret = t + RET_T;
    const xPaper = COL_X, vPaper = -st.typed.length * LS;
    st.typed.push({ ch: c, xPaper, vPaper, at: t + DOWN_T });
    if (nameR) nameR.letters(st.typed.map(o => o.ch));
    else if (c !== ' ') setTimeout(() => strikeInk(c, xPaper, vPaper), DOWN_T * 1000);
  }
  // effacer : la feuille redescend d'une ligne ; la lettre disparaît (le modèle reste la source de vérité)
  function erase() {
    const last = st.typed.pop(); if (!last) return;
    if (nameR) nameR.letters(st.typed.map(o => o.ch)); else redraw();
  }
  function redraw() { ix.fillStyle = '#000'; ix.fillRect(0, 0, INK.W, INK.H); for (const t of st.typed) if (t.ch !== ' ') strikeInk(t.ch, t.xPaper, t.vPaper); inkDirty = true; }
  function reset() { st.typed = []; st.car = st.carV = st.car0; st.feed = 0; redraw(); }

  const keyA = new Float32Array(64), keyP = new Float32Array(128);
  for (const k of keys) { keyP[k.slot * 2] = k.piv[0]; keyP[k.slot * 2 + 1] = k.piv[1]; }

  // cam : { az, el, dist, target:[x,y,z] } ; t : la respiration ; tilt : la souris
  function frame(W, H, cam, t = 0, tilt = { x: 0, y: 0 }, opt = {}) {
    const T = now(), dt = st.nowT ? Math.min(0.1, T - st.nowT) : 0; st.nowT = T;
    // le chariot glisse d'un cran (sec, avec un petit rebond)
    // pendant la frappe, le chariot a avancé d'un cran ; au retour il revient à la marge (vite), la feuille monte
    const striking = T < st.ret;
    st.car = st.car0 - (striking ? PITCH : 0);
    st.carV += (st.car - st.carV) * Math.min(1, dt * (striking ? 30 : 18));
    const lines = Math.max(0, st.typed.length - (striking ? 1 : 0));
    const fT = lines * LSM + (st.typed.length && T - st.last > FEED_AFTER ? FEED : 0);
    // (le cylindre tourne vite : une ligne en ≈ 0,12 s)
    st.feed += Math.sign(fT - st.feed) * Math.min(Math.abs(fT - st.feed), dt * 120);
    for (const k of keys) {
      if (k.t0 < 0) { keyA[k.slot] = 0; continue; }
      const u = T - k.t0;
      const a = u < DOWN_T ? u / DOWN_T : u < DOWN_T + HOLD_T ? 1 : u < DOWN_T + HOLD_T + UP_T ? 1 - (u - DOWN_T - HOLD_T) / UP_T : 0;
      keyA[k.slot] = KEY_ANG * (a * a * (3 - 2 * a));
      if (u > DOWN_T + HOLD_T + UP_T) k.t0 = -1;
    }
    if (inkDirty) upInk();

    const tg = cam.target || [0, -10, 80];
    const eye = [tg[0] + cam.dist * Math.cos(cam.el) * Math.cos(cam.az), tg[1] + cam.dist * Math.cos(cam.el) * Math.sin(cam.az), tg[2] + cam.dist * Math.sin(cam.el)];
    const fov = cam.fov || 26 * Math.PI / 180;
    const vp = M4.mul(M4.perspective(fov, W / H, cam.dist * 0.2, cam.dist * 4), M4.lookAt(eye, tg, [0, 0, 1]));
    // la lampe : celle des cartes pour l'exposition et la force (à la mesure de la machine, au repos), mais posée loin,
    // fixe, à gauche (à peine en arrière), ≈ 43° de haut ; elle respire à peine (± 2°, jamais la souris) — sa force
    // ramenée à la même lumière au centre de la machine
    const P0 = objLamp({ ...LOOK }, opt.lampSize || 300, 0, { x: 0, y: 0 }, 1.9);
    const D0 = Math.hypot(P0.lightPos[0], P0.lightPos[1], P0.lightPos[2] + 60 - 80);
    const az = (opt.lampAz ?? 2.95) + 0.035 * Math.sin(t * 0.21) + 0.015 * Math.sin(t * 0.53), el = (opt.lampEl ?? 0.75) + 0.012 * Math.sin(t * 0.17);
    const D = opt.lampD || 2400;
    const kd = [Math.cos(az) * Math.cos(el), Math.sin(az) * Math.cos(el), Math.sin(el)];
    const lp = [kd[0] * D, kd[1] * D, 80 + kd[2] * D];
    const P = { ...P0, lightPos: lp, light: P0.light * (D * D) / (D0 * D0) * (opt.light ?? 1), lightR: D * 0.16 };
    // le contour : derrière, à droite, haut
    const ra = opt.rimAz ?? 0.75, re = 0.55, rd = [Math.cos(ra) * Math.cos(re), Math.sin(ra) * Math.cos(re), Math.sin(re)];
    const svp = M4.mul(M4.perspective(2 * Math.atan(330 / D), 1, D * 0.7, D * 1.35), M4.lookAt(lp, [0, 0, 80], [0, 0, 1]));

    gl.bindVertexArray(vao);
    // l'ombre
    gl.bindFramebuffer(gl.FRAMEBUFFER, smFb); gl.viewport(0, 0, SM, SM);
    gl.clear(gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
    gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1.5, 3);
    gl.useProgram(sprog.p);
    gl.uniformMatrix4fv(sprog.u.uVP, false, svp); gl.uniform1fv(sprog.u.uKeyA, keyA); gl.uniform2fv(sprog.u.uKeyP, keyP); gl.uniform1f(sprog.u.uCarX, st.carV);
    gl.drawElements(gl.TRIANGLES, ni, gl.UNSIGNED_INT, 0);
    gl.disable(gl.POLYGON_OFFSET_FILL);
    // l'image
    gl.bindFramebuffer(gl.FRAMEBUFFER, opt.fb || null); gl.viewport(0, 0, W, H);
    gl.clearColor(6 / 255, 6 / 255, 6 / 255, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND); gl.depthMask(true);
    const u = prog.u; gl.useProgram(prog.p);
    gl.uniformMatrix4fv(u.uVP, false, vp); gl.uniform1fv(u.uKeyA, keyA); gl.uniform2fv(u.uKeyP, keyP); gl.uniform1f(u.uCarX, st.carV);
    gl.uniform3fv(u.uLightPos, lp); gl.uniform3fv(u.uEye, eye);
    gl.uniform1f(u.uLight, P.light); gl.uniform1f(u.uLightR, P.lightR); gl.uniform1f(u.uEnv, P.env * (opt.env ?? 1.0));
    gl.uniform3fv(u.uKeyDir, kd); gl.uniform3fv(u.uRimDir, rd); gl.uniform1f(u.uRim, opt.rim ?? 0.6);
    gl.uniform3fv(u.uKeyC, keyC); gl.uniform1fv(u.uKeyG, keyG);
    gl.uniform4fv(u.uFoot, foot); gl.uniform2f(u.uGround, opt.groundR0 ?? 200, opt.groundR1 ?? 480);
    gl.uniform1f(u.uExposure, P.exposure); gl.uniform1f(u.uToe, P.toe);
    gl.uniform1f(u.uHammer, opt.hammer ?? 0.8); gl.uniform1f(u.uPaperK, opt.paperK ?? 1.7); gl.uniform1f(u.uFeed, opt.feed ?? st.feed); gl.uniform1f(u.uFlat, opt.flat ? 1 : 0);
    gl.uniformMatrix4fv(u.uShadowVP, false, svp);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, smTex); gl.uniform1i(u.uShadow, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, inkTex); gl.uniform1i(u.uInk, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, glyphTex); gl.uniform1i(u.uGlyph, 2); gl.activeTexture(gl.TEXTURE0);
    gl.uniform4f(u.uInkBox, INK.x0, INK.v0, 1 / (INK.x1 - INK.x0), 1 / (INK.v1 - INK.v0));
    gl.drawElements(gl.TRIANGLES, ni, gl.UNSIGNED_INT, 0);
    gl.bindVertexArray(null);
    if (card) {
      // le repère de la feuille (unités du moteur des cartes, origine au centre de l'A4) dans le monde (mm) : la colonne
      // passe au point de frappe (x = 0), la ligne en cours (yc) sur la ligne de frappe ; le chariot la déplace en x
      const yc = CS.Y0 - st.feed * MMU, k = 1 / MMU, { o, u: U, n: N } = plane;
      const tx = (st.carV - st.car0) - CS.COL_C * k;
      const A = new Float32Array([k, 0, 0, 0, U[0] * k, U[1] * k, U[2] * k, 0, N[0] * k, N[1] * k, N[2] * k, 0,
        o[0] + tx + U[0] * -yc * k + N[0] * 0.3, o[1] + U[1] * -yc * k + N[1] * 0.3, o[2] + U[2] * -yc * k + N[2] * 0.3, 1]);
      const PC = P;
      // retournée d'un demi-tour dans son plan : la découpe du moteur (dos d'enveloppe en V, ici à plat) retire le haut
      // de son repère, donc le bas de la feuille — tout ce qui est sous la ligne de frappe
      gl.enable(gl.DEPTH_TEST);
      card.draw(vp, eye, PC, { model: M4.mul(A, M4.model(0, 0, Math.PI)), lod: 'msheet', fade: 1, shade: 1, ...sheetV, clip: [2, -yc, 0.001, 1e4] });
      // les lettres : posées sur la feuille au moment de leur frappe, un peu allumées (absorbées), puis au repos
      const list = [];
      st.typed.forEach((o, i) => {
        const x = CS.COL_C - nameR.adv(o.ch) * CS.emT / 2, b = CS.Y0 - i * CS.LEAD;
        // (sous la ligne de frappe, la lettre est dans la machine : pas encore frappée, ou la feuille redescendue)
        if (o.ch === ' ' || T < o.at || b < yc - 0.5) return;
        const g = 0.55 * Math.exp(-(T - o.at) / 0.9);
        list.push({ i, model: M4.mul(A, M4.mul(M4.model(0, 0, 0, x, b, SHEET.t / 2 + 1.0), new Float32Array([CS.emT, 0, 0, 0, 0, CS.emT, 0, 0, 0, 0, CS.emT, 0, 0, 0, 0, 1]))), glow: g, alpha: 1 });
      });
      gl.enable(gl.DEPTH_TEST);
      nameR.drawLetters(vp, eye, PC, LOOK, list, t);
      gl.enable(gl.DEPTH_TEST);
    }
    return keys.some(k => k.t0 >= 0) || Math.abs(st.car - st.carV) > 0.01 || st.feed !== fT || striking || (st.typed.length > 0 && T - st.last <= FEED_AFTER);
  }
  // le haut de la colonne et sa dernière lettre, sur la feuille, en mm au-dessus de la ligne de frappe (pour cadrer)
  const column = () => ({ n: st.typed.length, top: st.feed + (CS ? CS.CAPU / MMU : 0), bottom: st.feed - Math.max(0, st.typed.length - 1) * LSM });
  return { frame, type, erase, reset, column, sheetAt, keys, letter, space, st, platen, source: meta.source, LS };
}
