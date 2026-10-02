// SINGULIÉS — écran d'accueil. Amorçage, boucle, états (saisie → validation → noir).
import { NameModel } from './input/model.js';
import { createBridge } from './input/bridge.js';
import { displayCase, finalName } from './text/normalize.js';
import { getGL } from './gl/gl.js';
import { buildAtlas } from './gl/atlas.js';
import { createRenderer } from './render/renderer.js';
import { layoutName } from './name/layout.js';
import { loadState, saveValidated, clearStored } from './app/storage.js';

const P = new URLSearchParams(location.search);
const CFG = {
  caseMode: P.get('case') === 'lower' ? 'lower' : 'upper',
  grain: P.get('grain') !== '0',
  reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
};
const FONT_FAMILY = 'SG Garamond';
const OPEN_DARK = 1.0;      // s de noir à l'ouverture (chargement police + atlas)
const OPEN_FADE = 1.4;      // s de fondu d'entrée
const LEAVE_FADE = 1.2;     // s de fondu au noir après validation

const canvas = document.getElementById('c');
const input = document.getElementById('in');
const backEl = document.getElementById('back');
const live = document.getElementById('live');
const fallbackEl = document.getElementById('fallback');
input.setAttribute('autocapitalize', CFG.caseMode === 'lower' ? 'words' : 'characters');

// ---------- état ----------
const stored = loadState();
const model = new NameModel(stored.validated ?? stored.name ?? '');
const S = {
  phase: stored.validated ? 'black' : 'input',   // input | leaving | black
  phaseAt: 0,
  typed: false,           // une touche a été tapée → le curseur disparaît définitivement
  keyAt: -9,
  t: 0,
  w: 0, h: 0, dpr: 1,
  shiftY: 0, shiftV: 0,   // remontée douce au-dessus du clavier mobile
  validatedName: stored.validated ?? null,
};

let announceTimer = 0;
function announce(msg) {
  live.textContent = '';
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => { live.textContent = msg; }, 30);
}

const bridge = createBridge(input, model, {
  caseMode: CFG.caseMode,
  announce,
  onChange: () => { if (S.phase === 'input') { S.typed = true; S.keyAt = S.t; } renderFallback(); },
  onSubmit: validate,
  onEscape: goBack,
});
bridge.refresh();

function validate() {
  if (S.phase !== 'input' || bridge.composing) return;
  const name = finalName(model.text);
  if (!name) return;
  const shown = displayCase(name, CFG.caseMode);
  S.phase = 'leaving'; S.phaseAt = S.t; S.validatedName = shown;
  saveValidated(shown);
  input.blur();
}

function emitValidated(name, restored) {
  try { if (typeof window.onNameValidated === 'function') window.onNameValidated(name); } catch (e) { console.error(e); }
  window.dispatchEvent(new CustomEvent('singulies:name-validated', { detail: { name, restored } }));
}

function enterBlack(restored) {
  S.phase = 'black'; S.phaseAt = S.t;
  backEl.classList.add('on');
  emitValidated(S.validatedName, restored);
}

function goBack() {
  if (S.phase === 'input') return;
  clearStored();             // le prénom mémorisé est effacé, il reste affiché pour cette visite
  S.phase = 'input'; S.phaseAt = S.t; S.validatedName = null;
  backEl.classList.remove('on');
  bridge.refresh();
  input.focus({ preventScroll: true });
}
backEl.addEventListener('click', goBack);
// Échap fonctionne aussi quand le champ n'a plus le focus (écran noir)
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.activeElement !== input) goBack(); });

// Toucher n'importe où : focus du champ (ouvre le clavier mobile, geste utilisateur)
document.addEventListener('click', (e) => {
  if (S.phase !== 'input' || e.target === backEl || backEl.contains(e.target)) return;
  if (document.activeElement !== input) input.focus({ preventScroll: true });
});

// ---------- dimensions ----------
function measure() {
  const w = window.innerWidth, h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  // une variation de hauteur seule pendant la saisie (clavier) ne reconstruit rien
  if (S.w && w === S.w && document.activeElement === input && Math.abs(h - S.h) > 80) return;
  if (w === S.w && h === S.h && dpr === S.dpr) return;
  S.w = w; S.h = h; S.dpr = dpr;
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
}
window.addEventListener('resize', measure);
window.visualViewport?.addEventListener('resize', measure);

// ---------- repli sans WebGL2 : noir, saisie et validation fonctionnelles ----------
let gl = null, renderer = null, atlas = null;
function renderFallback() {
  if (renderer) return;
  fallbackEl.textContent = S.phase === 'input' ? displayCase(bridge.shownText, CFG.caseMode) : '';
}

// ---------- boucle ----------
let rafId = 0, last = 0;
const glyphAnim = []; // x lissés par index de lettre (recentrage doux pendant la frappe)

