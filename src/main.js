// SINGULIÉS — écran d'accueil. Amorçage, boucle, états (saisie → transition → scène des cartes).
import { vk, EST_VERSION, EST_V2 } from './core/version.js';
import { analysePrenom, PHRASES } from './core/prenom.js';
import { creerNote } from './core/note.js';
import './app/lum.js';
import { NameModel } from './input/model.js';
import { createBridge } from './input/bridge.js';
import { createWheel } from './input/wheel.js';
import { createVoice } from './input/voice.js';
import { displayCase, finalName, normalizeName } from './text/normalize.js';
import { getGL } from './gl/gl.js';
import { buildAtlas } from './gl/atlas.js';
import { createRenderer } from './render/renderer.js';
import { layoutName } from './name/layout.js';
import { loadState, saveValidated, clearStored, clearValidated, sessionName, saveSessionName, homeUrl } from './app/storage.js';
import { installSend, settled, setOrder, send } from './app/send.js';
import { installCount, count } from './app/count.js';
import { createField, MODES, grayOf } from './field/field.js';
import { NAMES } from './field/names.js';
import { createRng } from './field/rng.js';
import { createLight } from './field/light.js';
import { sigmaPx, KB, ZF } from './field/camera.js';
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
// version alternative (10/10, alt.html) : pas de portail ; après le prénom, la feuille qui attend (prix, photos,
// COMMANDER) au lieu des cartes ; la question vient après le paiement (merci.html)
const ALT = PAGE === 'alt';
const offerModule = () => import('./alt/offre.js');
import { SHEET_INSET } from './alt/config.js';
import { columnTargets } from './sheet/sheet.js';
import { installNav } from './nav/nav.js';
import { createAttention } from './app/attention.js';
// la marge du bas de l'écran (barre de l'iPhone), en px
let safeB = null;
const safeBottom = () => { if (safeB == null) { const d = document.createElement('div'); d.style.cssText = 'position:fixed;bottom:0;width:1px;height:env(safe-area-inset-bottom);visibility:hidden'; document.body.appendChild(d); safeB = d.offsetHeight || 0; d.remove(); } return safeB; };
let safeT = null;
const safeTop = () => { if (safeT == null) { const d = document.createElement('div'); d.style.cssText = 'position:fixed;top:0;width:1px;height:env(safe-area-inset-top);visibility:hidden'; document.body.appendChild(d); safeT = d.offsetHeight || 0; d.remove(); } return safeT; };
// (11/10) la réserve du bandeau des pages, en haut (px, sans la marge du haut de l'iPhone)
const NAV_TOP = 92;   // (17/10) la ligne du haut (← SINGULIES menu) et le bandeau des pages
const SHEET_ZOOM = (W, H) => (W < H ? 0.8 : 0.92);   // (17/10) ordinateur : la feuille occupait moins de la moitié de la hauteur
// (11/10, Maxence) alt : le prénom ne monte plus puis ne redescend plus — ses lettres dérivent directement vers la place
// qu'elles prendront dans la colonne de la feuille, et les lettres des autres prénoms qui les rechargent encore les
// suivent ; la feuille apparaît ensuite sous elles. Une dérive lente, en courbe douce, chaque lettre un peu après la
// précédente ; elles rapetissent en route jusqu'à la taille de la colonne.
const DRIFT_AT = 0.5, DRIFT_T = 2.4, DRIFT_GAP = 0.03;
const SHEET_LEAD = 1.8;   // (12/10) s : la feuille commence à paraître avant que les lettres s'y posent
const clamp01 = u => Math.min(1, Math.max(0, u));
// (10/10) payé ici, page rechargée PENDANT la cérémonie : merci.html la reprend (la commande est gardée) — une seule fois,
// et seulement dans les 20 minutes (Maxence 11/10 : après une réservation, alt.html renvoyait toujours vers merci.html)
if (ALT) {
  try {
    const o = JSON.parse(localStorage.getItem(vk('singulies.order')) || 'null');
    if (o && o.paid && !o.done && !o.resumed && Date.now() - (o.at || 0) < 20 * 60e3) {
      o.resumed = true; localStorage.setItem(vk('singulies.order'), JSON.stringify(o));
      const u = new URL('./merci.html', document.baseURI), k = new URLSearchParams(location.search);
      if (o.simule) k.set('simule', '1'); if (o.reserve) k.set('reserve', '1'); if (o.session) k.set('session', o.session);
      u.search = k.toString(); location.replace(u.href);
    }
  } catch { /* */ }
}
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
  portal: P.get('portail') !== '0' && !['poeme', 'alt'].includes(document.documentElement.dataset.page),
};
const FONT_FAMILY = 'SG Garamond';
// (18/10, Maxence : « afficher au plus vite ») site principal : la police et l'atlas sont déjà prêts quand la première image
// est dessinée (boot les attend) — la seconde de noir n'attendait plus rien ; les versions gardent l'ancien rythme
const FAST_OPEN = ALT && !EST_VERSION;
const OPEN_DARK = FAST_OPEN ? 0.05 : 1.0;      // s de noir à l'ouverture
const OPEN_FADE = FAST_OPEN ? 0.3 : 1.4;       // s de fondu d'entrée
// (18/10, Maxence : « d'abord seulement UN PRENOM UN POEME avec ETERNEL et SINGULIES, le champ de prénoms qui apparaît en 1 s selon la
// profondeur, d'organique ») site principal : le champ naît du fond vers l'avant-plan en ≈ 1,2 s (shader : u_rev)
// (Maxence : « trop rapide ; il doit avoir fini d'apparaître quand le curseur est seul ») : il s'étale sur toute l'intro, et finit avec elle
const revealT = () => OPEN_DARK + 0.3 + INTRO_LEN;   // (instant où le curseur reste seul)
const LEAVE_FADE = 1.2;     // s de fondu au noir après validation (sans WebGL2)
const HINT = P.get('indice') === '1' || (EST_VERSION && !EST_V2 && P.get('indice') !== '0');   // (18/10, V3) dans les versions : la consigne (PRENOM, tapé en grisé) paraît après quelques secondes sans frappe
//   // (17/10, Maxence) plus de PRENOM grisé : le curseur seul ; ?indice=1 pour le revoir   // (10/10) PRENOM en grisé si rien n'est écrit
const HINT_AFTER = 3.0, HINT_ALPHA = 0.2;   // s après l'apparition du champ ; clarté (fraction)
// (10/10, version alternative) après ETERNEL : UN PRENOM / UN POEME en grisé (la grammaire de tout le site), qui
// s'efface pour laisser le curseur seul au centre ; ailleurs : PRENOM, le curseur glisse devant
// (16/10, Maxence) alt : PRENOM aussi, mais seulement si l'on n'a toujours pas compris après l'apparition du menu
const HINT_TEXT = 'PRENOM';
const HINT_AFTER_NAV = 3.2;   // (alt) s après l'apparition du menu (plus utilisé : voir HINT_AFTER_ALT)
// (17/10, Maxence : « on enlève "aide", ça pollue ; si vraiment la personne ne comprend pas, PRENOM en grisé à la
// machine après un certain temps ») alt : 5 s après que le curseur est resté seul (ETERNEL effacé), PRENOM se tape
// lettre à lettre en grisé, le curseur devant ; il s'efface à la première lettre tapée
const HINT_AFTER_ALT = 5.0, HINT_STRIKE = 0.13;   // (deux lignes comme un prénom : coupure aux espaces, la plus équilibrée)
const IDLE_GO = EST_V2 ? Infinity : EST_VERSION ? 7.5 : 3.5;   // (18/10, V2) jamais de validation automatique : « continuer → »
// (18/10, V3) pause plus longue avant la validation automatique ; et pas avant 2 lettres (IDLE_MIN)
const AUTO_GO = !EST_V2;   // (V2) rien ne part sans « continuer → » (ni la pause, ni le clavier fermé, ni la lumière)
const IDLE_MIN = EST_VERSION ? 2 : 1;
// (18/10, V3) le visiteur qui revient saute l'intro (ETERNEL tapé puis effacé) : on retient qu'un prénom a déjà été validé
const DEJA_VU = EST_VERSION && (() => { try { return localStorage.getItem(vk('singulies.vu')) === '1'; } catch { return false; } })();
//   // (10/10) ordinateur : fini d'écrire sans Entrée → la suite après ce temps sans frappe
// (10/10, version alternative) à l'ouverture, ETERNEL — mon nom — se tape à la machine à la place du prénom, le champ
// s'allume avec lui (on voit ce que fait une frappe), puis il s'efface lettre à lettre : reste le curseur seul, qui
// invite à taper le sien. Toute frappe, tout toucher du champ l'arrête.
// (18/10, Maxence : « afficher au plus vite UN PRENOM / UN POEME au milieu, qui s'efface pour laisser seulement le curseur ») site
// principal : la phrase du site, tapée vite, tenue un instant, effacée vite ; les versions gardent ETERNEL
// (18/10, Maxence : « gardons ETERNEL au début, au centre ») ETERNEL, mon nom, tapé puis effacé ; la phrase UN PRENOM / UN POEME reste dans le bandeau des pages
const INTRO = 'ETERNEL';
const I_TYPE = EST_VERSION ? 0.14 : 0.1, I_HOLD = EST_V2 ? 0.8 : EST_VERSION ? 1.5 : 1.0, I_ERASE = EST_VERSION ? 0.07 : 0.05;   // (18/10, V2) une intro d'environ 3 s
// la coupure : après le deuxième mot (UN PRENOM / UN POEME) ; les versions (ETERNEL) : aucune
const INTRO_BREAK = EST_VERSION ? -1 : INTRO.indexOf(' ', INTRO.indexOf(' ') + 1);
const introLines = t => (t.length > INTRO_BREAK ? t.slice(0, INTRO_BREAK) + '\n' + t.slice(INTRO_BREAK + 1) : t);
let introLockK = '', introLockV = null;
function introLock(vp) {
  const k = vp.w + 'x' + vp.h;
  if (k !== introLockK && metrics) { const F = layoutName(introLines(displayCase(INTRO, CFG.caseMode)), metrics, vp); introLockV = { fs: F.fs, track: F.track, n: 2 }; introLockK = k; }
  return introLockV;
}
const I_LEAD = EST_VERSION ? 0.4 : 0.05;   // s entre l'apparition du champ et la première lettre
const INTRO_LEN = I_LEAD + INTRO.length * (I_TYPE + I_ERASE) + I_HOLD;   // s entre l'apparition du champ et le curseur seul
function introText() {
  if (!ALT || S.introOff || S.typed || S.phase !== 'input' || S.hintT0 == null || model.text) return '';
  if (DEJA_VU || (EST_VERSION && CFG.reduced)) { S.introOff = true; S.introEnd = S.t; return ''; }   // (V3) qui revient, ou mouvement réduit : pas d'intro
  const u = S.t - S.hintT0 - I_LEAD, n = INTRO.length, a = n * I_TYPE, b = a + I_HOLD, c = b + n * I_ERASE;
  if (u < 0) return '';
  if (u < a) return INTRO.slice(0, Math.floor(u / I_TYPE) + 1);
  if (u < b) return INTRO;
  if (u < c) return INTRO.slice(0, n - Math.floor((u - b) / I_ERASE) - 1);
  S.introOff = true; S.introEnd = S.t; return '';
}
const SHOW_NEXT = P.get('fleche') === '1';   // flèche « suite » retirée pour l'instant (04/10) ; ?fleche=1 pour la revoir
// passage automatique à la suite : dès que la dernière lettre allumée du champ a atteint sa clarté (prénom confirmé)
const HANDOFF = PAGE === 'alt' ? 0.35 : 0.6;   // s de fondu enchaîné vers la scène des cartes (même prénom, même place)
// (10/10, alt) du prénom à la colonne de la feuille, tout va plus vite : le vol, le repos, la montée, la feuille
const ALT_K = PAGE === 'alt' ? 1.7 : 1;

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
// (11/10) alt.html : le prénom tapé dans cette visite est déjà écrit au rechargement (il se tape tout seul, puis la suite)
if (ALT && !stored.name && !stored.validated) { const n = sessionName(); if (n) stored.name = n; }
// (16/10, Maxence : « pouvoir retourner à la page des prénoms : une faute, changer d'avis, commander pour quelqu'un
// d'autre ») revenu de la feuille pour corriger : le prénom se retape, le curseur au bout, rien ne repart tout seul
const K_EDIT = vk('sg.edit');
let EDIT = null;
if (ALT) { try { EDIT = sessionStorage.getItem(K_EDIT); sessionStorage.removeItem(K_EDIT); } catch { /* */ } if (EDIT) { stored.name = EDIT; stored.validated = null; } }
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
  confirmed: !!(stored.name && !stored.validated) && !EDIT,   // Entrée / remplissage auto / visiteur qui revient : prénom confirmé
  confirmedAt: stored.name && !stored.validated ? OPEN_DARK : -99,   // instant de la confirmation
  actAt: -99,             // dernier geste (le passage automatique attend 10 s sans toucher)
  trans: null,            // instant du départ de la transition vers les cartes
  riseT: null,            // début de la montée (attend que la scène des cartes soit prête)
  handT: null,            // début du fondu enchaîné vers la scène des cartes
  rev: null,              // frappe automatique en cours { n lettres affichées, instant de la suivante }
  nameBox: null,          // boîte écran du prénom (le toucher = aller à la suite)
  boost: 0,               // avance/recul dans le champ (molette, glisser vertical)
  lat: 0, adv: 1,         // nappes latérales / avance (bascule progressive vers le mode visé ; initialisés ci-dessous)
  edit: !!EDIT,           // (16/10) on corrige le prénom : curseur au bout, le toucher ouvre le clavier (pas la suite)
  rw: false,              // (16/10) la transition se rembobine (prénom touché pendant qu'il part)
};
if (EDIT) { S.introOff = true; S.introEnd = 0; S.navNo = true; }

