// SINGULIÉS — écran d'accueil. Amorçage, boucle, états (saisie → transition → scène des cartes).
import { NameModel } from './input/model.js';
import { createBridge } from './input/bridge.js';
import { createWheel } from './input/wheel.js';
import { createVoice } from './input/voice.js';
import { displayCase, finalName, normalizeName } from './text/normalize.js';
import { getGL } from './gl/gl.js';
import { buildAtlas } from './gl/atlas.js';
import { createRenderer } from './render/renderer.js';
import { layoutName } from './name/layout.js';
import { loadState, saveValidated, clearStored, clearValidated } from './app/storage.js';
import { installSend, settled } from './app/send.js';
import { installCount } from './app/count.js';
import { createField, MODES } from './field/field.js';
import { createRng } from './field/rng.js';
import { createLight } from './field/light.js';
import { sigmaPx } from './field/camera.js';
import { planRecharge, fieldLetter, rechargeFrame, energyFrame, riseU, grayU, sm as smT, REST, RISE, NAME_GRAY, NAME_REST } from './transition/recharge.js';
import { fpsMeter } from './app/perf.js';

const transRng = createRng();

const P = new URLSearchParams(location.search);
// la version simple (09/10) : tout le parcours sans WebGL, quand il le faut (src/simple/simple.js) ;
// ?simple=1 : tout en simple ; ?simple=suite : le vrai champ de prénoms, puis la suite en simple
const SIMPLE = P.get('simple') === '1' ? 'all' : P.get('simple') === 'suite' ? 'suite' : null;
const simpleModule = () => import('./simple/simple.js');
// les pages qu'on partage (09/10) : poeme.html (directement le champ), jeu.html (le jeu, par-dessus le portail) ;
// chacune a sa vignette. L'adresse suit ce qu'on regarde (on partage donc ce qu'on voit).
const PAGE = document.documentElement.dataset.page || '';
// (09/10 : les réglages de l'adresse — ?test=1, ?envoi=0… — restent ; sans eux, le mode test se perdait en entrant
// dans le poème ; la question partagée q= ne suit que le jeu)
const showPath = p => { try { const u = new URL(p, document.baseURI), k = new URLSearchParams(location.search); if (!/^jeu/.test(p)) k.delete('q'); u.search = k.toString(); history.replaceState(history.state, '', u); } catch { /* */ } };
// retour depuis un lien sortant (mes livres → Amazon) : le navigateur rend la page telle qu'on l'a quittée (cache
// avant/arrière : portail « entré » dans la carte) ; la carte se rembobine jusqu'à sa place (09/10)
addEventListener('pageshow', e => { if (e.persisted && S.portal) (portal?.back || portal?.show)?.(); });
const CFG = {
  caseMode: P.get('case') === 'lower' ? 'lower' : 'upper',
  grain: P.get('grain') === '0' ? 0 : P.get('grain') === '1' ? 2 : 1,   // 0 noir pur, 1 fond uni (défaut), 2 grain
  reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
  seed: P.has('seed') ? +P.get('seed') : undefined,
  debug: P.get('debug') === '1',
  mode: ['profondeur', 'horizontal'].includes(P.get('mode')) ? P.get('mode') : 'melange',   // défaut : mélange
  // défaut (Maxence 04/10) : la lettre entière part, avec sa clarté, son flou, sa profondeur ; ?transition=lumiere : seule sa lumière ;
  // ?transition=energie : flux d'énergie (filaments de lumière floue qui ondoient jusqu'au prénom)
  transition: ['lumiere', 'energie'].includes(P.get('transition')) ? P.get('transition') : 'lettres',
  wheel: P.get('saisie') === 'roue',   // saisie par roue de lettres (sans clavier virtuel)
  voice: P.get('saisie') === 'voix',   // « dis ou écris ton prénom » (essai)
  // portail (05/10) : ETERNEL + les cartes du jeu (ton prénom ton poème, la lettre, les livres, le jeu) avant le
  // champ ; ?portail=0 → directement le champ (tests)
  portal: P.get('portail') !== '0' && document.documentElement.dataset.page !== 'poeme',
};
const FONT_FAMILY = 'SG Garamond';
const OPEN_DARK = 1.0;      // s de noir à l'ouverture (chargement police + atlas)
const OPEN_FADE = 1.4;      // s de fondu d'entrée
const LEAVE_FADE = 1.2;     // s de fondu au noir après validation (sans WebGL2)
const SHOW_NEXT = P.get('fleche') === '1';   // flèche « suite » retirée pour l'instant (04/10) ; ?fleche=1 pour la revoir
// passage automatique à la suite : dès que la dernière lettre allumée du champ a atteint sa clarté (prénom confirmé)
const HANDOFF = 0.6;        // s de fondu enchaîné vers la scène des cartes (même prénom, même place)

const canvas = document.getElementById('c');
const input = document.getElementById('in');
const backEl = document.getElementById('back');
const nextEl = document.getElementById('next');
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
  phase: stored.validated ? 'scene' : 'input',   // input | scene (cartes) ; sans WebGL2 : leaving | black
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
  confirmed: !!(stored.name && !stored.validated),   // Entrée / remplissage auto / visiteur qui revient : prénom confirmé
  confirmedAt: stored.name && !stored.validated ? OPEN_DARK : -99,   // instant de la confirmation
  actAt: -99,             // dernier geste (le passage automatique attend 10 s sans toucher)
  trans: null,            // instant du départ de la transition vers les cartes
  riseT: null,            // début de la montée (attend que la scène des cartes soit prête)
  handT: null,            // début du fondu enchaîné vers la scène des cartes
  rev: null,              // frappe automatique en cours { n lettres affichées, instant de la suivante }
  nameBox: null,          // boîte écran du prénom (le toucher = aller à la suite)
  boost: 0,               // avance/recul dans le champ (molette, glisser vertical)
  lat: 0, adv: 1,         // nappes latérales / avance (bascule progressive vers le mode visé ; initialisés ci-dessous)
};

