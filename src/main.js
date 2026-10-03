// SINGULIÉS — écran d'accueil. Amorçage, boucle, états (saisie → validation → noir).
import { NameModel } from './input/model.js';
import { createBridge } from './input/bridge.js';
import { createWheel } from './input/wheel.js';
import { createVoice } from './input/voice.js';
import { displayCase, finalName, normalizeName } from './text/normalize.js';
import { getGL } from './gl/gl.js';
import { buildAtlas } from './gl/atlas.js';
import { createRenderer } from './render/renderer.js';
import { layoutName } from './name/layout.js';
import { loadState, saveValidated, clearStored } from './app/storage.js';
import { createField } from './field/field.js';
import { createRng } from './field/rng.js';
import { createLight } from './field/light.js';

const P = new URLSearchParams(location.search);
const CFG = {
  caseMode: P.get('case') === 'lower' ? 'lower' : 'upper',
  grain: P.get('grain') === '0' ? 0 : P.get('grain') === '1' ? 2 : 1,   // 0 noir pur, 1 fond uni (défaut), 2 grain
  reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
  seed: P.has('seed') ? +P.get('seed') : undefined,
  debug: P.get('debug') === '1',
  wheel: P.get('saisie') === 'roue',   // saisie par roue de lettres (sans clavier virtuel)
  voice: P.get('saisie') === 'voix',   // « dis ou écris ton prénom » (essai)
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
// le champ se déclare « prénom » → le clavier du téléphone (ou le navigateur) propose le prénom de la
// fiche contact / du remplissage automatique ; un toucher le remplit (désactivable : ?auto=0)
if (P.get('auto') !== '0') {
  input.setAttribute('autocomplete', 'given-name');
  input.setAttribute('name', 'given-name');
  document.getElementById('f').setAttribute('autocomplete', 'on');
}

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
  capPx: 30,              // hauteur de capitale du prénom (pas de la roue)
  voiceTyped: false,      // essai voix : l'utilisateur a choisi d'écrire
  inviteA: 0,             // essai voix : opacité de l'invitation
  dim: 1,
  slowAt: -9,
  confirmed: false,       // Entrée / remplissage auto : prénom confirmé, clavier fermé
  acro: null,             // instant du passage en colonne (acrostiche)
  nameBox: null,          // boîte écran du prénom (toucher pour passer en colonne)
  boost: 0,               // avance/recul dans le champ (molette, glisser vertical)
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
  onChange: () => { if (S.phase === 'input') { S.typed = true; S.keyAt = S.t; S.confirmed = false; } renderFallback(); },
  onSubmit: () => submitName(),
  onEscape: goBack,
});
bridge.refresh();
// remplissage automatique (suggestion du clavier) : le prénom arrive d'un coup → on ferme le clavier
input.addEventListener('focus', () => input.classList.remove('rest'));
input.addEventListener('input', (e) => {
  if (e.inputType === 'insertReplacementText' || (!e.inputType && input.value.length > 1)) setTimeout(confirmName, 120);
});
const wheel = CFG.wheel ? createWheel({
  model, reduced: CFG.reduced,
  onChange: () => { if (S.phase === 'input') { S.typed = true; S.keyAt = S.t; } renderFallback(); },
  onSubmit: () => submitName(), onEscape: goBack,
  getStep: () => S.capPx * 1.6,
}) : null;
wheel?.enable(S.phase === 'input');

// ---------- voix (essai) : le prénom dit s'écrit dans le modèle ----------
const INVITE = 'DIS OU ECRIS TON PRENOM';   // aucun accent affiché (règle du projet)
const voice = CFG.voice ? createVoice({
  onText: (t) => {
    if (S.phase !== 'input' || S.voiceTyped) return;     // dès qu'on tape au clavier, la voix n'écrit plus
    const n = normalizeName(t);
    if (!n || n === model.text) return;
    model.replace(0, model.text.length, n, { kind: 'edit' });
    bridge.refresh();
    S.typed = true; S.keyAt = S.t; renderFallback();
  },
}) : null;
if (voice) {
  const g = () => voice.gesture();
  document.addEventListener('pointerdown', g); window.addEventListener('keydown', g);
  input.addEventListener('beforeinput', () => { if (!S.voiceTyped) { S.voiceTyped = true; voice.stop(); } }, true);   // on écrit : le micro est rendu
}
const spec = new Float32Array(24);   // spectre lissé (moitié ; dessiné en miroir)