[S.lat, S.adv] = MODES[CFG.mode];

let announceTimer = 0;
function announce(msg) {
  live.textContent = '';
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => { live.textContent = msg; }, 30);
}

// (18/10, correctif C5) dans les versions, ce que la machine retire, transcrit ou coupe est DIT : une ligne tapée sous le
// prénom (avant : un caractère refusé ou un prénom coupé à 22 lettres disparaissaient sans un mot)
const note = EST_VERSION ? creerNote() : null;
function noteNom(res) {
  if (!note || S.phase !== 'input') return;
  const a = analysePrenom(res.raw), par = c => a.messages.find(m => m.code === c);
  const m = par('non-latin') || par('retires') || (res.truncated && { texte: PHRASES.tronque() }) || par('accents');
  if (m) { const vv = window.visualViewport; note.dire(m.texte, { haut: Math.min(innerHeight * 0.66, (vv ? vv.height : innerHeight) - 70) }); }
}
const bridge = createBridge(input, model, {
  caseMode: CFG.caseMode,
  announce,
  onRaw: EST_VERSION ? noteNom : undefined,
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
const ANDROID = TOUCH && /Android/i.test(navigator.userAgent);
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
  if (EST_V2) { startTransition(); return; }   // (V2) Entrée = « continuer → »
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
  note?.taire();
  if (EST_VERSION) { try { localStorage.setItem(vk('singulies.vu'), '1'); } catch { /* */ } note.dire('pas ton prénom ? touche-le', { haut: innerHeight * 0.66, duree: 5000 }); }   // (V3) il est encore temps de le corriger
  const shown = displayCase(finalName(model.text), CFG.caseMode);
  S.trans = S.t; S.confirmed = true; S.validatedName = shown;
  saveValidated(shown);                     // un rechargement (même pendant la transition) mène aux cartes
  if (ALT) saveSessionName(shown);
  input.blur(); input.classList.add('rest'); input.readOnly = true;
  wheel?.enable(false); voice?.stop();
  nextEl.classList.remove('on');
  if (!renderer) { validate(); return; }
  prefetchCards();
  // (12/10, alt) la scène des cartes, déjà prête (préparée pendant qu'on écrivait), reçoit le prénom définitif
  if (ALT && cards) cards.then(() => { if (cardsReady && cardsReady !== 'failed') cardsReady.setName?.(shown.toUpperCase()); });
}
// (16/10, Maxence) le logo SINGULIES sur la page des prénoms ; (17/10, après quatre essais refusés — relief, lueur,
// révélation, filet : « cheap », « on le voit trop ») un calligramme : le logo fait de prénoms. Des lignes de tout petits
// prénoms, à la taille et dans le gris des plus lointains du champ, n'existent qu'à l'intérieur de sa forme ; chaque
// ligne coulisse lentement (l'une vers la gauche, la suivante vers la droite, comme les nappes du champ) : en passant
// le bord du logo, chaque lettre paraît ou s'efface — ce sont les prénoms qui en dessinent les contours. Aucun trait,
// aucune lueur. Le sens : SINGULIES, ce sont les prénoms. Ils s'écartent du prénom qu'on écrit (zone vide) et
// s'éteignent quand il part. ?logo=0 : rien ; ?logoK= : sa clarté.
const LOGO_BG = ALT && P.get('logo') !== '0', LOGO_MM = 38.501, LOGO_K = +(P.get('logoK') || 1);
const loadImg = src => new Promise((ok, ko) => { const im = new Image(); im.onload = () => ok(im); im.onerror = ko; im.src = new URL(src, document.baseURI).href; });
let logoD = null;   // { n, d } : distance au bord du logo (mm, < 0 dedans), échantillonnée par lettre
async function loadLogoBg() {
  try {
    const im = await loadImg('cards/logo.png');
    const n = 256, cv = document.createElement('canvas'); cv.width = cv.height = n;
    const x = cv.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, n, n);
    const px = x.getImageData(0, 0, n, n).data, d = new Float32Array(n * n);
    for (let i = 0; i < n * n; i++) d[i] = (2 * ((px[i * 4] * 256 + px[i * 4 + 1]) / 65535) - 1) * 2;
    return { n, d };
  } catch (e) { console.warn('logo', e); return null; }
}
// les lignes du calligramme : pour chacune, une suite de prénoms (sa propre graine), son allure (px/s, signe alterné)
let calli = null;
function calliLines(fs) {
  const rnd = mulberry(91), names = NAMES.filter(n => n.length <= 8);
  const lines = [];
  for (let k = 0; k < 140; k++) {
    let txt = '';
    while (txt.length < 360) txt += names[Math.floor(rnd() * names.length)].toUpperCase() + '   ';
    const ch = [...txt], xs = [], track = 0.16 * fs;
    let x = 0;
    for (const c of ch) { xs.push(x); x += (c === ' ' ? 0.32 : (atlas.glyphs[c]?.adv ?? 0.6)) * fs + track; }
    lines.push({ ch, xs, P: x, v: (k % 2 ? -1 : 1) * (2.6 + 2.2 * rnd()), ph: rnd() * x });
  }
  return lines;
}
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// (17/10) lue en interpolé (bilinéaire) : une valeur qui glisse avec la ligne, jamais par marches
const dAt = (u, v) => {
  const n = logoD.n, d = logoD.d, fx = Math.min(n - 1.001, Math.max(0, u * (n - 1))), fy = Math.min(n - 1.001, Math.max(0, v * (n - 1)));
  const x = fx | 0, y = fy | 0, tx = fx - x, ty = fy - y, i = y * n + x;
  return (d[i] * (1 - tx) + d[i + 1] * tx) * (1 - ty) + (d[i + n] * (1 - tx) + d[i + n + 1] * tx) * ty;
};
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
    // version alternative : la feuille seule, tout de suite, qui reste ; l'offre se pose dessus quand le curseur respire
    ...(ALT ? { insetBottom: () => SHEET_INSET + safeBottom(), insetTop: () => NAV_TOP + safeTop(), sheetZoom: SHEET_ZOOM, placed: !CFG.reduced, sheetFast: 1.8, noTopCard: true, vitrine: true, sheetOnly: true, hold: true, onSheetReady: () => showOffer(true) } : {}),
    onEnd: () => {}, onDone: () => (S.paid ? finishPaid() : backToStart()),
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
  Promise.all([wait(1200), Promise.race([settled().catch(() => {}), wait(2500)])]).finally(() => { const u = homeUrl(), k = new URLSearchParams(location.search); k.delete('q'); u.search = k.toString(); location.replace(u); });   // (une demande pas partie est gardée : elle repart à la visite suivante)
}
// retour depuis le paquet : l'accueil, prénom confirmé (comme un visiteur qui revient)
function exitCards() { clearValidated(); location.reload(); }
// fondu enchaîné : la scène des cartes dessine le même prénom, au même endroit, dans le même gris
function handoff(started = false) {
  const m = cardsReady;
  S.handT = S.t;
  m.canvas.style.transition = `opacity ${S.trans == null ? 1.2 : HANDOFF}s ease`;
  m.canvas.style.pointerEvents = 'auto';
  if (!started) m.start();
  requestAnimationFrame(() => { m.canvas.style.opacity = '1'; });
  emitValidated(S.validatedName, S.trans == null);
}
function enterScene() {
  S.phase = 'scene'; S.phaseAt = S.t;
  cancelAnimationFrame(rafId); rafId = 0;
  canvas.style.visibility = 'hidden';
  if (cardsReady && cardsReady.canvas) cardsReady.canvas.style.mixBlendMode = '';   // (l'accueil caché : plus rien à mêler)
  // mémoire de l'accueil rendue plus tard, quand la première question est posée (pas pendant le retournement)
  setTimeout(() => { try { if (S.phase === 'scene') { S.loseExt = gl?.getExtension('WEBGL_lose_context'); S.loseExt?.loseContext(); } } catch { /* */ } }, 6000);
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
  if (ALT) { showOffer(); return; }
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

// version alternative : la feuille qui attend se pose sur le prénom seul ; le champ s'arrête une fois couvert
let offer = null, offerObj = null;
// over : par-dessus la vraie feuille (scène des cartes) ; sinon (sans WebGL2, cartes en échec) la feuille dessinée
// (et le paiement mène à merci.html)
function showOffer(over = false) {
  if (offer) return;
  if (!over) { S.phase = 'offre'; S.phaseAt = S.t; emitValidated(S.validatedName, false); }
  backEl.classList.remove('on'); input.blur(); input.readOnly = true;
  const scene = over && cardsReady && cardsReady !== 'failed' ? { vitrine: cardsReady.vitrine, canvas: cardsReady.canvas } : null;
  offer = offerModule().then(m => m.mountOffer({ name: S.validatedName.toUpperCase(), over, onPaid: over ? paidHere : null, scene, nav, onName: { box: () => S.placeBox, go: editName } }))
    .then(o => { offerObj = o; return o.shown.then(() => { cancelAnimationFrame(rafId); rafId = 0; canvas.style.visibility = 'hidden'; names2d?.stop(); names2d = null; fallbackEl.style.display = 'none'; }); })
    .catch(e => { console.error(e); why('offre : ' + (e && e.message)); noCards(); });
}
// (10/10) payé dans la page : sans changer de page, l'offre s'efface et la suite se joue sur la feuille — elle se
// défait, le paquet arrive et tire (la carte face cachée était la sienne) ; un poème offert : comment je l'écris ?
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function paidHere(order) {
  S.paid = order;
  histo.start();
  // (payLater : en attendant le paiement de la fin, « réservation » — il n'est confirmé qu'au paiement, settle)
  setOrder({ ref: order.ref, session: order.session || '', simule: !!order.simule, gift: !!order.gift, reserve: !!order.reserve || !!order.payLater });
  offerObj?.hide();
  const fin = await import('./alt/fin.js');
  let how = 'question';
  if (order.gift) { await sleep(1100); how = order.how = await fin.askHow(order.name); fin.saveOrder(order); }
  if (how === 'lien') {
    send({ name: order.name, kind: 'lien', text: '', id: null, mode: 'poste', address: [] });
    await fin.shareGift(order); order.lien = true; finishPaid(); return;
  }
  // (13/10, Maxence) payé : seulement le jeu — la feuille se défait, le paquet vient au milieu, se mélange et invite à
  // tirer ; le prénom reparaît quand on tire (scene.js). (l'écran « à toi de jouer » est retiré)
  // (10/10) l'adresse (panneau, champ de Stripe, portefeuille) et l'email : la fin les tape seule
  if (cardsReady && cardsReady !== 'failed') {
    cardsReady.afterPay(how, { fields: order.address || null, email: order.email || '' });
    // (18/10, décision 7) le paiement à la fin : l'étape que l'enveloppe demandera au clic sur POSTER (mount.js, api.payStep)
    if (EST_VERSION && order.payLater && !order.settled) {
      cardsReady.payStep = ({ fields }) => offerModule().then(m => m.payAtEnd({ name: order.name, fields })).then(r => { if (r) settle(order, r); return r; });
      cardsReady.walletStep = ({ host, done }) => offerModule().then(m => m.walletAtEnd({ name: order.name, host, done: r => { settle(order, r); done(r); } }));
    }
  }
}
// le paiement de la fin est fait (ou passé, en test) : la commande n'est plus une réservation
function settle(order, r) {
  order.settled = true; order.payLater = false; if (r.simule) order.simule = true; if (r.session) order.session = r.session;
  setOrder({ ref: order.ref, session: r.session || '', simule: !!r.simule, gift: !!order.gift, reserve: false });
  if (!r.simule && r.session) count('alt/paye');       // seulement un vrai paiement
  if (cardsReady && cardsReady !== 'failed') { cardsReady.payStep = null; cardsReady.walletStep = null; }
}
// (18/10, décision 8 ; correctifs C1) L'HISTORIQUE PAR ÉTAPE, dans les versions : pendant la cérémonie (le paquet, la carte
// blanche, la feuille, l'enveloppe, l'email), le bouton retour du navigateur — comme la flèche ← du haut — ramène à l'étape
// d'avant sans rien perdre (la réponse reste sur la carte), au lieu de quitter la page. Une entrée d'historique par étape
// franchie (pushState), maintenues en accord avec l'étape réelle (cardsApi.level) ; un seul chemin pour reculer (stepBack).
const histo = (() => {
  let pushed = 0, internal = 0, waiting = null, timer = 0, on = false;
  const cards = () => (cardsReady && cardsReady !== 'failed' && cardsReady.level ? cardsReady : null);
  const level = () => (cards() ? cards().level() : 0);
  const active = () => on && !!S.paid && !document.querySelector('.mc.fin');
  function sync() {
    if (!active()) return;
    const L = level(), want = Math.max(0, L - 1);
    if (waiting) { if (L !== waiting.L || performance.now() > waiting.until) waiting = null; else return; }   // un retour est en cours : la scène se rembobine
    while (pushed < want) history.pushState({ sgStep: ++pushed }, '');
    if (pushed > want) { internal++; const n = want - pushed; pushed = want; history.go(n); }   // reculé autrement (Échap, flèche de la scène)
  }
  addEventListener('popstate', e => {
    if (internal) { internal--; return; }
    if (!active()) return;
    const landed = e.state && e.state.sgStep != null ? e.state.sgStep : 0;
    if (landed >= pushed) { pushed = landed; return; }
    pushed = landed;
    const L = level(), want = Math.max(0, L - 1);
    if (landed >= want) return;
    const c = cards();
    if (L > 2 && c && c.stepBack()) { waiting = { L, until: performance.now() + 7000 }; return; }
    if (L <= 2) { location.replace(homeUrl(location.search).href); return; }   // la première étape : l'accueil
    history.pushState({ sgStep: want }, ''); pushed = want;                                                // la scène est occupée : on remet l'étape
  });
  return {
    start() { if (!EST_VERSION || on) return; on = true; clearInterval(timer); timer = setInterval(sync, 300); },
    stop() { clearInterval(timer); on = false; if (pushed > 0) { internal++; const n = -pushed; pushed = 0; history.go(n); } },   // la cérémonie finie : une seule sortie
    back() { if (!active() || pushed < 1) return false; history.back(); return true; },
  };
})();
// (18/10, Maxence) ← pendant la cérémonie (la carte, l'enveloppe…) : on quitte la commande, et on le dit. Avant, la page se rechargeait
// vers « ./ » et le site, qui reprend une commande ouverte rechargée (merci.html), renvoyait aussitôt à la cérémonie : le retour
// semblait ne rien faire. Maintenant : un message sur le noir, tapé à la machine, puis l'accueil — sans reprise automatique pour
// une simple réservation (rien n'est parti) ; un vrai paiement, lui, reste repris en revenant.
let leavingCeremony = false;
async function leaveCeremony() {
  if (leavingCeremony) return; leavingCeremony = true;
  const fin = await import('./alt/fin.js'), o = S.paid || {};
  const vrai = !!(o.session && !o.simule && !o.reserve);
  if (!vrai) { const k = fin.readOrder(); if (k) { k.resumed = true; fin.saveOrder(k); } }   // (une réservation : pas de reprise automatique)
  histo.stop();
  await fin.exitScreen(o);
  const home = homeUrl(location.search);
  location.href = home.href;
}
// la fin d'une commande payée ici : c'est noté (rechargée : merci.html, sans seconde demande)
async function finishPaid() {
  const fin = await import('./alt/fin.js'), o = S.paid;
  histo.stop();
  o.done = true; fin.saveOrder(o); count('alt/fini');
  await Promise.race([settled().catch(() => {}), sleep(2500)]);
  if (cardsReady && cardsReady !== 'failed') { cardsReady.canvas.style.transition = 'opacity 1.1s ease'; cardsReady.canvas.style.opacity = '0'; }
  const home = homeUrl(location.search);
  setTimeout(() => fin.finalScreen(o, home.href), 1100);
}

function goBack() {
  if (S.phase === 'offre') return;
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
// (16/10, Maxence : « si on touche le prénom avant que la scène soit finie, on rembobine et on peut le modifier »)
function inBox(b, e) { return b && e.clientX > b[0] && e.clientX < b[2] && e.clientY > b[1] && e.clientY < b[3]; }
document.addEventListener('click', (e) => {
  if (!ALT || S.portal || S.trans == null || S.rw || offer) return;
  if (!(S.cStart == null && inBox(S.nameBox, e)) && !inBox(S.placeBox, e)) return;
  if (S.cStart == null && S.handT == null && S.riseT == null) rewind(); else editName();
});
function rewind() {
  S.rw = true; S.rwFrom = S.t - S.trans;
  clearValidated(); saveSessionName(null);
  count('alt/rembobine');
}
// la transition est revenue à son début : le prénom au centre, le curseur au bout, on peut corriger
function rewound() {
  S.rw = false; S.trans = null; plan = null; S.driftT = null; S.colT = null; S.placeBox = null;
  S.confirmed = false; S.editAt = S.t; S.edit = true; S.editTap = false; S.validatedName = null; S.editing = false;
  input.readOnly = false; input.classList.remove('rest');
  if (!TOUCH) input.focus({ preventScroll: true });
}
// (16/10) de la feuille (ou pendant qu'elle paraît) : on revient au champ pour corriger — la page se refait (la scène
// des cartes ne se défait pas), le prénom s'y retape, le curseur au bout
function editName() {
  if (S.paid || S.editing) return;
  // (17/10, Maxence : « rembobiner, pas de fondu au noir, c'est laid ») depuis la feuille : l'offre s'efface, la feuille
  // aussi, et le prénom fait le chemin inverse — de la colonne à sa place au centre, le champ se rallume ; on corrige
  if (ALT && cardsReady && cardsReady !== 'failed' && cardsReady.redo && renderer && S.trans != null) {
    S.editing = true;
    clearValidated(); saveSessionName(null); count('alt/corrige');
    offerObj?.hide(); offer = null; offerObj = null;
    const cv = cardsReady.canvas;
    Object.assign(cv.style, { transition: 'opacity .55s ease', pointerEvents: 'none' });
    requestAnimationFrame(() => { cv.style.opacity = '0'; });
    setTimeout(() => { cardsReady.redo(); cv.style.mixBlendMode = ''; }, 600);
    if (gl.isContextLost() && S.loseExt) { try { S.loseExt.restoreContext(); } catch { /* */ } }
    canvas.style.visibility = '';
    S.phase = 'input'; S.phaseAt = S.t - 10; S.portal = false;
    S.handT = null; S.cStart = null; S.riseT = null;
    rewind();
    if (!rafId && !gl.isContextLost()) { last = 0; rafId = requestAnimationFrame(frame); }
    return;
  }
  S.editing = true;
  try { sessionStorage.setItem(K_EDIT, S.validatedName || finalName(model.text) || ''); } catch { /* */ }
  clearValidated(); saveSessionName(null); count('alt/corrige');
  const v = document.createElement('div');
  v.style.cssText = 'position:fixed;inset:0;z-index:99;background:#060606;opacity:0;transition:opacity .45s ease;pointer-events:none';
  document.body.appendChild(v); requestAnimationFrame(() => { v.style.opacity = '1'; });
  setTimeout(() => location.replace(location.href), 480);
}
document.addEventListener('click', (e) => {
  if (S.portal || S.phase !== 'input' || S.trans != null || e.target === backEl || backEl.contains(e.target) || nextEl.contains(e.target)) return;
  const b = S.nameBox;
  // seule la zone du prénom / du curseur répond (ailleurs, plus tard : toucher un prénom du champ pour lire son
  // acrostiche) : prénom écrit → aller à la suite ; vide → écrire (le clavier sort)
  const inZone = b && e.clientX > b[0] && e.clientX < b[2] && e.clientY > b[1] && e.clientY < b[3];
  // (17/10, Maxence) téléphone : rien d'écrit, le premier toucher n'importe où ouvre le clavier (sauf le menu, ETERNEL
  // en bas, et ce qui s'ouvre par-dessus)
  if (!inZone && TOUCH && !wheel && !model.text && !S.confirmed && document.activeElement !== input
      && !e.target.closest?.('.nv, .nv-foot, .mn-au, .mn-ct, a, button')) {
    input.readOnly = false; input.classList.remove('rest'); input.focus({ preventScroll: true }); return;
  }
  if (!inZone) return;
  // (17/10, Maxence) ordinateur : cliquer sur PRENOM en grisé le retire — le curseur seul invite à taper
  if (!TOUCH && S.hintVis) S.hintOff = true;
  // le clavier vient de se fermer et la suite allait partir : retoucher le prénom = le corriger (le clavier revient)
  if (blurGo) { clearTimeout(blurGo); blurGo = 0; if (!wheel) { input.readOnly = false; input.classList.remove('rest'); input.focus({ preventScroll: true }); } return; }
  // (16/10) on corrige : le premier toucher ouvre le clavier (le prénom est là, curseur au bout), pas la suite
  if (S.edit && !S.editTap && !wheel) { S.editTap = true; input.readOnly = false; input.classList.remove('rest'); input.focus({ preventScroll: true }); try { input.setSelectionRange(input.value.length, input.value.length); } catch { /* */ } return; }
  if (finalName(model.text) && !bridge.composing) { startTransition(); return; }
  if (!wheel && document.activeElement !== input) { input.readOnly = false; input.classList.remove('rest'); input.focus({ preventScroll: true }); }
});

// le clavier se ferme (« OK » de l'iPhone, Entrée, toucher ailleurs, prénom proposé par le clavier) avec un prénom
// écrit : la suite part (09/10, Maxence) — sauf si l'on retouche le prénom dans la seconde, pour le corriger.
// Pas quand on quitte l'onglet ou l'application, ni pour la flèche retour.
let blurGo = 0, backDown = 0;
backEl.addEventListener('pointerdown', () => { backDown = performance.now(); }, true);
input.addEventListener('focus', () => { if (blurGo) { clearTimeout(blurGo); blurGo = 0; } if (ALT && !S.introOff) { S.introOff = true; S.introEnd = S.t; } });
// (10/10) téléphone : le clavier fermé autrement que par « OK » (bouton retour d'Android, geste) laisse le focus au
// champ : on le libère, et la suite part comme pour « OK »
let vvH = window.visualViewport ? window.visualViewport.height : 0;
window.visualViewport?.addEventListener('resize', () => {
  const h = window.visualViewport.height, grew = h - vvH > 120; vvH = h;
  if (grew && TOUCH && document.activeElement === input && S.phase === 'input' && S.trans == null && !wheel && finalName(model.text) && !bridge.composing) input.blur();
});
input.addEventListener('blur', () => {
  if (!AUTO_GO || S.portal || S.phase !== 'input' || S.trans != null || wheel || !finalName(model.text) || performance.now() - backDown < 600) return;
  clearTimeout(blurGo);
  blurGo = setTimeout(() => {
    blurGo = 0;
    if (document.hidden || !document.hasFocus() || document.activeElement === input || S.portal || S.phase !== 'input' || S.trans != null) return;
    if (bridge.composing) return;
    // (09/10) jamais avant que la dernière lettre du champ se soit allumée : sinon trop rapide
    const go = () => { if (S.portal || S.phase !== 'input' || S.trans != null || document.activeElement === input) return;
      if (renderer && S.t < light.flyAt()) { blurGo = setTimeout(go, 150); return; } blurGo = 0; startTransition(); };
    go();
  }, 1000);
});

// bascule mélange → profondeur → horizontal : Tab ou double-clic (progressive)
const MODE_ORDER = ['melange', 'profondeur', 'horizontal'];
function toggleMode() { CFG.mode = MODE_ORDER[(MODE_ORDER.indexOf(CFG.mode) + 1) % MODE_ORDER.length]; }
// (17/10, correctif C4) dans les versions, Tab n'est plus pris : il fait son travail de Tab (champs, boutons) ; le double-clic reste
window.addEventListener('keydown', (e) => { if (!EST_VERSION && e.key === 'Tab' && !e.altKey && !e.ctrlKey && !e.metaKey) { e.preventDefault(); toggleMode(); } });
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
  fallbackEl.dataset.hint = HINT && S.phase === 'input' && !S.typed && !bridge.shownText ? displayCase('PRENOM', CFG.caseMode) : '';
  const r = fallbackEl.getBoundingClientRect(), cx = innerWidth / 2, cy = innerHeight / 2;
  S.nameBox = r.width > 4 ? [Math.min(r.left, cx - 90) - 30, r.top - 40, Math.max(r.right, cx + 90) + 30, r.bottom + 40]
    : [cx - Math.max(80, 0.2 * innerWidth), cy - 60, cx + Math.max(80, 0.2 * innerWidth), cy + 60];
}

// ---------- parallaxe : translation de caméra, ressort amorti (≈ 0,8 s de retard) ----------
const PAR = { tx: 0, ty: 0, x: 0, y: 0, vx: 0, vy: 0 };
const BR = { p: 0, v: 0 };   // souffle de caméra à chaque frappe (ressort)
const light = createLight({ reduced: CFG.reduced });
// visiteur qui revient : son prénom se tape tout seul à l'arrivée, lettre par lettre (la lumière suit la frappe)
if (stored.name && !stored.validated) { S.typed = true; startReveal(0, OPEN_DARK + (EDIT ? 0.35 : 1.3)); }
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
  // (11/10) doigt vers le haut = avancer, vers le bas = reculer — comme on fait défiler une page (et la molette vers le
  // bas) : partout sur le site, pousser vers le haut fait avancer, tirer vers le bas fait remonter le temps (un seul
  // doigt ; à deux, c'est le zoom)
  let ty = null;
  window.addEventListener('touchstart', (e) => { ty = e.touches.length === 1 ? e.touches[0].clientY : null; }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (ty == null || e.touches.length !== 1) { ty = null; return; }
    const y = e.touches[0].clientY; addBoost((ty - y) * 0.06); ty = y;
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
  const intro = introText();
  const shownRev = intro || revealText(wheel ? wheel.displayText : bridge.shownText);
  const text = displayCase(shownRev, CFG.caseMode);
  // (18/10) l'intro : UN PRENOM / UN POEME sur deux lignes, de la taille de la phrase entière dès la première lettre
  const lvp = { w: S.w, h: S.h, cx, cy: cy0 }, ltext = intro && INTRO_BREAK > 0 ? introLines(text) : text;
  if (intro && INTRO_BREAK > 0) lvp.lock = introLock(lvp);
  const L0 = atlas ? layoutName(ltext, metrics, lvp) : null;
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
  let sceneFade = open, nameFade = FAST_OPEN ? smooth(OPEN_DARK, OPEN_DARK + 0.3, S.t) : smooth(OPEN_DARK + 0.2, OPEN_DARK + 1.2, S.t);
  if (S.phase === 'leaving') { const k = 1 - smooth(0, LEAVE_FADE, S.t - S.phaseAt); sceneFade *= k; nameFade *= k; }
  else if (S.phase === 'black') { sceneFade = 0; nameFade = 0; }
  else if (S.phaseAt > 0) { const k = smooth(0, 1.0, S.t - S.phaseAt); sceneFade *= k; nameFade *= k; }

  const L = layoutName(ltext, metrics, lvp.lock ? { w: S.w, h: S.h, cx, cy, lock: lvp.lock } : { w: S.w, h: S.h, cx, cy });
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
  // (16/10) rembobiner : le temps de la transition remonte (vite, ≈ 1 s quel que soit le point atteint)
  if (S.rw && S.trans != null) {
    const back = dt * (1 + Math.max(1.6, S.rwFrom / 1.0));
    S.trans += back; if (S.driftT != null) S.driftT += back;
    if (S.t - S.trans <= 0) rewound();
  }
  const T = S.trans != null ? S.t - S.trans : -1;
  // (11/10, Maxence : « homogénéiser ») alt : le fond du champ est le même noir uni que toutes les autres pages (6), sans
  // vignette — elle assombrissait les bords jusqu'à 2 : sous le bandeau et SINGULIES (posés sur un noir de 6), deux
  // bandes plus claires se voyaient, comme un cadre
  let R = null, place = here, bright = null, vig = ALT ? 0 : 1, hook = null, camDY = 0;
  if (T >= 0) {
    const lsc = (w, i) => field.letterScreen(w, i, focal, vx, vy);
    if (!plan) {
      plan = CFG.reduced ? { flyers: [], src: new Map(), fed: here.map(() => true), tEnd: 1.2 } : planRecharge({
        words: field.words, letterScreen: lsc, name: here, W: S.w, H: S.h, rng: transRng, mode: CFG.transition,
        level: (w, i, x, y) => {
          const nx = (x - cx) / (S.w / 2), ny = (y - cy) / (S.h / 2);
          return light.level(w.chars[i], w.lp[i], Math.min(1, Math.hypot(nx, ny) / Math.SQRT2), w.z, S.t, nx, ny);
        },
        readyIn: (w, i, x, y) => light.readyIn(w.chars[i], w.lp[i], w.z, S.t, (x - cx) / (S.w / 2), (y - cy) / (S.h / 2)),
        fast: ALT ? 1.4 : 1,
      });
      window.__sg.plan = plan;
    }
    const DRIFT = ALT && !CFG.reduced;
    // (alt) la dérive vers la colonne : elle part pendant que les dernières lettres rechargent le prénom
    if (DRIFT && !S.colT) {
      const ct = columnTargets(S.validatedName.toUpperCase(), S.w, S.h, { adv: ch => atlas.glyphs[ch]?.adv ?? 0.6, capHeight: atlas.capHeight },
        { insetTop: () => NAV_TOP + safeTop(), insetBottom: () => SHEET_INSET + safeBottom(), sheetZoom: SHEET_ZOOM });
      S.colT = ct.length === here.length ? ct : 'non';
    }
    const drifting = DRIFT && Array.isArray(S.colT);
    if (drifting && S.driftT == null && T >= plan.tEnd * DRIFT_AT && !S.rw) S.driftT = S.t;
    const driftEnd = drifting && S.driftT != null ? S.driftT + DRIFT_GAP * (here.length - 1) + DRIFT_T : Infinity;
    // la scène des cartes se prépare quand tout est arrivé et que rien ne bouge (les lettres posées, le champ éteint) ;
    // (alt) d'ordinaire elle est déjà prête (préparée pendant qu'on écrivait), sinon dès le début de la dérive
    if (!S.rw && T >= plan.tEnd && (!drifting || S.t >= driftEnd || S.driftT != null)) loadCards(S.validatedName.toUpperCase());
    // (12/10, Maxence : « on dirait que le site charge ») la feuille paraît PENDANT que le prénom dérive : la scène des
    // cartes part SHEET_LEAD s avant l'arrivée, par-dessus l'accueil en mode « éclaircir » (max des deux images : le fond
    // est le même noir, la feuille paraît sous les lettres qui dérivent) ; chaque lettre de la colonne n'y paraît qu'à
    // l'instant où celle de l'accueil s'y pose
    if (!S.rw && drifting && S.driftT != null && S.cStart == null && cardsReady && cardsReady !== 'failed' && S.t >= driftEnd - SHEET_LEAD) {
      S.cStart = S.t;
      const off = cardsReady.now() - S.t;
      cardsReady.landAt?.(here.map((_, i) => S.driftT + DRIFT_GAP * i + DRIFT_T + off));
      Object.assign(cardsReady.canvas.style, { transition: 'none', mixBlendMode: 'lighten', opacity: '1' });
      cardsReady.start();
    }
    if (!S.rw && drifting && S.handT == null && S.t >= driftEnd + 0.05) {
      if (cardsReady === 'failed') { S.trans = null; plan = null; validate(); return; }
      if (cardsReady && cardsReady.sheet && S.cStart != null && S.t - S.cStart > 0.12) handoff(true);
    }
    const restAt = plan.tEnd + (CFG.reduced ? 0.1 : ALT ? 0.15 : REST);
    if (!S.rw && !drifting && S.riseT == null && T >= restAt) {
      if (cardsReady === 'failed') { S.trans = null; plan = null; validate(); return; }   // pas de cartes : la version simple (image suivante)
      else if (cardsReady) { S.riseT = S.t; S.targets = cardsReady.nameTargets(S.w, S.h); }
    }
    const rise = CFG.reduced ? 0.9 : RISE / ALT_K;
    if (S.riseT != null && S.handT == null && S.t >= S.riseT + rise) handoff();
    if (S.handT != null && S.t - S.handT > HANDOFF + 0.15) { enterScene(); return; }
    if (drifting && S.driftT != null) {
      // le mot pivote d'un quart de tour en devenant colonne (la première lettre monte en haut, la dernière descend),
      // ses lettres restent droites et se resserrent ; son centre glisse en douce courbe jusqu'à celui de la colonne.
      // Personne ne croise personne. À l'arrivée, chaque lettre est exactement à sa place sur la feuille.
      const tg = S.colT, n = here.length;
      const ctr = a => { let x = 0, y = 0; for (const p of a) { x += p.x; y += p.y; } return { x: x / a.length, y: y / a.length }; };
      const c0 = ctr(here), c1 = ctr(tg);
      const sRow = Math.hypot(here[n - 1].x - here[0].x, here[n - 1].y - here[0].y) || 1;
      const sCol = Math.hypot(tg[n - 1].x - tg[0].x, tg[n - 1].y - tg[0].y) || 1, sk = sCol / sRow;
      const rot = (v, a) => ({ x: v.x * Math.cos(a) - v.y * Math.sin(a), y: v.x * Math.sin(a) + v.y * Math.cos(a) });
      const DX = c1.x - c0.x, DY = c1.y - c0.y, DD = Math.hypot(DX, DY) || 1, bowC = DD * 0.18;
      place = here.map((p, i) => {
        const u = clamp01((S.t - S.driftT - DRIFT_GAP * i) / DRIFT_T);
        const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;      // départ et arrivée doux
        const r = { x: p.x - c0.x, y: p.y - c0.y }, r1 = rot(r, Math.PI / 2);
        const t1 = { x: tg[i].x - c1.x - r1.x * sk, y: tg[i].y - c1.y - r1.y * sk };   // le petit écart propre à chaque lettre
        const rr = rot(r, Math.PI / 2 * e), k = 1 + (sk - 1) * e;
        const bow = Math.sin(Math.PI * e) * bowC;                                      // le centre : une courbe douce
        const x = c0.x + DX * e + (-DY / DD) * bow + rr.x * k + t1.x * e, y = c0.y + DY * e + (DX / DD) * bow + rr.y * k + t1.y * e;
        const q = tg[i];
        return { ch: p.ch, x, y, fs: p.fs + (q.fs - p.fs) * e, fsx: p.fs + ((q.fsx || q.fs) - p.fs) * e };
      });
      // (alt : le fond est déjà uni, sans vignette)
    }
    if (!CFG.reduced) {
      const cap = atlas.capHeight;
      R = plan.mode === 'energie'
        ? energyFrame(plan, T, { name: here, capHeight: cap, ecx: (ch) => { const g = atlas.glyphs[ch]; return g ? (g.x0 + g.x1) / 2 : 0.3; },
          src: (fl) => { const p = field.letterScreen(fl.w, fl.i, focal, vx, vy), g = atlas.glyphs[fl.w.chars[fl.i]];
            return { x: p.x + (g.x0 + g.x1) / 2 * p.fs, y: p.y - 0.5 * cap * p.fs, fs: p.fs, blur: sigmaPx(focal, Math.max(0.5, p.z)) }; } })
        : rechargeFrame(plan, T, { world: field.letterWorld, cam: field.cam, f: focal, vx, vy, name: place, capHeight: cap });
      bright = R.bright;
      // (alt) en dérivant, le prénom prend la clarté qu'il aura sur la feuille
      if (drifting && S.driftT != null) { const g = smT(0, 1, clamp01((S.t - S.driftT) / (DRIFT_T + 0.4))); bright = bright.map(b => b + (NAME_GRAY - b) * g); }
    } else bright = here.map(() => 1);
    const tg = S.targets && S.targets.length === here.length ? S.targets : null;
    if (S.riseT != null) {
      const rT = S.riseT + (S.t - S.riseT) * ALT_K;   // (alt : montée plus vive)
      const u = CFG.reduced ? 1 : riseU(rT, S.riseT), gu = CFG.reduced ? 1 : grayU(rT, S.riseT);
      if (tg) place = here.map((p, i) => ({ ch: p.ch, x: p.x + (tg[i].x - p.x) * u, y: p.y + (tg[i].y - p.y) * u, fs: p.fs + (tg[i].fs - p.fs) * u, fsx: p.fs + ((tg[i].fsx || tg[i].fs) - p.fs) * u }));
      bright = bright.map((b) => b + (NAME_GRAY - b) * gu);
      vig = 1 - (CFG.reduced ? smooth(S.riseT, S.riseT + 0.9, S.t) : smT(S.riseT, S.riseT + RISE, rT));
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
  // (16/10) où est le prénom pendant qu'il part (le toucher le rembobine)
  if (T >= 0 && place.length) { const m = (place[0].fs || 30); S.placeBox = [Math.min(...place.map(g => g.x)) - m, Math.min(...place.map(g => g.y)) - 1.6 * m, Math.max(...place.map(g => g.x)) + 1.6 * m, Math.max(...place.map(g => g.y)) + 0.8 * m]; }

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
  // (10/10) pendant que l'onde avance : le fond allumé, les lettres encore à venir partiront une fois allumées ;
  // jamais moins de 2 s après le dernier geste (toucher, souris, molette, touche)
  if (AUTO_GO && canNext && S.t >= Math.max(light.flyAt(), S.confirmedAt + 0.5, S.actAt + 2)) startTransition();
  // (12/10, alt) la scène des cartes se prépare pendant qu'on écrit, à la première pause (le seul instant lourd tombe là,
  // pas pendant la dérive) : la feuille peut ainsi paraître sous les lettres qui y glissent
  if (ALT && !cards && !CFG.reduced && S.phase === 'input' && S.typed && T < 0 && S.t - S.keyAt > 0.8 && finalName(model.text)) loadCards(finalName(model.text).toUpperCase());
  // (10/10) ordinateur : fini d'écrire sans Entrée → après IDLE_GO s sans frappe, la suite (comme « OK » sur téléphone)
  if (!TOUCH && !wheel && !voice && !S.rev && S.phase === 'input' && T < 0 && S.trans == null && S.typed && S.keyAt > Math.max(S.phaseAt, S.editAt ?? -99)
    && finalName(model.text).length >= IDLE_MIN && !bridge.composing && S.t - S.keyAt > IDLE_GO && S.t >= Math.max(light.flyAt(), S.actAt + 2)) startTransition();
  if (CFG.debug) {   // croix au point de fuite
    glyphs.push({ box: [cx - 12, vy - 0.5, cx + 12, vy + 0.5], uv: null, alpha: 0.6, pxEm: 1 });
    glyphs.push({ box: [cx - 0.5, vy - 12, cx + 0.5, vy + 12], uv: null, alpha: 0.6, pxEm: 1 });
  }
  if (wheel && S.phase === 'input') drawWheel(L, glyphs, nameFade);
  if (voice && S.phase === 'input') drawVoice(L, glyphs, nameFade, dt, text);
  // indice (10/10) : rien d'écrit quelques secondes après l'apparition du champ → PRENOM en grisé, le curseur glisse
  // devant ; il s'efface à la première lettre (?indice=0 : jamais)
  if (S.hintT0 == null && S.phase === 'input' && !S.portal && nameFade > 0.99) S.hintT0 = S.t;
  // (alt : ETERNEL tapé puis effacé, le curseur seul, puis le menu ; PRENOM seulement après lui)
  // (alt : le curseur seul — ETERNEL tapé puis effacé —, puis HINT_AFTER_ALT s ; PRENOM se tape à la machine)
  const hintAt = ALT ? (S.hintT0 ?? Infinity) + INTRO_LEN + HINT_AFTER_ALT : (S.hintT0 ?? Infinity) + HINT_AFTER;
  const hintA = HINT && !S.hintOff && Number.isFinite(hintAt) && S.hintT0 != null && S.phase === 'input' && T < 0 && !S.typed && !S.confirmed && !text && !wheel && !voice
    ? smooth(hintAt, hintAt + 1.6, S.t) : 0;
  let hintX = L.cursor.x;
  S.hintVis = hintA > 0.05;
  if (hintA > 0) {
    const H = layoutName(displayCase(HINT_TEXT, CFG.caseMode), metrics, { w: S.w, h: S.h, cx, cy });
    H.glyphs.forEach((g, i) => {
      const gm = atlas.glyphs[g.ch]; if (!gm) return;
      // (alt) à la machine : chaque lettre frappe à son tour (après le glissement du curseur) ; sinon, en fondu
      const k = ALT && !CFG.reduced ? (S.t > hintAt + 0.5 + i * HINT_STRIKE ? 1 : 0) * smooth(hintAt, hintAt + 0.4, S.t) : hintA;
      glyphs.push({ box: [g.x + gm.x0 * g.fs, g.y + gm.y0 * g.fs, g.x + gm.x1 * g.fs, g.y + gm.y1 * g.fs], uv: [gm.u0, gm.v0, gm.u1, gm.v1], alpha: HINT_ALPHA * k * nameFade, pxEm: g.fs });
    });
    hintX = L.cursor.x + (H.lines[0].x0 - H.track * H.fs * 0.5 - L.cursor.x) * (ALT ? smooth(hintAt, hintAt + 0.45, S.t) : smooth(0, 1, hintA));
    const hx0 = Math.min(...H.lines.map(l => l.x0)), hx1 = Math.max(...H.lines.map(l => l.x1));
    S.nameBox = [Math.min(S.nameBox[0], hx0 - 30), Math.min(S.nameBox[1], H.top - 20), Math.max(S.nameBox[2], hx1 + 30), Math.max(S.nameBox[3], H.bottom + 20)];
  }
  // (18/10, Maxence : « si l'utilisateur n'écrit pas ou ne touche pas le curseur, on met l'attention dessus et on écrit une indication ») site
  // principal : le curseur seul, rien tapé, rien touché depuis 10 s (écrire son prénom, on le comprend : c'est pour qui peine) → tout s'assombrit autour de lui, « entre un prénom » se tape dessous
  if (FAST_OPEN) {
    attn = attn || createAttention();
    const stuck = S.phase === 'input' && !!S.introOff && !S.typed && !S.confirmed && !text && T < 0 && !S.portal && !S.edit && S.t > 0;
    const cyc = (L.cursor.y0 + L.cursor.y1) / 2;
    attn.update({ stuck, x: L.cursor.x, y: cyc, r: Math.max(90, Math.min(S.w, S.h) * 0.24), text: 'entre un prénom', delay: 10, below: L.cap * 1.2 + 34 });
  }
  const voiceHidesCursor = voice && !S.voiceTyped && (voice.state === 'idle' || voice.state === 'asking' || voice.state === 'listening');
  // (16/10) on corrige le prénom : le curseur respire au bout, tant qu'on n'a rien tapé
  const editCur = S.edit && !S.rev && S.keyAt <= (S.editAt ?? 0) && T < 0 && !!text;
  // (17/10, Maxence) le curseur reste visible s'il n'y a plus de prénom écrit (tout effacé)
  if (!wheel && !voiceHidesCursor && ((!S.typed && !S.confirmed) || editCur || (!text && T < 0)) && S.phase === 'input') {
    // respiration douce (pas de clignotement sec) : 0,2 → 0,9, période 1,6 s
    const ph = (S.t - OPEN_DARK) / 1.6 * Math.PI * 2;
    // (alt) le curseur s'efface sous UN PRENOM / UN POEME et revient seul quand il s'en va
    const blink = CFG.reduced ? 0.8 : 0.2 + 0.7 * Math.pow(0.5 + 0.5 * Math.cos(ph), 1.6);
    const cw = L.cursor.w;
    glyphs.push({ box: [hintX - cw / 2, L.cursor.y0, hintX + cw / 2, L.cursor.y1], uv: null, alpha: blink * nameFade, pxEm: 1, taper: 0.22 });
  }

  // lumière : diff du prénom → ondes / extinctions ; le champ écoute (souffle + ralentissement)
  const kind = light.update((wheel ? bridge.shownText : shownRev).toUpperCase(), S.t);
  // (11/10) pas pour ETERNEL qui se tape seul à l'ouverture (on voyait le champ avancer puis reculer) : seulement quand on tape
  if (kind && S.phase === 'input' && !CFG.reduced && (S.typed || model.text)) { BR.v += kind > 0 ? 0.015 : 0.008; S.slowAt = S.t; }
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
  // le logo du fond : loin derrière le champ (la parallaxe à peine), imposant ; la lampe rasante tourne lentement autour
  // et suit un peu la souris ; il paraît après l'ouverture, s'efface quand le prénom part
  // le calligramme (voir LOGO_BG) : loin derrière (la parallaxe à peine), à la taille et au gris des prénoms lointains
  const under = [];
  if (LOGO_BG && logoD) {
    const ZL = 33, side = Math.min(S.w * 1.12, S.h * 0.84, 980), mv = CFG.reduced ? 0 : 1;
    const cxL = vx - field.cam.x * focal / ZL, cyL = vy + field.cam.y * focal / ZL, x0 = cxL - side / 2, y0 = cyL - side / 2;
    const fs = Math.max(3.4, side / 112), lh = fs * 1.7, cap = atlas.capHeight;   // (micro-typographie : une trame légère, lignes espacées)
    if (!calli || calli.fs !== fs) calli = { fs, lines: calliLines(fs) };
    const br = 0.9 + mv * 0.1 * Math.sin(S.t * 2 * Math.PI / 11);
    // (17/10, Maxence : « trop visible — organique, discret, visible sans voler la vedette ») plus pâle, trame légère ;
    // NET partout, comme les prénoms lointains : la mise au point de la scène est au fond, où il est (le flou ne dépend
    // que de la profondeur, jamais de la place à l'écran) ; le bord de la forme fondu, irrégulier, qui respire
    const A = LOGO_K * 0.22 * smooth(OPEN_DARK + 1.2, OPEN_DARK + 7, S.t) * (T >= 0 ? 1 - smooth(0, 1.4, T) : 1) * br;
    // (17/10, Maxence) aucun rectangle : curseur seul, le signe entier ; en tapant, un halo doux autour de chaque lettre
    const nameL = text ? place.filter(g => g.ch !== ' ') : [];
    // (17/10, Maxence : « les prénoms qui passent devant ne doivent pas le masquer, comme un prénom devant un autre ? »)
    // la règle du champ : le plus lointain s'efface sous le plus proche (jusqu'à −92 %, bord doux dès 0,6 em) — le
    // calligramme est le plus lointain de tous (les boîtes du champ sont dans son cadre virtuel : + offX)
    const occ = [];
    for (const w of field.words) {
      if (!(w.alpha > 0.05) || !w.box) continue;
      const b0 = w.box[0] + field.offX, b2 = w.box[2] + field.offX, m = 0.6 * (w.pxEm || 10);
      if (b2 + m < x0 || b0 - m > x0 + side || w.box[3] + m < y0 || w.box[1] - m > y0 + side) continue;
      occ.push([b0, w.box[1], b2, w.box[3], m, Math.min(1, w.alpha)]);
    }
    if (A > 0.003) {
      const nL = Math.ceil(side / lh);
      for (let k = 0; k < nL; k++) {
        const L = calli.lines[k % calli.lines.length], yb = y0 + (k + 0.5) * lh + 0.5 * cap * fs, vv = (yb - y0 - 0.5 * cap * fs) / side;
        if (vv < 0 || vv > 1) continue;
        const ym = yb - 0.5 * cap * fs;
        const sh = ((L.ph + L.v * S.t * mv) % L.P + L.P) % L.P;
        // (17/10, Maxence : « disparaître selon l'endroit, une frontière, mais aux bords irréguliers, organiques ») chaque
        // lettre paraît ou s'efface en passant une frontière fixe dans l'espace : le bord du logo, déplacé par un bruit à
        // trois échelles (avancées et creux de ≈ 1 mm, festons plus fins), qui ne dérive que très lentement — certains
        // prénoms débordent ici, s'effacent avant là
        for (let i = 0; i < L.ch.length * 2; i++) {
          {
            const j = i % L.ch.length, c = L.ch[j]; if (c === ' ') continue;
            const gm = atlas.glyphs[c]; if (!gm) continue;
            const x = x0 + L.xs[j] + (i >= L.ch.length ? L.P : 0) - sh;
            if (x < x0 - 2 * fs || x > x0 + side + fs) continue;
            const xc = x + (gm.x0 + gm.x1) / 2 * fs, u = (xc - x0) / side;
            const tt = S.t * mv;
            const irr = 0.62 * Math.sin(u * 4.3 + vv * 2.9 + 0.9 + tt * 0.03) * Math.sin(vv * 3.7 - u * 1.9 + 2.1 - tt * 0.022)
              + 0.34 * Math.sin(u * 11.7 - vv * 6.1 + tt * 0.05) * Math.sin(vv * 9.3 + u * 4.4 - tt * 0.04)
              + 0.14 * Math.sin(u * 27.0 + vv * 19.0 + tt * 0.07);
            const d = (u < 0 || u > 1 ? 2 : dAt(u, vv)) + irr, wa = Math.min(1, Math.max(0, (0.15 - d) / 0.55));
            if (wa <= 0.01) continue;
            let z = 1;
            for (const g of nameL) { const r = Math.hypot(xc - (g.x + 0.35 * g.fs), ym - (g.y - 0.35 * g.fs)) / g.fs; if (r < 1.3) z = Math.min(z, Math.max(0, (r - 0.45) / 0.85)); }
            for (const o of occ) {
              const dx = Math.max(o[0] - xc, 0, xc - o[2]), dy = Math.max(o[1] - ym, 0, ym - o[3]);
              if (dx < o[4] && dy < o[4]) { const q = 1 - Math.max(dx, dy) / o[4]; z = Math.min(z, 1 - 0.92 * o[5] * q * q * (3 - 2 * q)); }
            }
            const a = A * wa * z * grayOf(ZL) * 1.6;
            if (a < 0.003) continue;
            under.push({ box: [x + gm.x0 * fs, yb + gm.y0 * fs, x + gm.x1 * fs, yb + gm.y1 * fs], uv: [gm.u0, gm.v0, gm.u1, gm.v1], alpha: a, pxEm: fs });
          }
        }
      }
    }
  }
  stats.drawCalls = renderer.draw({ w: S.w, h: S.h, dpr: S.dpr, cx, cy, grain: CFG.grain, fade: sceneFade, glyphs, vig, energy: R?.energy, under,
    field: fl, cam: field.cam, focal, vx, vy, dim: S.dim, time: S.t, reveal: FAST_OPEN ? smooth(OPEN_DARK, revealT(), S.t) : 1 });
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
let portal = null, portalGo = null, booted = false, attn = null;
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
// (17/10, Maxence : « recoder le jeu clean, supprimer l'ancienne ») « le jeu » est une vraie page : jeu.html (src/jeu/page.js).
// Question partagée (q=…) : tirée en premier quand on arrive sur le poème (jeuQ)
let jeuQ = P.get('q') != null && /^\d+$/.test(P.get('q')) ? +P.get('q') : null;
const openJeu = () => { location.href = './jeu.html'; };
function mountPortalPage() {
  S.portal = true;
  const go = new Promise(res => { portalGo = res; });
  const ready = new Promise(res => {
    import('./portal/portal.js')
      .then(({ mountPortal }) => SIMPLE === 'all' ? null : mountPortal({ base: './', reduced: CFG.reduced, onReady: res, onPoem: enterFromPortal, onJeu: openJeu }))
      .catch(e => { console.warn('portail', e); why('portail : ' + (e && e.message || e)); document.getElementById('portal')?.remove(); return null; })
      // sans WebGL2 (ou le portail en échec) : le portail en version simple — mêmes cartes, mêmes gestes
      .then(p => p || (why('portail : version simple'), window.dispatchEvent(new CustomEvent('singulies:simple', { detail: { where: 'portail' } })), simpleModule().then(m => m.mountSimplePortal({ onReady: res, onPoem: enterFromPortal, onJeu: openJeu }))))
      .then(p => { portal = p; })
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
    atlas = buildAtlas('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz,', `"${FONT_FAMILY}", serif`, 500);   // (la virgule : UN PRENOM, UN POEME)
    metrics = { adv: (ch) => atlas.glyphs[ch]?.adv ?? 0.6, capHeight: atlas.capHeight };
    renderer = createRenderer(canvas, gl, atlas);
    if (LOGO_BG) loadLogoBg().then(px => { logoD = px; });
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
  else if (!rafId && S.phase !== 'scene' && S.phase !== 'offre' && !S.portal && booted && (!gl || !gl.isContextLost())) { last = 0; rafId = requestAnimationFrame(frame); }
});

// accès de test / mesure
const stats = { drawCalls: 0, gpuMB: 0, letters: 0, warmupMs: 0 };
window.__sg = { stats, model, S, CFG, get cardsApi() { return cardsReady; }, get portal() { return portal; }, get atlas() { return atlas; }, get field() { return field; }, get voice() { return voice; }, validate, submitName, startTransition, goBack, get bridge() { return bridge; } };

fpsMeter();      // ?fps=1 : images par seconde (essais de fluidité)
installCount(PAGE);   // des totaux anonymes (GoatCounter rytrtest1 ; ?envoi=0 ou « Ne pas suivre » : rien)
installSend();   // la demande part par email quand l'enveloppe est postée (ou « en direct »)

// (11/10, Maxence) plus de menu : le bandeau des pages, en haut (src/nav/nav.js) — UN PRENOM UN POEME au centre, relié
// par le fil à MES LIVRES (à gauche) et à UN POEME PAR MOIS (à droite). Jamais sur le champ de prénoms (sauf si l'on
// vient d'arriver par le fil : il s'efface dès qu'on écrit) ; sur la feuille, sauf pendant l'enveloppe et le paiement.
let nav = null;
if (ALT) {
  // (11/10, Maxence) le bandeau dès la page des prénoms ; en bas, SINGULIES sur son fil (seulement là : sur la feuille,
  // le bas est à RECEVOIR) ; les prénoms du champ s'effacent avant d'y passer. Caché pendant le paiement, l'enveloppe et
  // la cérémonie. Plus bas que l'histoire (les autres poèmes) : seulement UN PRENOM UN POEME.
  const ofEl = () => document.querySelector('#offre.on');
  const onNames = () => S.phase === 'input' && !ofEl();
  // (12/10, Maxence) sur le portail des prénoms, le menu est un indice pour qui ne sait pas quoi faire ou cherche une
  // autre page : il paraît après ETERNEL et quelques respirations du curseur (au creux d'une respiration, quand le
  // curseur est pâle : NAV_IDLE s puis le creux suivant) ; une fois paru, il reste (aussi pendant le vol des lettres) ;
  // si l'on a touché pour écrire avant, il ne paraît pas sur cette page
  const NAV_IDLE = 4.0, BREATH = 1.6;
  const idleNames = () => {
    if (!onNames()) return false;
    if (EST_V2) return !!S.introOff;   // (V2) le menu est visible, atténué, dès la fin de l'intro
    if (S.navOn) return true;
    if (S.navNo) return false;
    if (S.typed || document.activeElement === input) { S.navNo = true; return false; }
    if (!S.introOff || S.introEnd == null || S.trans != null) return false;
    // (18/10, Maxence : « quand le curseur apparaît, on fait apparaître UN PRENOM UN POEME avec le menu sous ETERNEL ») site principal :
    // dès que l'intro s'efface et laisse le curseur seul ; les versions gardent l'attente et le creux de respiration
    const t0 = S.introEnd + (EST_VERSION ? NAV_IDLE : 0.1), k = Math.ceil((t0 - OPEN_DARK) / BREATH - 0.5) + 0.5;
    if (EST_VERSION ? S.t >= OPEN_DARK + k * BREATH : S.t >= t0) {
      S.navOn = true; S.navOnAt = S.t;
      // (17/10, Maxence) Android : le clavier s'ouvre de lui-même quand le menu paraît (rien n'est écrit) — l'iPhone
      // ne l'ouvre qu'au toucher (règle de WebKit) : là, le premier toucher n'importe où l'ouvre
      if (ANDROID && !wheel && !model.text && S.phase === 'input' && !S.portal) { input.readOnly = false; input.classList.remove('rest'); input.focus({ preventScroll: true }); }
    }
    return !!S.navOn;
  };
  let barAt = 0, navAt = 0;
  nav = installNav({
    current: 'poeme', base: './',
    host: {
      stage: () => (offerObj ? offerObj.stage() : [canvas, fallbackEl]),
      all: () => (offerObj ? [offerObj.stage()[0], offerObj.root].filter((e, i) => !(i === 0 && e && offerObj.root.contains(e))) : [canvas, fallbackEl]),
      // l'objet : la feuille (la scène) ; sur la page des prénoms, aucun (le champ s'efface et paraît sur place)
      obj: () => { const o = offerObj && offerObj.stage()[0]; return o && !offerObj.root.contains(o) ? [o] : []; },
      rest: () => (offerObj ? [offerObj.root] : [canvas, fallbackEl]),
      objRect: () => { const top = NAV_TOP + safeTop(), bot = innerHeight - SHEET_INSET - safeBottom(); return { cy: (top + bot) / 2, h: (bot - top) * 0.82 }; },
      // ailleurs : le champ s'arrête (comme sous un menu), il reprend au retour
      leave: () => { input.blur(); document.body.classList.add('sg-away'); if (onNames()) { S.portal = true; setTimeout(() => { if (S.portal && S.phase === 'input') { cancelAnimationFrame(rafId); rafId = 0; } }, 700); } },
      back: () => { document.body.classList.remove('sg-away'); if (S.portal) { S.portal = false; if (S.phase === 'input' && booted && !rafId && !document.hidden) { last = 0; rafId = requestAnimationFrame(frame); } } },
    },
    // (12/10, Maxence) sur l'accueil, le bandeau ne montre que UN PRENOM UN POEME (solo), avec SINGULIES en bas ; les
    // autres pages et les aiguilles paraissent avec la feuille
    // (12/10, Maxence : « le portail d'entrée des singuliers ») sur la page des prénoms : rien en haut ni en bas, un
    // fondu au noir vers les bords ; le bandeau et SINGULIES paraissent avec la feuille
    // (12/10, Maxence) sur la feuille, les bandeaux paraissent avec RECEVOIR (après l'exemplaire original), sauf s'ils
    // avaient déjà paru sur le portail
    // (17/10, Maxence : « pourquoi pas de flèche retour ni de bandeau sur l'écran d'après la réservation ? c'est important pour la
    // cohérence et le bon placement ») le haut (ETERNEL, ←, ≡), le bandeau et SINGULIES restent aussi une fois payé / réservé
    // (18/10, Maxence : « je réinterroge la nécessité du menu : juste l'icône ») site principal : plus de bandeau des pages sur l'accueil (le
    // menu ≡ suffit, il paraît quand le curseur est seul) ; le bandeau est là dès qu'on arrive sur la feuille. idleNames() décide quand le ≡ paraît.
    show: () => booted && (onNames() ? (EST_VERSION ? idleNames() : (idleNames(), false)) : ((EST_VERSION && S.navOn) || !!S.paid || !!document.querySelector('#offre.txt2-on, #offre.bar-on'))),
    // (18/10, Maxence : « les bandeaux ETERNEL et SINGULIES d'abord, avec le champ de prénoms, et enfin le menu ») site principal :
    // ETERNEL (haut) et SINGULIES (bas) sont là dès que le champ paraît ; le menu (≡) et les pages sous ETERNEL, quand le curseur paraît
    hdShow: () => booted && (onNames() ? (EST_VERSION ? idleNames() : true) : (S.navOn || !!S.paid || !!document.querySelector('#offre.txt-on, #offre.bar-on'))),
    foot: () => booted && (onNames() ? (EST_VERSION ? idleNames() : true) : (S.navOn || !!S.paid || !!document.querySelector('#offre.txt-on, #offre.bar-on'))),
    // le menu ≡ n'arrive qu'avec les pages (le dernier)
    menuShow: () => !EST_VERSION && (onNames() ? !!S.navOn : true),
    hush: () => !!S.paid || !!document.querySelector('.of.paying, .of.env'),
    // la flèche retour, une fois commandé : l'accueil (la commande est partie ; la cérémonie se reprend en rechargeant, merci.html)
    canBack: () => !!S.paid || !!document.querySelector('.of.paying, .of.env'),
    // (17/10) aussi sur la page du poème une fois qu'on a défilé : les autres prénoms et les questions s'effacent sous ETERNEL et le bandeau
    wideShade: () => onNames(),
    shade: () => booted && ((onNames() && !EST_VERSION) || idleNames() || !!document.querySelector('#offre.scrolled')) && !document.querySelector('.mc.fin'),
    // (12/10) les aiguilles : sur la feuille, une fois l'offre posée (2,5 s après le bandeau du bas) ; la démonstration
    // seulement en haut de la page, sans paiement ni enveloppe
    // (12/10, Maxence) sur la page des prénoms, si le menu paraît (rien n'est écrit), la démonstration part aussi
    // (1,4 s après lui) — une fois par visite : elle ne revient plus sur la feuille
    ready: () => {
      if (EST_V2 && onNames()) return false;   // (V2) pas de démonstration du glissé sur l'accueil
      if (onNames()) { if (!idleNames() || S.typed) { navAt = 0; return false; } if (!navAt) navAt = performance.now(); return performance.now() - navAt > 1400; }
      const on = !!document.querySelector('#offre.on.bar-on'); if (!on) barAt = 0; else if (!barAt) barAt = performance.now(); return on && performance.now() - barAt > 1200;
    },
    // (16/10) les pages voisines se préparent seulement quand l'offre est posée (jamais sur le portail des prénoms)
    // (16/10, Maxence) depuis la feuille, toucher UN PRENOM UN POEME = revenir au champ pour changer de prénom
    redo: () => !onNames() && !S.paid && !document.querySelector('.of.paying, .of.env'),
    onCurrent: () => { if (!onNames() && !S.paid && !document.querySelector('.of.paying, .of.env')) editName(); },
    // (17/10) la flèche retour du haut : d'abord ce qui est ouvert sur la feuille (la vue rapprochée, la suite de la page)
    onBack: () => { if (S.paid) { if (histo.back()) return true; leaveCeremony(); return true; } return !!(offerObj && offerObj.back && offerObj.back()); },
    // (17/10, Maxence : « c'était bien de charger avant ») de nouveau tôt, aussi sur le portail : la préparation ne
    // bloque plus (shaders compilés en parallèle, gl.js programAsync)
    calm: () => !document.querySelector('.of.paying, .of.env') && S.trans == null,
    preAt: 0,
    quiet: () => (onNames() ? !S.typed : !!offerObj && offerObj.top < 30 && !document.querySelector('.of.paying, .of.env')),
    solo: () => !!offerObj && offerObj.top > offerObj.storyLen() + 40,
    side: () => !!document.querySelector('#offre.on.bar-on') && (!offerObj || offerObj.top < 30),
    center: () => { const top = NAV_TOP + safeTop(), bot = innerHeight - SHEET_INSET - safeBottom(); return { y: (top + bot) / 2, h: (bot - top) * 0.82 }; },
  });
  // venue par le fil (rechargement) : le champ entre du côté d'où l'on vient
  nav?.enter([canvas]);
  // le fondu au noir vers les bords de l'écran, tant qu'on est sur les prénoms (il s'efface quand le prénom part)
  const edges = document.createElement('div'); edges.className = 'edge-fade'; edges.setAttribute('aria-hidden', 'true');
  document.body.appendChild(edges);
  setInterval(() => edges.classList.toggle('on', S.phase === 'input' && S.trans == null && !ofEl()), 150);
  window.__nav = nav;   // (essais)
}
if (EST_V2) import('./v2/couche.js').then(m => m.installerCouche()).catch(e => console.warn('V2', e));
boot();