[S.lat, S.adv] = MODES[CFG.mode];

let announceTimer = 0;
function announce(msg) {
  live.textContent = '';
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => { live.textContent = msg; }, 30);
}

const bridge = createBridge(input, model, {
  caseMode: CFG.caseMode,
  announce,
  onChange: (info) => { if (S.phase === 'input') { S.typed = true; S.keyAt = S.t; S.confirmed = false; detectSuggestion(info); } renderFallback(); },
  onSubmit: () => submitName(),
  onEscape: goBack,
});
bridge.refresh();
// remplissage automatique (suggestion du clavier) : le prénom arrive d'un coup → on ferme le clavier
input.addEventListener('focus', () => input.classList.remove('rest'));
// suggestion choisie (remplissage automatique Safari, mot entier inséré par le clavier sur Chrome
// Android…) : un seul critère, quel que soit le navigateur — le prénom gagne ≥ 2 lettres d'un coup
// (hors collage, hors aperçu de composition) → on ferme le clavier
const TOUCH = matchMedia('(pointer: coarse)').matches;
let lastLen = finalName(model.text).length;
// (05/10 : le prénom proposé s'affiche d'un coup — la frappe lettre par lettre est réservée au visiteur qui revient)
function detectSuggestion(info) {
  const src = info?.source || '';
  if (src === 'composition') return;                       // aperçu : on juge à la fin de la composition
  const L = finalName(model.text).length, jump = L - lastLen;
  lastLen = L;
  if (jump >= 2 && !/paste|Paste|Drop/.test(src)) setTimeout(confirmName, 150);
}
// le prénom s'écrit lettre par lettre, comme à la machine (visiteur qui revient) :
// affichage et lumière suivent la frappe, le modèle a déjà tout le prénom
function startReveal(from, delay) { if (!CFG.reduced && !S.rev) S.rev = { n: Math.max(0, from), next: S.t + delay }; }   // une frappe en cours continue
function revealText(str) {
  const r = S.rev;
  if (!r) return str;
  if (S.trans != null || S.phase !== 'input') { S.rev = null; return str; }
  // une vraie frappe pendant l'animation (texte qui ne prolonge plus ce qui est affiché) l'arrête
  if (r.shown != null && !str.startsWith(r.shown)) { S.rev = null; return str; }
  while (r.n < str.length && S.t >= r.next) { const ch = str[r.n++]; r.next += ch === ' ' ? 0.26 : 0.09 + 0.1 * Math.random(); }
  if (r.n >= str.length) { S.rev = null; if (S.confirmed) S.confirmedAt = S.t; return str; }
  r.shown = str.slice(0, r.n);
  return r.shown;
}
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