function frame(ts) {
  rafId = requestAnimationFrame(frame);
  const dt = Math.min(0.05, last ? (ts - last) / 1000 : 0);
  last = ts; S.t += dt;
  measure();
  if (S.phase === 'leaving' && S.t - S.phaseAt >= LEAVE_FADE) enterBlack(false);

  // remontée au-dessus du clavier (visualViewport) — ressort amorti
  const vv = window.visualViewport;
  let target = 0;
  const cx = S.w / 2, cy0 = S.h * 0.45;
  const text = displayCase(bridge.shownText, CFG.caseMode);
  const L0 = atlas ? layoutName(text, metrics, { w: S.w, h: S.h, cx, cy: cy0 }) : null;
  if (vv && L0 && document.activeElement === input) {
    const visBottom = vv.offsetTop + vv.height;
    if (visBottom < S.h - 40) target = Math.min(0, visBottom - 28 - L0.bottom);
    target = Math.max(target, -(L0.top - 24 - vv.offsetTop));
  }
  if (CFG.reduced) { S.shiftY = target; S.shiftV = 0; }
  else { const k = 30, c = 2 * Math.sqrt(k) * 0.95; S.shiftV += ((target - S.shiftY) * k - c * S.shiftV) * dt; S.shiftY += S.shiftV * dt; }
  input.style.transform = `translateY(${S.shiftY.toFixed(1)}px)`;

  if (!renderer) { renderFallback(); return; }
  const cy = cy0 + S.shiftY;

  // fondus : ouverture, départ, retour
  const open = smooth(OPEN_DARK, OPEN_DARK + OPEN_FADE, S.t);
  let sceneFade = open, nameFade = smooth(OPEN_DARK + 0.2, OPEN_DARK + 1.2, S.t);
  if (S.phase === 'leaving') { const k = 1 - smooth(0, LEAVE_FADE, S.t - S.phaseAt); sceneFade *= k; nameFade *= k; }
  else if (S.phase === 'black') { sceneFade = 0; nameFade = 0; }
  else if (S.phaseAt > 0) { const k = smooth(0, 1.0, S.t - S.phaseAt); sceneFade *= k; nameFade *= k; }

  const L = layoutName(text, metrics, { w: S.w, h: S.h, cx, cy });
  const glyphs = [];
  const kx = 1 - Math.exp(-dt / 0.07);
  L.glyphs.forEach((g, i) => {
    const gm = atlas.glyphs[g.ch];
    if (!gm) return;
    if (glyphAnim[i] == null || !S.typed) glyphAnim[i] = g.x; else glyphAnim[i] += (g.x - glyphAnim[i]) * kx;
    const x = CFG.reduced ? g.x : glyphAnim[i];
    glyphs.push({
      box: [x + gm.x0 * g.fs, g.y + gm.y0 * g.fs, x + gm.x1 * g.fs, g.y + gm.y1 * g.fs],
      uv: [gm.u0, gm.v0, gm.u1, gm.v1], alpha: nameFade, pxEm: g.fs,
    });
  });
  glyphAnim.length = L.glyphs.length;
  // curseur : clignote tant qu'aucune touche n'a été tapée, puis disparaît définitivement
  if (!S.typed && S.phase === 'input') {
    const ph = (S.t - OPEN_DARK) % 1.1;
    const blink = CFG.reduced ? 1 : smooth(0, 0.12, ph) * (1 - smooth(0.55, 0.67, ph));
    const cw = 1.5;
    glyphs.push({ box: [L.cursor.x - cw / 2, L.cursor.y0, L.cursor.x + cw / 2, L.cursor.y1], uv: null, alpha: blink * nameFade, pxEm: 1 });
  }

  renderer.draw({ w: S.w, h: S.h, dpr: S.dpr, cx, cy, grain: CFG.grain, fade: sceneFade, glyphs });
  stats.drawCalls = glyphs.length ? 2 : 1;
  stats.gpuMB = +((atlas.width * atlas.height * 2 + canvas.width * canvas.height * 4 * 2) / 1048576).toFixed(1);
}

function smooth(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

// ---------- amorçage ----------
let metrics = null;
async function boot() {
  measure();
  // la seconde de noir sert à charger la police et construire l'atlas
  try {
    const ff = new FontFace(FONT_FAMILY, `url(${new URL('fonts/EBGaramond-500.woff2', document.baseURI)})`, { weight: '500' });
    document.fonts.add(await ff.load());
  } catch (e) { console.warn('police', e); }

  gl = getGL(canvas);
  if (!gl) {
    fallbackEl.style.display = 'block';
    renderFallback();
  } else {
    atlas = buildAtlas('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', `"${FONT_FAMILY}", serif`, 500);
    metrics = { adv: (ch) => atlas.glyphs[ch]?.adv ?? 0.6, capHeight: atlas.capHeight };
    renderer = createRenderer(canvas, gl, atlas);
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); cancelAnimationFrame(rafId); rafId = 0; });
    canvas.addEventListener('webglcontextrestored', () => { renderer.restore(); last = 0; if (!document.hidden) rafId = requestAnimationFrame(frame); });
  }
  if (S.phase === 'black') { S.phaseAt = 0; enterBlack(true); }
  else if (window.matchMedia('(pointer: fine)').matches) input.focus({ preventScroll: true });
  rafId = requestAnimationFrame(frame);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cancelAnimationFrame(rafId); rafId = 0; }
  else if (!rafId && (!gl || !gl.isContextLost())) { last = 0; rafId = requestAnimationFrame(frame); }
});

// accès de test / mesure
const stats = { drawCalls: 0, gpuMB: 0 };
window.__sg = { stats, model, S, CFG, get atlas() { return atlas; }, validate, goBack, get bridge() { return bridge; } };

boot();