// Entrée : 1re fois = confirmer (clavier fermé, rien d'autre) ; ensuite = passage en colonne
function submitName() {
  if (S.phase !== 'input' || S.acro != null || (!wheel && bridge.composing)) return;
  if (!finalName(model.text)) return;
  if (!S.confirmed) confirmName(); else startAcrostic();
}
function confirmName() {
  if (S.phase !== 'input' || S.acro != null || !finalName(model.text)) return;
  S.confirmed = true; S.typed = true;
  const n = input.value.length;
  try { input.setSelectionRange(n, n); } catch { /* */ }
  window.getSelection?.().removeAllRanges();
  input.blur();
  input.classList.add('rest');   // aucun rendu natif (sélection, surlignage du remplissage auto)
}
// les lettres du prénom pivotent en colonne (amorce de l'acrostiche), puis on passe à la suite
const ACRO_STEP = 0.07, ACRO_DUR = 1.1, ACRO_HOLD = 1.4;
function startAcrostic() {
  if (S.phase !== 'input' || S.acro != null || !finalName(model.text)) return;
  S.acro = S.t; S.confirmed = true;
  input.blur(); wheel?.enable(false); voice?.stop();
}

function validate() {
  if (S.phase !== 'input' || (!wheel && bridge.composing)) return;
  const name = finalName(model.text);
  if (!name) return;
  const shown = displayCase(name, CFG.caseMode);
  S.phase = 'leaving'; S.phaseAt = S.t; S.validatedName = shown;
  saveValidated(shown);
  input.blur();
  wheel?.enable(false);
  voice?.stop();
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
  S.phase = 'input'; S.phaseAt = S.t; S.validatedName = null; S.acro = null; S.confirmed = false;
  backEl.classList.remove('on');
  bridge.refresh();
  input.classList.remove('rest');
  if (wheel) wheel.enable(true); else input.focus({ preventScroll: true });
}
backEl.addEventListener('click', goBack);
// Entrée quand le champ a perdu le focus (prénom confirmé, clavier fermé) : 2e Entrée = colonne
window.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.defaultPrevented && !wheel && S.confirmed && document.activeElement !== input) { e.preventDefault(); submitName(); } });
// Échap fonctionne aussi quand le champ n'a plus le focus (écran noir)
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.activeElement !== input) goBack(); });