// Entrée : 1re fois = confirmer (clavier fermé, rien d'autre) ; ensuite = aller à la suite (les cartes)
function submitName() {
  if (S.phase !== 'input' || S.trans != null || (!wheel && bridge.composing)) return;
  if (!finalName(model.text)) return;
  if (!S.confirmed) confirmName(); else startTransition();
}
function confirmName() {
  if (S.phase !== 'input' || S.trans != null || !finalName(model.text)) return;
  S.confirmed = true; S.typed = true; S.confirmedAt = S.t;
  const n = input.value.length;
  try { input.setSelectionRange(n, n); } catch { /* */ }
  window.getSelection?.().removeAllRanges();
  input.blur();
  input.classList.add('rest');   // aucun rendu natif (sélection, surlignage du remplissage auto)
  if (TOUCH) input.readOnly = true;   // téléphone : même si le champ reprend le focus, pas de clavier
}
// la suite : les lettres allumées du champ rechargent le prénom, le champ s'éteint, le prénom monte à sa place
// de la scène des cartes, qui prend la main (voir transition/recharge.js). Sans WebGL2 : fondu au noir.
let plan = null, cards = null, cardsReady = false;
function startTransition() {
  if (S.phase !== 'input' || S.trans != null || !finalName(model.text)) return;
  const shown = displayCase(finalName(model.text), CFG.caseMode);
  S.trans = S.t; S.confirmed = true; S.validatedName = shown;
  saveValidated(shown);                     // un rechargement (même pendant la transition) mène aux cartes
  input.blur(); input.classList.add('rest'); input.readOnly = true;
  wheel?.enable(false); voice?.stop();
  nextEl.classList.remove('on');
  if (!renderer) { validate(); return; }
  prefetchCards();
}
// pendant la recharge : seulement le réseau (module, papier, logo, police machine), aucun travail GPU
let cardsModule = null;
function prefetchCards() {
  cardsModule = cardsModule || import('./cards/mount.js');
  for (const u of ['cards/paper.jpg', 'cards/logo.png', 'fonts/CourierPrime-latin.woff2']) fetch(u).catch(() => {});
}
// la scène des cartes : son propre canvas WebGL2 par-dessus, invisible jusqu'au fondu enchaîné. Création des
// textures et compilation des shaders (seul moment lourd) quand le prénom est seul et immobile : sans à-coup visible
function loadCards(name) {
  if (cards) return;
  if (SIMPLE) { cards = Promise.resolve(); cardsReady = 'failed'; why('cartes : version simple demandée'); return; }
  prefetchCards();
  cards = cardsModule.then(({ mountCards }) => mountCards({
    name, base: './', onExit: exitCards, hidden: true, firstQ: jeuQ,
    onEnd: () => {}, onDone: backToStart,
  })).then((m) => {
    if (!m) throw new Error('webgl2');
    m.warm();
    cardsReady = m; return m;
  }).catch((e) => { console.error(e); why('cartes : ' + (e && e.message || e)); cardsReady = 'failed'; });
}
// la toute fin (enveloppe postée, « en direct » envoyé) : fondu, puis l'écran principal (le portail), une fois la
// demande partie (ou gardée pour un renvoi) — jamais de rechargement pendant un envoi
function backToStart() {
  if (cardsReady && cardsReady !== 'failed') { cardsReady.canvas.style.transition = 'opacity 1.1s ease'; cardsReady.canvas.style.opacity = '0'; }
  clearValidated();
  const wait = ms => new Promise(r => setTimeout(r, ms));
  Promise.all([wait(1200), Promise.race([settled().catch(() => {}), wait(2500)])]).finally(() => { const u = new URL('./', document.baseURI), k = new URLSearchParams(location.search); k.delete('q'); u.search = k.toString(); location.replace(u); });   // (une demande pas partie est gardée : elle repart à la visite suivante)
}
// retour depuis le paquet : l'accueil, prénom confirmé (comme un visiteur qui revient)
function exitCards() { clearValidated(); location.reload(); }
// fondu enchaîné : la scène des cartes dessine le même prénom, au même endroit, dans le même gris
function handoff() {
  const m = cardsReady;
  S.handT = S.t;
  m.canvas.style.transition = `opacity ${S.trans == null ? 1.2 : HANDOFF}s ease`;
  m.canvas.style.pointerEvents = 'auto';
  m.start();
  requestAnimationFrame(() => { m.canvas.style.opacity = '1'; });
  emitValidated(S.validatedName, S.trans == null);
}
function enterScene() {
  S.phase = 'scene'; S.phaseAt = S.t;
  cancelAnimationFrame(rafId); rafId = 0;
  canvas.style.visibility = 'hidden';
  // mémoire de l'accueil rendue plus tard, quand la première question est posée (pas pendant le retournement)
  setTimeout(() => { try { gl?.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* */ } }, 6000);
  window.__sg.cards = cardsReady;
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
  if (cardsReady === 'failed' || !gl) startSimple();   // (sans WebGL2 ici, les cartes ne s'afficheront pas non plus)
}
// la suite en version simple (cartes, feuille, enveloppe, email) ; si même elle échoue : la porte Instagram
function startSimple() {
  names2d?.stop(); names2d = null;
  window.dispatchEvent(new CustomEvent('singulies:simple', { detail: { where: 'suite' } }));
  fallbackEl.style.display = 'none'; backEl.classList.remove('on');
  simpleModule().then(m => m.mountSimpleFlow({ name: S.validatedName.toUpperCase(), onDone: backToStart, onExit: exitCards }))
    .catch(e => { console.error(e); why('version simple : ' + (e && e.message)); noCards(); });
}
// pourquoi la suite ne s'affiche pas : ?diag=1 l'écrit en petit sous le message (téléphone, sans console)
const whyList = [];
function why(s) { whyList.push(String(s).slice(0, 300)); }
// la suite ne peut pas s'afficher (pas de WebGL2, mémoire) : plutôt qu'un noir sans issue, une porte (08/10)
function noCards() {
  if (document.getElementById('nocards')) return;
  // la police machine (celle des cartes) n'est chargée que par la scène des cartes
  new FontFace('SG Machine', `url(${new URL('fonts/CourierPrime-latin.woff2', document.baseURI)})`).load().then(f => document.fonts.add(f)).catch(() => {});
  const d = document.createElement('div'); d.id = 'nocards';
  d.innerHTML = 'ton téléphone n’arrive pas\nà montrer la suite.\n\nécris-moi ton prénom :\n<a href="https://www.instagram.com/e.t.ernel/" target="_blank" rel="noopener">@e.t.ernel</a>';
  if (!gl) why('accueil : pas de WebGL2');
  if (P.get('diag') === '1') { const w = document.createElement('div'); w.style.cssText = 'margin-top:28px;font:11px/1.4 monospace;opacity:.5;white-space:pre-wrap'; w.textContent = whyList.join(' / ') || '(aucune erreur notée)'; d.appendChild(w); }
  document.body.appendChild(d);
  setTimeout(() => d.classList.add('on'), 400);
}

function goBack() {
  if (S.phase === 'input' && portal && !S.portal && S.trans == null) { toPortal(); return; }
  // page « poème » ouverte directement (lien partagé) : le retour mène au portail
  if (S.phase === 'input' && !portal && PAGE === 'poeme' && S.trans == null) { location.href = new URL('./', document.baseURI).href; return; }
  if (S.phase === 'input' || S.phase === 'scene') return;
  document.getElementById('nocards')?.remove();
  clearStored();             // le prénom mémorisé est effacé, il reste affiché pour cette visite
  S.phase = 'input'; S.phaseAt = S.t; S.validatedName = null; S.trans = null; S.confirmed = !!finalName(model.text);   // retour : prénom conservé, toucher pour repartir
  backEl.classList.remove('on');
  bridge.refresh();
  input.classList.remove('rest'); input.readOnly = false;
  if (wheel) wheel.enable(true);   // pas de focus automatique : le clavier ne sort qu'au toucher de la zone du curseur
}
backEl.addEventListener('click', goBack);
// ordinateur : une touche de lettre tapée alors que le champ a perdu le focus (clic ailleurs) le lui rend
window.addEventListener('keydown', (e) => {
  if (TOUCH || wheel || S.portal || S.phase !== 'input' || S.trans != null || document.activeElement === input) return;
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { input.readOnly = false; input.classList.remove('rest'); input.focus({ preventScroll: true }); }
}, true);
// Entrée quand le champ a perdu le focus (prénom confirmé, clavier fermé) : 2e Entrée = colonne
window.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.defaultPrevented && !wheel && !S.portal && S.phase === 'input' && S.confirmed && document.activeElement !== input && document.activeElement?.tagName !== 'TEXTAREA') { e.preventDefault(); submitName(); } });
// Échap fonctionne aussi quand le champ n'a plus le focus (écran noir)
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !S.portal && document.activeElement !== input) goBack(); });