// Toucher n'importe où : focus du champ (ouvre le clavier mobile, geste utilisateur)
document.addEventListener('click', (e) => {
  if (S.phase !== 'input' || S.acro != null || e.target === backEl || backEl.contains(e.target)) return;
  const b = S.nameBox;
  if (S.confirmed && b && e.clientX > b[0] && e.clientX < b[2] && e.clientY > b[1] && e.clientY < b[3]) { startAcrostic(); return; }
  if (!wheel && document.activeElement !== input) { input.classList.remove('rest'); input.focus({ preventScroll: true }); }
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
  // taille CSS figée en px : quand le clavier mobile réduit la fenêtre, l'image n'est ni
  // reconstruite ni étirée — le clavier la recouvre simplement
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  field?.resize(w, h);
  // champ natif centré sur le prénom (le clavier mobile vise cette zone)
  input.style.top = `calc(${(field ? field.view.cy / h : 0.45) * 100}% - 3.5em)`;
}
window.addEventListener('resize', measure);
window.visualViewport?.addEventListener('resize', measure);

// ---------- repli sans WebGL2 : noir, saisie et validation fonctionnelles ----------
let gl = null, renderer = null, atlas = null, field = null;
function renderFallback() {
  if (renderer) return;
  fallbackEl.textContent = S.phase === 'input' ? displayCase(bridge.shownText, CFG.caseMode) : '';
}

// ---------- parallaxe : translation de caméra, ressort amorti (≈ 0,8 s de retard) ----------
const PAR = { tx: 0, ty: 0, x: 0, y: 0, vx: 0, vy: 0 };
const BR = { p: 0, v: 0 };   // souffle de caméra à chaque frappe (ressort)
const light = createLight({ reduced: CFG.reduced });
window.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || !S.w) return;
  PAR.tx = (e.clientX / S.w - 0.5) * 2; PAR.ty = (e.clientY / S.h - 0.5) * 2;
});
document.addEventListener('pointerleave', () => { PAR.tx = 0; PAR.ty = 0; });
// molette (ordinateur) ou glisser vertical (téléphone) : avancer / reculer dans le champ, retour doux
// (pas de pincement : le zoom du navigateur reste disponible pour l'accessibilité)
const addBoost = (v) => { if (!CFG.reduced) S.boost = Math.max(-1.2, Math.min(5, S.boost + v)); };
if (!CFG.wheel) {
  window.addEventListener('wheel', (e) => addBoost(e.deltaY * 0.004), { passive: true });
  // doigt vers le bas = avancer, vers le haut = reculer (un seul doigt ; à deux, c'est le zoom)
  let ty = null;
  window.addEventListener('touchstart', (e) => { ty = e.touches.length === 1 ? e.touches[0].clientY : null; }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (ty == null || e.touches.length !== 1) { ty = null; return; }
    const y = e.touches[0].clientY; addBoost((y - ty) * 0.025); ty = y;
  }, { passive: true });
  window.addEventListener('touchend', () => { ty = null; }, { passive: true });
}
function updateCamera(dt) {
  if (CFG.reduced) { field.cam.x = 0; field.cam.y = 0; return; }
  const w = 2.2, z = 0.85;
  PAR.vx += (-(PAR.x - PAR.tx) * w * w - 2 * z * w * PAR.vx) * dt; PAR.x += PAR.vx * dt;
  PAR.vy += (-(PAR.y - PAR.ty) * w * w - 2 * z * w * PAR.vy) * dt; PAR.y += PAR.vy * dt;
  const k = field.view ? 1 : 0;
  field.cam.x = k * (0.12 * PAR.x + 0.012 * Math.sin(0.11 * S.t));
  field.cam.y = k * (0.08 * PAR.y + 0.008 * Math.sin(0.083 * S.t + 1));
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
  const cx = S.w / 2, cy0 = field ? field.view.cy : S.h * 0.45;   // le prénom est au point de fuite
  if (wheel && S.phase === 'input') wheel.update(dt);
  const text = displayCase(wheel ? wheel.displayText : bridge.shownText, CFG.caseMode);
  const L0 = atlas ? layoutName(text, metrics, { w: S.w, h: S.h, cx, cy: cy0 }) : null;
  if (vv && L0 && document.activeElement === input) {
    const visBottom = vv.offsetTop + vv.height;
    if (visBottom < S.h - 40) target = Math.min(0, visBottom - 28 - L0.bottom);
    target = Math.max(target, -(L0.top - 24 - vv.offsetTop));
  }
  if (CFG.reduced) { S.shiftY = target; S.shiftV = 0; }
  else { const k = 30, c = 2 * Math.sqrt(k) * 0.95; S.shiftV += ((target - S.shiftY) * k - c * S.shiftV) * dt; S.shiftY += S.shiftV * dt; }
  input.style.transform = `translateY(${S.shiftY.toFixed(1)}px)`;

  if (!renderer) {   // sans WebGL2 : la colonne n'est pas dessinée, mais la validation doit aboutir
    if (S.acro != null && S.phase === 'input' && S.t - S.acro > (Math.max(1, finalName(model.text).length) - 1) * ACRO_STEP + ACRO_DUR + ACRO_HOLD) validate();
    renderFallback(); return;
  }
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
  const acro = S.acro != null ? acrostic(L, text, cx, cy) : null;
  L.glyphs.forEach((g, i) => {
    const gm = atlas.glyphs[g.ch];
    if (!gm) return;
    if (glyphAnim[i] == null || !S.typed) glyphAnim[i] = g.x; else if (!acro) glyphAnim[i] += (g.x - glyphAnim[i]) * kx;
    let x = CFG.reduced ? g.x : glyphAnim[i];
    if (acro) {   // trajectoire courbe vers la colonne, retard propre à chaque lettre
      const tg = acro.pos[i], x0 = x, y0 = g.y;
      const u = CFG.reduced ? smooth(0, 0.3, S.t - S.acro) : easeInOut(Math.min(1, Math.max(0, (S.t - S.acro - i * ACRO_STEP) / ACRO_DUR)));
      const mx = (x0 + tg.x) / 2 + (tg.y - y0) * 0.22, my = (y0 + tg.y) / 2 - (tg.x - x0) * 0.22;
      x = (1 - u) * (1 - u) * x0 + 2 * u * (1 - u) * mx + u * u * tg.x;
      const yy = (1 - u) * (1 - u) * y0 + 2 * u * (1 - u) * my + u * u * tg.y;
      glyphs.push({ box: [x + gm.x0 * g.fs, yy + gm.y0 * g.fs, x + gm.x1 * g.fs, yy + gm.y1 * g.fs], uv: [gm.u0, gm.v0, gm.u1, gm.v1], alpha: nameFade, pxEm: g.fs });
      return;
    }
    // roue : la lettre en cours (la dernière) suit la rotation
    const active = wheel && S.phase === 'input' && i === L.glyphs.length - 1 && wheel.current !== ' ';
    const dy = active ? -wheel.frac * S.capPx * 1.6 : 0;
    const al = active ? nameFade * (1 - 0.55 * Math.min(1, Math.abs(wheel.frac) * 2)) : nameFade;
    glyphs.push({
      box: [x + gm.x0 * g.fs, g.y + dy + gm.y0 * g.fs, x + gm.x1 * g.fs, g.y + dy + gm.y1 * g.fs],
      uv: [gm.u0, gm.v0, gm.u1, gm.v1], alpha: al, pxEm: g.fs,
    });
  });
  glyphAnim.length = L.glyphs.length;
  S.capPx = L.cap;
  S.nameBox = L.glyphs.length ? [Math.min(...L.lines.map((l) => l.x0)) - 30, L.top - 30, Math.max(...L.lines.map((l) => l.x1)) + 30, L.bottom + 30] : null;
  if (acro && S.phase === 'input' && S.t - S.acro > (L.glyphs.length - 1) * ACRO_STEP + ACRO_DUR + ACRO_HOLD) validate();
  // curseur : clignote tant qu'aucune touche n'a été tapée, puis disparaît définitivement
  if (CFG.debug) {   // croix au point de fuite
    const vy = field.view.cy + S.shiftY;
    glyphs.push({ box: [cx - 12, vy - 0.5, cx + 12, vy + 0.5], uv: null, alpha: 0.6, pxEm: 1 });
    glyphs.push({ box: [cx - 0.5, vy - 12, cx + 0.5, vy + 12], uv: null, alpha: 0.6, pxEm: 1 });
  }
  if (wheel && S.phase === 'input') drawWheel(L, glyphs, nameFade);
  if (voice && S.phase === 'input') drawVoice(L, glyphs, nameFade, dt, text);
  const voiceHidesCursor = voice && !S.voiceTyped && (voice.state === 'idle' || voice.state === 'asking' || voice.state === 'listening');
  if (!wheel && !voiceHidesCursor && !S.typed && !S.confirmed && S.phase === 'input') {
    // respiration douce (pas de clignotement sec) : 0,2 → 0,9, période 1,6 s
    const ph = (S.t - OPEN_DARK) / 1.6 * Math.PI * 2;
    const blink = CFG.reduced ? 0.8 : 0.2 + 0.7 * Math.pow(0.5 + 0.5 * Math.cos(ph), 1.6);
    const cw = L.cursor.w;
    glyphs.push({ box: [L.cursor.x - cw / 2, L.cursor.y0, L.cursor.x + cw / 2, L.cursor.y1], uv: null, alpha: blink * nameFade, pxEm: 1, taper: 0.22 });
  }

  // lumière : diff du prénom → ondes / extinctions ; le champ écoute (souffle + ralentissement)
  const kind = light.update(bridge.shownText.toUpperCase(), S.t);
  if (kind && S.phase === 'input' && !CFG.reduced) { BR.v += kind > 0 ? 0.015 : 0.008; S.slowAt = S.t; }
  { const w = 2.2, z = 0.85; BR.v += (-BR.p * w * w - 2 * z * w * BR.v) * dt; BR.p += BR.v * dt; }
  const speed = 1 - 0.65 * (1 - smooth(0, 1.1, S.t - S.slowAt));

  // champ : zone vide autour du prénom, caméra, simulation
  const ln = L.lines;
  if (acro) field.setZone(acro.box);
  else field.setZone(text.trim() ? { x0: Math.min(...ln.map((l) => l.x0)), x1: Math.max(...ln.map((l) => l.x1)), y0: L.top, y1: L.bottom, pad: 1.1 * L.fs } : null);
  updateCamera(dt);
  // lettres éteintes ≈ −38 % tant qu'un prénom est saisi (prototype : 0,62, lissage 2,5/s)
  S.dim += ((text.trim() ? 0.62 : 1) - S.dim) * (1 - Math.exp(-dt * 2.5));
  S.boost *= Math.exp(-dt / 1.1);
  const portraitSpeed = S.w < S.h ? 2 : 1;   // portrait : on ne voit qu'une partie du champ, le flux paraît lent
  field.step(dt, !CFG.reduced, speed * portraitSpeed * (1 + S.boost));
  const fl = field.emit(light, S.t, { x: cx, y: cy });
  const v = field.view;
  stats.drawCalls = renderer.draw({ w: S.w, h: S.h, dpr: S.dpr, cx, cy, grain: CFG.grain, fade: sceneFade, glyphs,
    field: fl, cam: field.cam, focal: v.f * (1 + BR.p), vx: v.cx + field.offX, vy: v.cy + S.shiftY, dim: S.dim, time: S.t });
  stats.letters = fl.count;
  stats.gpuMB = +((atlas.width * atlas.height * 2 + canvas.width * canvas.height * 4 * 2) / 1048576).toFixed(1);
}