// Toucher n'importe où : focus du champ (ouvre le clavier mobile, geste utilisateur)
document.addEventListener('click', (e) => {
  if (S.portal || S.phase !== 'input' || S.trans != null || e.target === backEl || backEl.contains(e.target) || nextEl.contains(e.target)) return;
  const b = S.nameBox;
  // seule la zone du prénom / du curseur répond (ailleurs, plus tard : toucher un prénom du champ pour lire son
  // acrostiche) : prénom écrit → aller à la suite ; vide → écrire (le clavier sort)
  const inZone = b && e.clientX > b[0] && e.clientX < b[2] && e.clientY > b[1] && e.clientY < b[3];
  if (!inZone) return;
  // le clavier vient de se fermer et la suite allait partir : retoucher le prénom = le corriger (le clavier revient)
  if (blurGo) { clearTimeout(blurGo); blurGo = 0; if (!wheel) { input.readOnly = false; input.classList.remove('rest'); input.focus({ preventScroll: true }); } return; }
  if (finalName(model.text) && !bridge.composing) { startTransition(); return; }
  if (!wheel && document.activeElement !== input) { input.readOnly = false; input.classList.remove('rest'); input.focus({ preventScroll: true }); }
});

// le clavier se ferme (« OK » de l'iPhone, Entrée, toucher ailleurs, prénom proposé par le clavier) avec un prénom
// écrit : la suite part (09/10, Maxence) — sauf si l'on retouche le prénom dans la seconde, pour le corriger.
// Pas quand on quitte l'onglet ou l'application, ni pour la flèche retour.
let blurGo = 0, backDown = 0;
backEl.addEventListener('pointerdown', () => { backDown = performance.now(); }, true);
input.addEventListener('focus', () => { if (blurGo) { clearTimeout(blurGo); blurGo = 0; } });
input.addEventListener('blur', () => {
  if (S.portal || S.phase !== 'input' || S.trans != null || wheel || !finalName(model.text) || performance.now() - backDown < 600) return;
  clearTimeout(blurGo);
  blurGo = setTimeout(() => {
    blurGo = 0;
    if (document.hidden || !document.hasFocus() || document.activeElement === input || S.portal || S.phase !== 'input' || S.trans != null) return;
    if (bridge.composing) return;
    // (09/10) jamais avant que la dernière lettre du champ se soit allumée : sinon trop rapide
    const go = () => { if (S.portal || S.phase !== 'input' || S.trans != null || document.activeElement === input) return;
      if (renderer && S.t < light.litAt()) { blurGo = setTimeout(go, 150); return; } blurGo = 0; startTransition(); };
    go();
  }, 1000);
});

// bascule mélange → profondeur → horizontal : Tab ou double-clic (progressive)
const MODE_ORDER = ['melange', 'profondeur', 'horizontal'];
function toggleMode() { CFG.mode = MODE_ORDER[(MODE_ORDER.indexOf(CFG.mode) + 1) % MODE_ORDER.length]; }
window.addEventListener('keydown', (e) => { if (e.key === 'Tab' && !e.altKey && !e.ctrlKey && !e.metaKey) { e.preventDefault(); toggleMode(); } });
document.addEventListener('dblclick', (e) => { if (S.trans == null && !wheel && !S.portal) toggleMode(); });
// le signe sous le prénom confirmé : aller à la suite ; sans geste pendant 10 s, on y va tout seul
nextEl.addEventListener('click', (e) => { e.stopPropagation(); startTransition(); });
for (const ev of ['pointerdown', 'keydown', 'wheel', 'touchstart', 'touchmove']) window.addEventListener(ev, () => { S.actAt = S.t; }, { passive: true, capture: true });

// ---------- dimensions ----------
function measure() {
  const w = window.innerWidth, h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  // une variation de hauteur seule pendant la saisie (clavier du téléphone) ne reconstruit rien ; sur ordinateur,
  // toute nouvelle taille de fenêtre est prise en compte (le prénom reste au centre)
  if (TOUCH && S.w && w === S.w && document.activeElement === input && Math.abs(h - S.h) > 80) return;
  if (w === S.w && h === S.h && dpr === S.dpr) return;
  S.w = w; S.h = h; S.dpr = dpr;
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  // taille CSS figée en px : quand le clavier mobile réduit la fenêtre, l'image n'est ni
  // reconstruite ni étirée — le clavier la recouvre simplement
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  field?.resize(w, h);
  // champ natif centré sur le prénom (le clavier mobile vise cette zone)
  input.style.top = `calc(${(field ? field.view.cy / h : 0.5) * 100}% - 3.5em)`;
}
window.addEventListener('resize', measure);
window.visualViewport?.addEventListener('resize', measure);

// ---------- repli sans WebGL2 : noir, saisie et validation fonctionnelles ----------
let gl = null, renderer = null, atlas = null, field = null, names2d = null;
function renderFallback() {
  if (renderer) return;
  fallbackEl.textContent = S.phase === 'input' ? displayCase(bridge.shownText, CFG.caseMode) : '';
  // sans WebGL2 aussi : un curseur qui respire tant que rien n'est tapé, et la zone du prénom qu'on touche (clavier,
  // puis la suite) — sinon, sur téléphone, le clavier ne pouvait pas s'ouvrir
  fallbackEl.classList.toggle('cur', S.phase === 'input' && !S.typed);
  const r = fallbackEl.getBoundingClientRect(), cx = innerWidth / 2, cy = innerHeight / 2;
  S.nameBox = r.width > 4 ? [Math.min(r.left, cx - 90) - 30, r.top - 40, Math.max(r.right, cx + 90) + 30, r.bottom + 40]
    : [cx - Math.max(80, 0.2 * innerWidth), cy - 60, cx + Math.max(80, 0.2 * innerWidth), cy + 60];
}