// roue : lettres voisines au-dessus / au-dessous de la lettre en cours, de plus en plus pâles et petites ;
// l'espace est figuré par un point
function drawWheel(L, glyphs, fade) {
  const gap = L.cap * 1.6, fs = L.fs;
  const cur = wheel.current;
  const last = L.glyphs[L.glyphs.length - 1];
  const onLetter = cur !== ' ' && last;
  const gx = onLetter ? (glyphAnim[L.glyphs.length - 1] ?? last.x) : 0;
  const slotX = onLetter ? gx + (atlas.glyphs[last.ch]?.adv ?? 0.6) * fs / 2 : L.cursor.x;
  const base = onLetter ? last.y : L.lines[L.lines.length - 1].base;
  const lowerNext = CFG.caseMode === 'lower' && wheel.count > 0;
  for (const nb of wheel.neighbors()) {
    if (nb.k === 0 && onLetter) continue;               // la lettre en cours est dans le prénom
    const d = Math.abs(nb.off);
    const a = fade * (nb.k === 0 ? 1 - 0.55 * Math.min(1, d * 2) : 0.36 * Math.pow(Math.max(0, 1 - d / 2.6), 1.5));
    if (a < 0.01) continue;
    const y = base + nb.off * gap, sc = nb.k === 0 ? 1 : 0.72;
    if (nb.ch === ' ') {                                   // espace : un point
      const r = Math.max(1.5, 0.05 * fs);
      glyphs.push({ box: [slotX - r, y - L.cap * 0.5 - r, slotX + r, y - L.cap * 0.5 + r], uv: null, alpha: a, pxEm: 1 });
      continue;
    }
    const ch = lowerNext ? nb.ch.toLowerCase() : nb.ch;
    const gm = atlas.glyphs[ch]; if (!gm) continue;
    const f = fs * sc, x = slotX - gm.adv * f / 2;
    glyphs.push({ box: [x + gm.x0 * f, y + gm.y0 * f, x + gm.x1 * f, y + gm.y1 * f], uv: [gm.u0, gm.v0, gm.u1, gm.v1], alpha: a, pxEm: f });
  }
}

// voix : invitation discrète, puis spectre en direct (traits fins effilés, en miroir) à la place du curseur
function drawVoice(L, glyphs, fade, dt, text) {
  const empty = !text.trim();
  // l'autorisation n'est demandée qu'à l'apparition de l'invitation
  if (voice.state === 'idle' && S.t > OPEN_DARK + 1.4) voice.start();
  const showInvite = empty && !S.voiceTyped && voice.state !== 'denied' && voice.state !== 'unsupported';
  S.inviteA += ((showInvite ? 1 : 0) - S.inviteA) * (1 - Math.exp(-dt * 2.2));
  const cap = L.cap, base = L.lines[0].base, cx = S.w / 2;
  if (S.inviteA > 0.01) {
    const f = Math.max(12, L.fs * 0.36), tr = 0.42;
    let w = 0; for (const ch of INVITE) w += (ch === ' ' ? 0.3 : (atlas.glyphs[ch]?.adv ?? 0.6)) + tr;
    let x = cx - (w - tr) * f / 2;
    const y = base - cap * (voice.state === 'listening' ? 2.6 : 0.5);   // au-dessus du spectre quand on écoute
    for (const ch of INVITE) {
      const gm = atlas.glyphs[ch];
      if (gm) glyphs.push({ box: [x + gm.x0 * f, y + gm.y0 * f, x + gm.x1 * f, y + gm.y1 * f], uv: [gm.u0, gm.v0, gm.u1, gm.v1], alpha: 0.55 * S.inviteA * fade, pxEm: f });
      x += ((ch === ' ' ? 0.3 : (gm?.adv ?? 0.6)) + tr) * f;
    }
  }
  if (voice.state !== 'listening' || S.voiceTyped) return;
  const lv = voice.levels(spec.length);
  for (let i = 0; i < spec.length; i++) {
    const v = lv ? lv[i] : 0, k = v > spec[i] ? 18 : 5;            // attaque rapide, retombée douce
    spec[i] += (v - spec[i]) * (1 - Math.exp(-dt * k));
  }
  const n = spec.length, step = Math.max(4, L.fs * 0.17), wBar = Math.max(1, 0.028 * L.fs);
  const yc = empty ? base - cap * 0.5 : L.bottom + cap * 1.4;          // sous le prénom une fois qu'il s'écrit
  for (let j = -(n - 1); j <= n - 1; j++) {
    const i = Math.abs(j), win = Math.pow(1 - i / n, 0.7);
    const hh = cap * (0.06 + 1.5 * spec[i] * win) * (empty ? 1 : 0.6);
    const x = cx + j * step;
    glyphs.push({ box: [x - wBar / 2, yc - hh, x + wBar / 2, yc + hh], uv: null, alpha: (0.25 + 0.6 * win) * fade * (empty ? 1 : 0.6), pxEm: 1, taper: 0.35 });
  }
}