// ---------- parallaxe : translation de caméra, ressort amorti (≈ 0,8 s de retard) ----------
const PAR = { tx: 0, ty: 0, x: 0, y: 0, vx: 0, vy: 0 };
const BR = { p: 0, v: 0 };   // souffle de caméra à chaque frappe (ressort)
const light = createLight({ reduced: CFG.reduced });
// visiteur qui revient : son prénom se tape tout seul à l'arrivée, lettre par lettre (la lumière suit la frappe)
if (stored.name && !stored.validated) { S.typed = true; startReveal(0, OPEN_DARK + 1.3); }
window.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || !S.w) return;
  PAR.tx = (e.clientX / S.w - 0.5) * 2; PAR.ty = (e.clientY / S.h - 0.5) * 2;
});
document.addEventListener('pointerleave', () => { PAR.tx = 0; PAR.ty = 0; });
// molette (ordinateur) ou glisser vertical (téléphone) : avancer / reculer dans le champ, retour doux
// (pas de pincement : le zoom du navigateur reste disponible pour l'accessibilité)
// un seul facteur pour l'avance ET les courants latéraux (accélération proportionnelle) :
// jusqu'à ×16 en avant, ×−10 en arrière
const addBoost = (v) => { if (!CFG.reduced && !S.portal) S.boost = Math.max(-11, Math.min(15, S.boost + v)); };
if (!CFG.wheel) {
  // molette vers le bas = avancer, vers le haut = reculer (un cran ≈ ±2,2 : un seul cran fait nettement reculer)
  window.addEventListener('wheel', (e) => addBoost(Math.max(-5, Math.min(5, e.deltaY * (e.deltaMode === 1 ? 1.4 : 0.045)))), { passive: true });
  // doigt vers le bas = avancer, vers le haut = reculer (un seul doigt ; à deux, c'est le zoom)
  let ty = null;
  window.addEventListener('touchstart', (e) => { ty = e.touches.length === 1 ? e.touches[0].clientY : null; }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (ty == null || e.touches.length !== 1) { ty = null; return; }
    const y = e.touches[0].clientY; addBoost((y - ty) * 0.06); ty = y;
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
  const cx = S.w / 2, cy0 = field ? field.view.cy : S.h * 0.5;   // le prénom est au point de fuite
  if (wheel && S.phase === 'input') wheel.update(dt);
  const shownRev = revealText(wheel ? wheel.displayText : bridge.shownText);
  const text = displayCase(shownRev, CFG.caseMode);
  const L0 = atlas ? layoutName(text, metrics, { w: S.w, h: S.h, cx, cy: cy0 }) : null;
  if (vv && L0 && document.activeElement === input) {
    const visBottom = vv.offsetTop + vv.height;
    if (visBottom < S.h - 40) target = Math.min(0, visBottom - 28 - L0.bottom);
    target = Math.max(target, -(L0.top - 24 - vv.offsetTop));
  }
  if (CFG.reduced) { S.shiftY = target; S.shiftV = 0; }
  else { const k = 30, c = 2 * Math.sqrt(k) * 0.95; S.shiftV += ((target - S.shiftY) * k - c * S.shiftV) * dt; S.shiftY += S.shiftV * dt; }
  input.style.transform = `translateY(${S.shiftY.toFixed(1)}px)`;

  if (!renderer) { renderFallback(); return; }   // sans WebGL2 : la suite = fondu au noir (startTransition)
  const cy = cy0 + S.shiftY;

  // fondus : ouverture, départ (sans WebGL2), retour
  const open = smooth(OPEN_DARK, OPEN_DARK + OPEN_FADE, S.t);
  let sceneFade = open, nameFade = smooth(OPEN_DARK + 0.2, OPEN_DARK + 1.2, S.t);
  if (S.phase === 'leaving') { const k = 1 - smooth(0, LEAVE_FADE, S.t - S.phaseAt); sceneFade *= k; nameFade *= k; }
  else if (S.phase === 'black') { sceneFade = 0; nameFade = 0; }
  else if (S.phaseAt > 0) { const k = smooth(0, 1.0, S.t - S.phaseAt); sceneFade *= k; nameFade *= k; }

  const L = layoutName(text, metrics, { w: S.w, h: S.h, cx, cy });
  const kx = 1 - Math.exp(-dt / 0.07);
  L.glyphs.forEach((g, i) => {
    if (glyphAnim[i] == null || !S.typed) glyphAnim[i] = g.x; else glyphAnim[i] += (g.x - glyphAnim[i]) * kx;   // toujours vers le centre
  });
  glyphAnim.length = L.glyphs.length;
  S.capPx = L.cap;
  // zone sensible : le prénom, ou le curseur quand il est vide (au moins 44 px de haut, assez large pour le doigt)
  S.nameBox = L.glyphs.length ? [Math.min(...L.lines.map((l) => l.x0)) - 30, L.top - 30, Math.max(...L.lines.map((l) => l.x1)) + 30, L.bottom + 30]
    : [cx - Math.max(80, 0.2 * S.w), L.cursor.y0 - 40, cx + Math.max(80, 0.2 * S.w), L.cursor.y1 + 40];
  // le prénom tel qu'il est posé (avant toute transition)
  const here = L.glyphs.map((g, i) => ({ ch: g.ch, x: CFG.reduced ? g.x : glyphAnim[i], y: g.y, fs: g.fs }));

  // caméra : la parallaxe et le souffle d'abord (la transition s'y ajoute)
  updateCamera(dt);
  const v = field.view, focal = v.f * (1 + BR.p), vx = v.cx + field.offX, vy = v.cy + S.shiftY;

  // ---------- transition vers les cartes ----------
  const T = S.trans != null ? S.t - S.trans : -1;
  let R = null, place = here, bright = null, vig = 1, hook = null, camDY = 0;
  if (T >= 0) {
    const lsc = (w, i) => field.letterScreen(w, i, focal, vx, vy);
    if (!plan) {
      plan = CFG.reduced ? { flyers: [], src: new Map(), fed: here.map(() => true), tEnd: 1.2 } : planRecharge({
        words: field.words, letterScreen: lsc, name: here, W: S.w, H: S.h, rng: transRng, mode: CFG.transition,
        level: (w, i, x, y) => {
          const nx = (x - cx) / (S.w / 2), ny = (y - cy) / (S.h / 2);
          return light.level(w.chars[i], w.lp[i], Math.min(1, Math.hypot(nx, ny) / Math.SQRT2), w.z, S.t, nx, ny);
        },
      });
      window.__sg.plan = plan;
    }
    if (T >= plan.tEnd) loadCards(S.validatedName.toUpperCase());   // tout est arrivé, le champ est éteint
    const restAt = plan.tEnd + (CFG.reduced ? 0.1 : REST);
    if (S.riseT == null && T >= restAt) {
      if (cardsReady === 'failed') { S.trans = null; plan = null; validate(); return; }   // pas de cartes : la version simple (image suivante)
      else if (cardsReady) { S.riseT = S.t; S.targets = cardsReady.nameTargets(S.w, S.h); }
    }
    const rise = CFG.reduced ? 0.9 : RISE;
    if (S.riseT != null && S.handT == null && S.t >= S.riseT + rise) handoff();
    if (S.handT != null && S.t - S.handT > HANDOFF + 0.15) { enterScene(); return; }
    if (!CFG.reduced) {
      const cap = atlas.capHeight;
      R = plan.mode === 'energie'
        ? energyFrame(plan, T, { name: here, capHeight: cap, ecx: (ch) => { const g = atlas.glyphs[ch]; return g ? (g.x0 + g.x1) / 2 : 0.3; },
          src: (fl) => { const p = field.letterScreen(fl.w, fl.i, focal, vx, vy), g = atlas.glyphs[fl.w.chars[fl.i]];
            return { x: p.x + (g.x0 + g.x1) / 2 * p.fs, y: p.y - 0.5 * cap * p.fs, fs: p.fs, blur: sigmaPx(focal, Math.max(0.5, p.z)) }; } })
        : rechargeFrame(plan, T, { world: field.letterWorld, cam: field.cam, f: focal, vx, vy, name: here, capHeight: cap });
      bright = R.bright;
    } else bright = here.map(() => 1);
    const tg = S.targets && S.targets.length === here.length ? S.targets : null;
    if (S.riseT != null) {
      const u = CFG.reduced ? 1 : riseU(S.t, S.riseT), gu = CFG.reduced ? 1 : grayU(S.t, S.riseT);
      if (tg) place = here.map((p, i) => ({ ch: p.ch, x: p.x + (tg[i].x - p.x) * u, y: p.y + (tg[i].y - p.y) * u, fs: p.fs + (tg[i].fs - p.fs) * u, fsx: p.fs + ((tg[i].fsx || tg[i].fs) - p.fs) * u }));
      bright = bright.map((b) => b + (NAME_GRAY - b) * gu);
      vig = 1 - (CFG.reduced ? smooth(S.riseT, S.riseT + 0.9, S.t) : smT(S.riseT, S.riseT + RISE, S.t));
      // la caméra descend : le prénom (le plus proche, z ≈ 3) monte de toute sa course, les mots lointains à peine
      if (tg && here.length) camDY = u * (here[0].y - tg[0].y) * 3 / focal;
    }
    // mouvement réduit : le prénom s'efface au centre puis apparaît à sa place, déjà en retrait
    if (CFG.reduced) bright = bright.map(() => (S.riseT == null ? NAME_REST * (1 - smooth(0, 0.9, T)) : NAME_GRAY * smooth(S.riseT, S.riseT + 0.9, S.t)));
    hook = CFG.reduced
      ? { letter: (w, i, dn, buf, o) => { const k = 1 - smooth(0, 1.2, T); buf[o + 7] *= k; buf[o + 17] *= k; } }
      : { letter: (w, i, dn, buf, o) => fieldLetter(plan, T, w, i, dn, buf, o), extra: () => R.inst || [] };
  }
  field.cam.y += camDY;

  const glyphs = [];
  place.forEach((g, i) => {
    const gm = atlas.glyphs[g.ch];
    if (!gm) return;
    // roue : la lettre en cours (la dernière) suit la rotation
    const active = wheel && S.phase === 'input' && T < 0 && i === place.length - 1 && wheel.current !== ' ';
    const dy = active ? -wheel.frac * S.capPx * 1.6 : 0;
    let al = active ? nameFade * (1 - 0.55 * Math.min(1, Math.abs(wheel.frac) * 2)) : nameFade;
    al *= bright ? bright[i] : NAME_REST;   // même clarté du prénom partout
    glyphs.push({
      box: [g.x + gm.x0 * (g.fsx || g.fs), g.y + dy + gm.y0 * g.fs, g.x + gm.x1 * (g.fsx || g.fs), g.y + dy + gm.y1 * g.fs],
      uv: [gm.u0, gm.v0, gm.u1, gm.v1], alpha: al, pxEm: g.fs,
    });
  });
  // le signe sous le prénom confirmé (aller à la suite) ; 10 s sans geste → on y va
  const canNext = S.phase === 'input' && S.confirmed && T < 0 && !!text.trim() && !wheel && !S.rev;   // pas pendant la frappe automatique
  nextEl.classList.toggle('on', SHOW_NEXT && canNext && S.t - S.confirmedAt > 1.2 && S.t > OPEN_DARK + 1.5);
  if (canNext) { nextEl.style.left = (cx - 22) + 'px'; nextEl.style.top = (L.bottom + Math.max(12, 0.8 * L.cap)) + 'px'; }
  // dès que la dernière lettre du champ s'est allumée (08/10 : plus vite — on n'attend plus sa pleine clarté), et
  // jamais moins de 2 s après le dernier geste (toucher, souris, molette, touche)
  if (canNext && S.t >= Math.max(light.litAt(), S.confirmedAt + 0.5, S.actAt + 2)) startTransition();
  if (CFG.debug) {   // croix au point de fuite
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
  const kind = light.update((wheel ? bridge.shownText : shownRev).toUpperCase(), S.t);
  if (kind && S.phase === 'input' && !CFG.reduced) { BR.v += kind > 0 ? 0.015 : 0.008; S.slowAt = S.t; }
  { const w = 2.2, z = 0.85; BR.v += (-BR.p * w * w - 2 * z * w * BR.v) * dt; BR.p += BR.v * dt; }
  let speed = 1 - 0.65 * (1 - smooth(0, 1.1, S.t - S.slowAt));
  // pendant la transition le champ continue d'avancer et de défiler : les mots s'éteignent en mouvement

  // champ : zone vide autour du prénom, simulation
  const ln = L.lines;
  field.setZone(text.trim() ? { x0: Math.min(...ln.map((l) => l.x0)), x1: Math.max(...ln.map((l) => l.x1)), y0: L.top, y1: L.bottom, pad: 1.1 * L.fs } : null);
  // les lettres éteintes gardent la même opacité qu'un prénom soit saisi ou non (05/10, plus cohérent)
  S.dim = 1;
  S.boost *= Math.exp(-dt / 1.3);
  const portraitSpeed = S.w < S.h ? 2 : 1;   // portrait : on ne voit qu'une partie du champ, le flux paraît lent
  { const [lt, at] = MODES[CFG.mode], k = CFG.reduced ? 1 : 1 - Math.exp(-dt * 1.2);   // bascule progressive
    S.lat += (lt - S.lat) * k; S.adv += (at - S.adv) * k; }
  field.step(dt, !CFG.reduced, speed * portraitSpeed * (1 + (T >= 0 ? 0 : S.boost)), S.lat, S.adv);
  const fl = field.emit(light, S.t, { x: cx, y: cy }, hook);
  stats.drawCalls = renderer.draw({ w: S.w, h: S.h, dpr: S.dpr, cx, cy, grain: CFG.grain, fade: sceneFade, glyphs, vig, energy: R?.energy,
    field: fl, cam: field.cam, focal, vx, vy, dim: S.dim, time: S.t });
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

function smooth(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

// ---------- portail : la première page (avant le champ) ----------
let portal = null, portalGo = null, booted = false;
// toucher « ton prénom ton poème, par la poste » : dans le même geste, le champ prend le focus (iPhone : le clavier s'ouvre)
// et le champ apparaît sous le portail qui s'efface
function enterFromPortal() {
  S.portal = false;
  // première fois : le champ naît en fondu une fois le portail effacé (≈ 1,35 s), pas pendant (06/10 : on arrivait
  // sur tous les prénoms déjà visibles)
  if (S.t < OPEN_DARK) S.t = 0;                  // (jamais négatif : bloquait la page)
  else { S.phaseAt = S.t; }                      // retour : fondu d'entrée
  input.readOnly = false; input.classList.remove('rest');
  // pas de focus automatique : le clavier ne sort que si l'on touche la zone du curseur (Maxence 05/10)
  setTimeout(() => { if (!S.portal) backEl.classList.add('on'); }, 1500);
  showPath('poeme');
  portalGo?.();
  if (booted && !rafId && !document.hidden) { last = 0; rafId = requestAnimationFrame(frame); }
}
// retour (flèche, Échap) depuis le champ : le portail revient, le champ s'arrête une fois couvert
function toPortal() {
  S.portal = true; showPath('./');
  input.blur(); backEl.classList.remove('on');
  (portal.back || portal.show)();
  setTimeout(() => { if (S.portal) { cancelAnimationFrame(rafId); rafId = 0; } }, 1000);
}
// « le jeu » : sa page par-dessus le portail (qui s'arrête une fois couvert) ; retour = le portail, qui redistribue
// le jeu : sa page (le portail y hisse son paquet, la page se pose exactement dessus) ; retour = le portail
// question partagée (jeu?q=…) : elle est tirée en premier, on y répond (jeu.js)
let jeuShared = false;
let jeuQ = P.get('q') != null && /^\d+$/.test(P.get('q')) ? +P.get('q') : null;
// retour : le portail, resté dessous (jamais le champ de prénoms), se rembobine
const backToPortal = () => { showPath('./'); if (portal?.back) portal.back(); else portal?.show(); };
const under = () => { if (portal?.pause) portal.pause(); else portal?.hide(); };
// le jeu venu du portail (09/10) : une couche transparente préparée d'avance par-dessus le portail ; au toucher, elle
// prend son paquet et la carte du dessus se retourne sur la question (jeu.js, relais) ; au retour, elle le lui rend
let jeuRelay = null;
function prepJeu() {
  if (!jeuRelay) jeuRelay = SIMPLE === 'all' ? Promise.resolve(null) : import('./jeu/jeu.js')
    .then(({ mountJeu }) => mountJeu({ base: './', reduced: CFG.reduced, relay: true, noIntro: true, portal: () => portal,
      onBack: backToPortal, onReturned: () => portal?.takeDeck?.() }))
    .catch(e => { console.warn('jeu (relais)', e); return null; });
  return jeuRelay;
}
function openJeu(fromPortal = false) {
  showPath('jeu');
  if (fromPortal) {
    prepJeu().then(j => {
      if (!j || !j.takeOver) { openJeuPage(); return; }
      j.takeOver();
      setTimeout(() => { if (j.on) under(); }, 1700);          // le reste du portail parti : il s'arrête dessous
    });
    return;
  }
  openJeuPage();
}
// la page du jeu seule, par-dessus le portail (lien partagé, version simple, ou relais impossible)
function openJeuPage() {
  // question partagée (lien jeu?q=…) : à la première ouverture seulement, on y répond
  const shared = PAGE === 'jeu' && jeuQ != null && !jeuShared; jeuShared = true;
  const simple = () => simpleModule().then(m => m.mountSimpleJeu({ onBack: backToPortal }));
  import('./jeu/jeu.js').then(({ mountJeu }) => SIMPLE === 'all' ? null : mountJeu({ base: './', reduced: CFG.reduced, onBack: backToPortal,
    firstQ: shared ? jeuQ : null, answer: shared }))
    .then(j => j || simple())                                    // sans WebGL2 : le jeu en version simple
    .catch(e => { console.warn('jeu', e); return simple(); })
    .then(j => { if (j) setTimeout(under, 1000); })
    .catch(e => console.warn('jeu simple', e));
}
function mountPortalPage() {
  S.portal = true;
  const go = new Promise(res => { portalGo = res; });
  const ready = new Promise(res => {
    import('./portal/portal.js')
      .then(({ mountPortal }) => SIMPLE === 'all' ? null : mountPortal({ base: './', reduced: CFG.reduced, onReady: res, onPoem: enterFromPortal, onJeu: () => openJeu(true) }))
      .catch(e => { console.warn('portail', e); why('portail : ' + (e && e.message || e)); document.getElementById('portal')?.remove(); return null; })
      // sans WebGL2 (ou le portail en échec) : le portail en version simple — mêmes cartes, mêmes gestes
      .then(p => p || (why('portail : version simple'), window.dispatchEvent(new CustomEvent('singulies:simple', { detail: { where: 'portail' } })), simpleModule().then(m => m.mountSimplePortal({ onReady: res, onPoem: enterFromPortal, onJeu: () => openJeu(false) }))))
      .then(p => { portal = p; if (p && p.deckScreen && PAGE !== 'jeu') setTimeout(prepJeu, 6500); })   // (la donne finie)
      .catch(e => { console.warn('portail simple', e); S.portal = false; portalGo(); res(); });
  });
  return { go, ready };
}

// ---------- amorçage ----------
let metrics = null;
async function boot() {
  measure();
  // le portail d'abord ; le champ se prépare une fois les cartes posées (ou tout de suite si l'on choisit le poème)
  let gate = null;
  if (CFG.portal && S.phase === 'input') {
    gate = mountPortalPage();
    if (PAGE === 'jeu') openJeu();                      // lien partagé vers le jeu : il s'ouvre par-dessus le portail
    // après la donne des cartes (dernière posée à ≈ 5,1 s) + un temps : la préparation du champ (lourde, ≈ 0,1–0,3 s
    // d'un bloc) faisait hoqueter la 3e carte juste avant qu'elle se pose (06/10) ; elle tombe maintenant au repos
    await Promise.race([gate.ready.then(() => new Promise(r => setTimeout(r, 6400))), gate.go]);
  }
  // rechargement après la suite : directement la scène des cartes (le prénom à sa place, le paquet arrive)
  if (S.phase === 'scene') {
    canvas.style.visibility = 'hidden'; input.readOnly = true;
    loadCards(S.validatedName.toUpperCase());
    await cards;
    if (cardsReady && cardsReady !== 'failed') { handoff(); window.__sg.cards = cardsReady; return; }
    S.phase = 'black'; canvas.style.visibility = '';
  }
  // la seconde de noir sert à charger la police et construire l'atlas
  try {
    const ff = new FontFace(FONT_FAMILY, `url(${new URL('fonts/EBGaramond-500.woff2', document.baseURI)})`, { weight: '500' });
    document.fonts.add(await ff.load());
  } catch (e) { console.warn('police', e); }

  gl = SIMPLE === 'all' ? null : getGL(canvas);
  if (!gl) {
    // sans WebGL2 : le prénom en clair au centre, et les prénoms du champ dessinés à plat derrière (version simple)
    fallbackEl.style.display = 'block';
    renderFallback();
    simpleModule().then(m => { if (S.phase === 'input') names2d = m.startNames2D(canvas, () => bridge.shownText); }).catch(e => console.warn('champ simple', e));
    window.dispatchEvent(new CustomEvent('singulies:simple', { detail: { where: 'champ' } }));
  } else {
    atlas = buildAtlas('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', `"${FONT_FAMILY}", serif`, 500);
    metrics = { adv: (ch) => atlas.glyphs[ch]?.adv ?? 0.6, capHeight: atlas.capHeight };
    renderer = createRenderer(canvas, gl, atlas);
    const t0 = performance.now();
    field = createField({ rng: createRng(CFG.seed), caseMode: CFG.caseMode, glyphs: atlas.glyphs, capHeight: atlas.capHeight, mode: CFG.mode });
    field.resize(S.w, S.h);   // inclut ≈ 700 s de champ « vécu »
    input.style.top = `calc(${(field.view.cy / S.h) * 100}% - 3.5em)`;
    stats.warmupMs = Math.round(performance.now() - t0);
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); cancelAnimationFrame(rafId); rafId = 0; });
    canvas.addEventListener('webglcontextrestored', () => { renderer.restore(); last = 0; if (!document.hidden) rafId = requestAnimationFrame(frame); });
  }
  if (S.phase === 'black') { S.phaseAt = 0; enterBlack(true); }
  // pas de focus automatique à l'ouverture (ordinateur : une touche de lettre donne le focus au champ)
  booted = true;
  if (PAGE === 'poeme' && S.phase === 'input') setTimeout(() => backEl.classList.add('on'), 1500);
  if (gate) await gate.go;
  if (!rafId) rafId = requestAnimationFrame(frame);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cancelAnimationFrame(rafId); rafId = 0; }
  else if (!rafId && S.phase !== 'scene' && !S.portal && booted && (!gl || !gl.isContextLost())) { last = 0; rafId = requestAnimationFrame(frame); }
});

// accès de test / mesure
const stats = { drawCalls: 0, gpuMB: 0, letters: 0, warmupMs: 0 };
window.__sg = { stats, model, S, CFG, get portal() { return portal; }, get atlas() { return atlas; }, get field() { return field; }, get voice() { return voice; }, validate, submitName, startTransition, goBack, get bridge() { return bridge; } };

fpsMeter();      // ?fps=1 : images par seconde (essais de fluidité)
installCount(PAGE);   // des totaux anonymes (inactif tant que COUNTER = null)
installSend();   // la demande part par email quand l'enveloppe est postée (ou « en direct »)
boot();