// colonne de l'acrostiche : une lettre par ligne, centrée ; un espace = demi-ligne
function acrostic(L, text, cx, cy) {
  const row = L.cap * 1.5, fs = L.fs, t = text.replace(/ +$/, '');
  const rows = [];
  let y = 0;
  for (const ch of t) { if (ch === ' ') { y += row * 0.6; continue; } rows.push({ ch, y }); y += row; }
  const H = y - row, top = cy - H / 2 + L.cap / 2;
  const pos = rows.map((r) => ({ x: cx - (atlas.glyphs[r.ch]?.adv ?? 0.6) * fs / 2, y: top + r.y }));
  return { pos, box: { x0: cx - fs * 0.6, x1: cx + fs * 0.6, y0: top - L.cap, y1: top + H + L.cap * 0.3, pad: 1.1 * fs } };
}
const easeInOut = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

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
    const t0 = performance.now();
    field = createField({ rng: createRng(CFG.seed), caseMode: CFG.caseMode, glyphs: atlas.glyphs, capHeight: atlas.capHeight });
    field.resize(S.w, S.h);   // inclut ≈ 700 s de champ « vécu »
    input.style.top = `calc(${(field.view.cy / S.h) * 100}% - 3.5em)`;
    stats.warmupMs = Math.round(performance.now() - t0);
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); cancelAnimationFrame(rafId); rafId = 0; });
    canvas.addEventListener('webglcontextrestored', () => { renderer.restore(); last = 0; if (!document.hidden) rafId = requestAnimationFrame(frame); });
  }
  if (S.phase === 'black') { S.phaseAt = 0; enterBlack(true); }
  else if (!wheel && window.matchMedia('(pointer: fine)').matches) input.focus({ preventScroll: true });
  rafId = requestAnimationFrame(frame);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cancelAnimationFrame(rafId); rafId = 0; }
  else if (!rafId && (!gl || !gl.isContextLost())) { last = 0; rafId = requestAnimationFrame(frame); }
});

// accès de test / mesure
const stats = { drawCalls: 0, gpuMB: 0, letters: 0, warmupMs: 0 };
window.__sg = { stats, model, S, CFG, get atlas() { return atlas; }, get field() { return field; }, get voice() { return voice; }, validate, submitName, startAcrostic, goBack, get bridge() { return bridge; } };

boot();
