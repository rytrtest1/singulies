// Scène 2 — question et réponse (04/10). Monde en mm, cartes dans le plan XY face à la caméra.
// Le paquet (au centre, à sa place) tire pour la personne : la carte du dessus se soulève, se retourne en
// l'air et se pose sur le paquet, question visible. Puis une carte réponse (même papier, sans logo) glisse de
// dessous le paquet et n'en dépasse que d'une ligne : le curseur y apparaît et le clavier s'ouvre (page).
// Validée, elle sort dessous (3 lignes, molette / glissé vertical pour relire). Une autre question : glisser
// la question de côté (elle esquisse le geste d'elle-même), le coin corné, ou toucher le paquet ; la carte
// réponse reste sous le paquet. Après une première question passée, la carte blanche (« carte blanche » tapé en
// son centre) monte du bas de l'écran, à moitié visible, et sautille de temps en temps (touche-moi). La toucher :
// elle fait un tour sur elle-même en prenant la place du paquet (qui recule et se fond dans le fond) ; on y écrit ;
// retour (page) = le paquet revient. Sur la carte blanche, PASSER (page) : la fin. Arrivées et départs : fondu
// vers la couleur du fond, jamais vers le noir.
// Lumière : manière 1 (orbite + hauteur) + la carte en focus s'incline vers la souris / le téléphone.
import { createCardRenderer, M4, CARD } from './cardRenderer.js';
import { loadTypeFont, makeInkMap, makeAnswerInk, makeStripInk, STRIP, TYPE, CTYPE } from './ink.js';
import { releaseCanvas } from '../app/compat.js';
import { createNameRelief } from './nameRelief.js';
import { createRng } from '../field/rng.js';
import QUESTIONS from './questions.json';
import { layoutName } from '../name/layout.js';

export const LOOK = {
  // réglé par Maxence sur téléphone (04/10). Cartes noires ; lampe en orbite + hauteur (manière 1, 60 %) ; la
  // carte en focus s'incline vers la souris / le mouvement du téléphone, celle en attente respire et est baissée.
  light: 0.111, lightR: 400, env: 0.28, albedo: 0.029, exposure: 0.9, lightAz: 0.67, lightR0: 1.0, lightZ: 210, tiltAmp: 1.45,
  lightMode: 1, elevAmp: 0.45, flashZ: 70, cardTilt: 0.2, lightVar: 0.6, sway: 0.11, unfocusDim: 0.25, spot: 0.06,
  // respiration de la lampe (05/10) : elle tourne lentement autour des cartes et monte/descend un peu, sans changer
  // de force — ombres, reliefs, creux et bords bougent même sans interaction (rad)
  breathAz: 0.85, breathEl: 0.14, breathFixAz: NaN, breathFixEl: NaN,
  lampGap: 1.22,       // la lampe reste à ≥ 70° du côté du regard (sinon carte délavée)
  elBase: 0.6, elMin: 0.3, elMax: 0.73,   // hauteur de la lampe (rad) : 34° au repos, 17° très rasante ↔ 42° (hauteur d'origine)
  h: 0.19, b: 1.32, crease: 0, fiber: 0.06, foot: 0.76, footW: 0.165, parallax: 0,
  rough: 0.64, spec: 3.1, sheen: 0, glint: 0.35, edge: 3, grain: 1.25, diffRough: 0.65, envSpec: 0.32, toe: 0.0078,
  nameFlat: 0.68,   // prénom à plat, même clarté que sur l'accueil (NAME_REST, 05/10) ; 0 → prénom en relief (nameAlb, nameRelief…)
  nameAlb: 0.5, nameRelief: 0.05, nameBevel: 0.07, nameSpec: 0.4, nameGrain: 1.25, nameFiber: 0.06, nameGlint: 0.35,
  inkAlb: 0.85, inkPress: 0.1, inkWear: 3, inkThr: 0.35, inkVar: 0.6, inkPaper: 11.5, inkOrg: 0,
  cornerDelay: 5,    // s avant que le coin se corne
};
const FOV = 26 * Math.PI / 180;
const TILT = 0.22;
const STACK = 12, PITCH = 0.15;
const RETURN_T = 0.75;
const DRAW_T = 1.5, DISCARD_T = 0.6, ANSWER_T = 1.1, MOVE_T = 0.9;
const LINES = 3;                   // lignes visibles sur la carte réponse

const clamp01 = u => Math.min(1, Math.max(0, u));
const sstep = (a, b, x) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const ease = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
const lerp = (a, b, u) => a + (b - a) * u;
const lerpPose = (a, b, u) => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), z: lerp(a.z, b.z, u), rx: lerp(a.rx, b.rx, u), ry: lerp(a.ry, b.ry, u), rz: lerp(a.rz, b.rz, u) });
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k], norm3 = a => mul3(a, 1 / Math.hypot(...a));
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// lettre sans accent, en capitale (pour faire réagir le prénom aux lettres tapées)
const bare = ch => ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

// toSheet : la fin ne s'éloigne plus dans le noir — la paire (ou la carte blanche) reste où elle est et la scène de la
// feuille (sheet/sheet.js) la reprend, avec le prénom, la caméra et la lampe (snapshot)
// autoWrite : la carte réponse arrivée, le curseur prend la frappe (ordinateur) ; téléphone : non — le clavier ne
// s'ouvre qu'en touchant la carte (08/10 : sur Android il s'ouvrait seul et cachait la carte blanche)
// jeu (09/10) : la page du jeu — mêmes questions, mêmes gestes, sans prénom ; pas de carte blanche ; jeuWrite : la
//   carte réponse (curseur seul, sans invitation) pour répondre à une question qu'on nous a partagée — setJeuWrite(false)
//   la retire (elle se fond), et c'est le jeu seul : des questions, sans réponse à donner
// firstQ : la question tirée en premier (lien partagé, ou venue du jeu) ; noIntro : le paquet est déjà là (relais)
export async function createCardScene(gl, { base = './', seed = (Math.random() * 1e9) >>> 0, look = {}, on = {}, toSheet = false, autoWrite = true, jeu = false, jeuWrite = false, firstQ = null, noIntro = false, firstBack = null } = {}) {
  const card = await createCardRenderer(gl, base);
  const nameR = await createNameRelief(gl, card.paperTex);
  await loadTypeFont(base);
  const L = { ...LOOK, ...look };
  const rnd = createRng(seed);
  const emit = (k, d) => { try { on[k] && on[k](d); } catch (e) { console.error(e); } };

  const order = QUESTIONS.map(q => q.id);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  if (firstQ != null && order.includes(+firstQ)) { order.splice(order.indexOf(+firstQ), 1); order.unshift(+firstQ); }
  if (jeu) autoWrite = false;
  let jw = jeu && jeuWrite, ansOut = 0;            // jeu : la carte réponse (question partagée) ; son effacement
  const variant = () => ({
    seed: rnd() * 100,
    paperXf: [rnd.range(-2.5, 2.5), rnd.range(-1.5, 1.5), rnd() < 0.5 ? 0 : Math.PI, 0],
    logoOff: [rnd.range(-0.15, 0.15), rnd.range(-0.15, 0.15)],
    warp: [rnd.range(0.05, 0.35), rnd.range(-0.2, 0.05), rnd.range(-0.12, 0.12)],
    jx: rnd.range(-0.5, 0.5), jy: rnd.range(-0.4, 0.4), jr: rnd.range(-0.012, 0.012),
  });
  const stack = Array.from({ length: STACK }, variant);
  let next = 0, discards = 0;
  // question : { id, q, v, ink, anim, t0, dur, from, landedAt } ; réponse : { v, ink, text, cursorMM, first, place, anim… }
  // answer : carte réponse de la question (sous le paquet) ; blank : carte vierge (expression libre), en bas
  let question = null, answer = null, blank = null, mode = 'q', lastKeyT = 0, freeT = 0, backT = -1, startT = 0;
  const act = () => (mode === 'free' ? blank : answer);
  let leaving = [];
  let pendingDraw = -1;
  let writing = false, kbPx = 0, kb = 0;
  let ended = null;
  let nameText = '', nameKey = '', glow = [];
  let glowT = [], glowP = [];        // allumage des lettres du prénom : instant, paramètres propres (attaque, descente, force)

  // ---------- disposition ----------
  const lay = { W: 1, H: 1, D: 300, Hw: 100, Ww: 100, yDeck: 0, yAns: -60 };
  function layout(W, H) {
    const portrait = W < H;
    const cardHpx = portrait ? Math.min(W * 0.80 / (CARD.w / CARD.h), H * 0.27) : H * 0.27;
    const cardWpx = cardHpx * CARD.w / CARD.h;
    lay.W = W; lay.H = H;
    lay.D = (CARD.w / cardWpx) * (H / 2) / Math.tan(FOV / 2);
    lay.Hw = 2 * lay.D * Math.tan(FOV / 2); lay.Ww = lay.Hw * W / H;
    lay.yDeck = (0.5 - 0.42) * lay.Hw;               // paquet et question : place d'origine (42 %)
    lay.yAns = (0.5 - 0.76) * lay.Hw;                // carte réponse : dessous
  }
  const FACE_Z = STACK * PITCH + 2.8;                // la carte réponse glisse entre la question et le paquet
  const UNDER_Z = FACE_Z - 1.4;
  const deckPose = (i, v) => ({ x: v.jx, y: lay.yDeck + v.jy, z: i * PITCH, rx: 0, ry: 0, rz: v.jr });
  const centerPose = (v, dx = 0) => ({ x: v.jx * 3 + 1.2 + dx, y: lay.yDeck + v.jy * 2 - 0.8, z: FACE_Z, rx: 0, ry: Math.PI, rz: v.jr * 1.5 + dx * 0.0015 });
  const answerPose = v => ({ x: v.jx, y: lay.yAns + v.jy, z: -0.8, rx: 0, ry: Math.PI, rz: v.jr });
  // carte blanche au repos : en bas de l'écran, son haut vers 82 % (le bas sort de l'écran, le texte au centre
  // reste visible) ; out = rangée sous l'écran ; bob = petit saut « touche-moi » toutes les 4,5 s
  const bob = c => {
    if (!c || c.place !== 'rest' || c.anim || c.out > 0.05 || c.appearT == null || lastT < c.appearT) return 0;
    const ph = (lastT - c.appearT) % 4.5;
    return 3.2 * sstep(0, 0.16, ph) * (1 - sstep(0.16, 0.45, ph)) + 1.1 * sstep(0.45, 0.57, ph) * (1 - sstep(0.57, 0.85, ph));
  };
  const blankRest = (v, out = 0, dy = 0) => ({ x: v.jx, y: (0.5 - 0.91) * lay.Hw - CARD.h / 2 + v.jy - out * (CARD.h + 30) + dy, z: 0, rx: 0, ry: Math.PI, rz: v.jr * 0.6 });
  const visibleStack = () => Math.max(0, Math.min(STACK, QUESTIONS.length - next));

  // ---------- animations ----------
  let dragX = 0, dragging = false;
  let hovId = null, prId = null;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hovA = {}, prA = {}, lift = id => 2.2 * (hovA[id] || 0) - 1.1 * (prA[id] || 0);
  const busy = (c, t) => !!(c && c.anim && t - c.t0 < c.dur);
  // carte réponse : 'peek' (dépasse d'une ligne sous la question, on écrit), 'below' (sortie dessous, validée),
  // 'center' (thème libre, à la place de la question)
  // sous le paquet, ne dépassant que d'une bande d'écriture (au bas moyen de la question posée)
  const peekPose = v => ({ x: 1.2 + v.jx * 0.3, y: lay.yDeck - 0.8 - STRIP + v.jy * 0.3, z: -0.8, rx: 0, ry: Math.PI, rz: v.jr * 0.5 });
  // la question esquisse d'elle-même le geste « glisser de côté » (deux fois au plus, quand on ne tape pas) ; une fois
  // une question passée, plus d'esquisse vers la suivante (08/10) : une seule fois, celle vers la précédente, et un
  // bout de la carte précédente se montre au bord gauche (backHint : 0 → 1 → 0)
  let backHintDone = false, backHint = 0, peekQ = null, dragPeek = 0, peekAt = null;
  function hintX(t) {
    backHint = 0;
    if (!question || question.anim || mode !== 'q' || ended || dragging) return 0;
    const idle = t - Math.max(question.landedAt, lastKeyT) - L.cornerDelay;
    if (idle < 0) return 0;
    const shape = ph => sstep(0, 0.6, ph) * (1 - sstep(1.1, 2.0, ph));
    if (discards > 0) {
      if (!hasPrev() || backHintDone) return 0;
      if (idle > 2.0) { backHintDone = true; return 0; }
      backHint = shape(idle);
      return 7 * backHint;
    }
    const k = Math.floor(idle / 7), ph = idle - 7 * k;
    if (k >= 2) return 0;
    return -7 * shape(ph);                                  // gauche : la suivante
  }
  const restPose = c => c === question ? centerPose(c.v, dragging ? dragX : hintX(lastT))
    : c === blank ? (c.place === 'up' ? { x: 1.2 + c.v.jx * 0.5, y: lay.yDeck - 0.8 + c.v.jy, z: FACE_Z, rx: 0, ry: Math.PI, rz: c.v.jr } : blankRest(c.v, c.out, bob(c)))
    : c.place === 'peek' ? peekPose(c.v) : answerPose(c.v);
  function moveAnswer(t, place) {
    if (!answer || answer.place === place) return;
    answer.from = poseOf(answer, t); answer.place = place; answer.anim = 'move'; answer.t0 = t; answer.dur = MOVE_T;
  }
  function poseOf(c, t) {
    const u = clamp01((t - c.t0) / c.dur);
    if (c.anim === 'slide') {                         // la carte réponse glisse de dessous la question
      const a = c.from, b = restPose(c), e = ease(u), p = lerpPose(a, b, e);
      p.z = a.z; return p;                                     // reste sous la question
    }
    if (c.anim === 'draw' || c.anim === 'answer') {   // soulevée du paquet, retournée en l'air, posée
      const a = c.from, b = restPose(c), up = sstep(0, 0.35, u), down = sstep(0.6, 1, u), e = ease(u);
      const p = lerpPose(a, b, e);
      p.z += (CARD.w / 2 + 8) * (up - down) * 0.9; p.ry = Math.PI * sstep(0.2, 0.7, u); p.rx = -0.12 * (up - down);
      return p;
    }
    if (c.anim === 'undraw') {                        // le retour au portail : le tirage à l'envers, jusqu'au paquet
      const v = 1 - u, a = c.from, b = c.to, up = sstep(0, 0.35, v), down = sstep(0.6, 1, v), e = ease(v);
      const p = lerpPose(a, b, e);
      p.z += (CARD.w / 2 + 8) * (up - down) * 0.9; p.ry = Math.PI * sstep(0.2, 0.7, v); p.rx = -0.12 * (up - down);
      return p;
    }
    if (c.anim === 'return') {                        // une question déjà vue revient de son côté
      if (t < c.t0) return c.from;
      const a = c.from, b = restPose(c), e = ease(u), p = lerpPose(a, b, e);
      p.z = b.z + 4 * (1 - sstep(0.6, 1, u)); return p;
    }
    if (c.anim === 'discard') {
      const a = c.from, e = Math.pow(u, 1.8), s = c.dir || -1;
      return { ...a, x: a.x + s * e * (lay.Ww / 2 + CARD.w * 1.2), y: a.y - 8 * u, z: a.z + 4 * sstep(0, 0.3, u), rz: a.rz + s * 0.3 * e };
    }
    if (c.anim === 'flip') {                          // la carte blanche se soulève, fait un tour sur elle-même, se pose
      const a = c.from, b = restPose(c), e = ease(u), p = lerpPose(a, b, e);
      p.ry = a.ry + (c.place === 'up' ? 2 : -2) * Math.PI * sstep(0.12, 0.85, u);
      p.z += (CARD.w / 2 + 6) * Math.sin(Math.PI * u); p.rx = -0.1 * Math.sin(Math.PI * u);
      return p;
    }
    if (c.anim === 'move') {                          // déplacement de la carte réponse (dessous ↔ bande, centre)
      const a = c.from, b = restPose(c), e = ease(u), p = lerpPose(a, b, e);
      // ne quitte (ou ne rejoint) la hauteur « sous la question » qu'une fois dégagée
      p.z = b.z < a.z ? lerp(a.z, b.z, sstep(0.6, 1, u)) : lerp(a.z, b.z, sstep(0, 0.4, u));
      return p;
    }
    return restPose(c);
  }

  // ---------- questions ----------
  // la frappe d'une question (Canvas 2D + texture) est lourde : la première est préparée d'avance (prepare),
  // pour qu'aucun à-coup ne tombe pendant le premier retournement
  let preQ = null, preA = null;
  function inkQuestion(id, v) {
    const q = QUESTIONS.find(x => x.id === id);
    const qm = makeInkMap(q.q, Math.floor(v.seed * 1000) + id);
    return { id, q: q.q, v, ink: card.makeInk(qm.canvas), margin: qm.margin };
  }
  function prepare() {
    if (preQ || next >= QUESTIONS.length) return;
    preQ = inkQuestion(order[next], stack[stack.length - 1]);
    const v = { ...variant(), noLogo: true };
    preA = { v, cursorMM: makeStripInk('', Math.floor(v.seed * 1000) + 7, preQ.margin).cursor, forId: preQ.id };
  }
  let firstBackUsed = false;
  // relais avec le portail (09/10) : la page du jeu prend le paquet du portail là où il est (px, py : centre écran de
  // sa carte du dessus ; scale : sa taille / la nôtre) et l'amène à sa place pendant que la carte du dessus se
  // retourne sur la première question ('in') ; au retour, l'inverse ('out') : la question se retourne sur le paquet,
  // qui redescend à la place du portail. Une seule scène dessine la carte du début à la fin : aucun fondu.
  let relay = null;
  const backInkOf = v => firstBack ? card.makeInk(makeInkMap(firstBack.label, Math.floor(v.seed * 1000) + 7, firstBack.lines, firstBack.center).canvas) : null;
  // wpx : largeur à l'écran d'une carte du portail (le rapport avec les nôtres se calcule à l'image, quand notre
  // disposition est connue — sinon, avant la première image, la carte partait énorme)
  // light : () => la lumière du portail (lightNow), lue à chaque image
  function relayIn(px, py, wpx, t, light = null, v = null) {
    if (question) { card.freeInk(question.ink); if (question.backInk) card.freeInk(question.backInk); question = null; }   // (une visite précédente)
    firstBackUsed = false;
    relay = { dir: 'in', px, py, wpx, scale: null, t0: t, dur: DRAW_T, off: null, light, v }; pendingDraw = t;
  }
  function relayOut(px, py, wpx, t, done, light = null, v = null) {
    relay = { dir: 'out', px, py, wpx, scale: null, t0: t, dur: DRAW_T, off: null, done, light, v };
    if (jw) setJeuWrite(false);
    writing = false; dragging = false; dragX = 0; pendingDraw = -1;
    if (question) {
      if (!question.backInk) question.backInk = backInkOf(question.v);
      question.to = poseOf(question, t); question.anim = 'undraw'; question.t0 = t; question.dur = DRAW_T;
      question.from = deckPose(visibleStack(), question.v);
    }
  }
  // part du relais (1 = à la place du portail, 0 = à la nôtre)
  function relayK(t) {
    if (!relay) return 0;
    const u = clamp01((t - relay.t0) / relay.dur);
    return relay.dir === 'in' ? 1 - ease(u) : ease(u);
  }
  function makeQuestion(t) {
    if (next >= QUESTIONS.length) return null;
    const id = order[next++];
    let v = stack.pop(); stack.unshift(variant());
    const fromPortal = firstBack && !firstBackUsed && relay && relay.v;
    if (fromPortal) v = { ...v, ...relay.v };   // relais : le papier de la carte du portail
    const Q = preQ && preQ.id === id && !fromPortal ? preQ : inkQuestion(id, v);
    preQ = null;
    // firstBack (le jeu, venu du portail) : la première carte tirée porte au dos « SINGULIES / le jeu », comme la
    // carte du dessus du paquet du portail — c'est elle qui se retourne
    let backInk = null;
    if (firstBack && !firstBackUsed) { firstBackUsed = true; backInk = backInkOf(v); }
    return { ...Q, backInk, anim: 'draw', t0: t, dur: DRAW_T, from: deckPose(STACK - 1, v), landedAt: t + DRAW_T };
  }
  // chaque question garde sa réponse (rien ne passe d'une carte à l'autre)
  const answers = {};
  function showAnswerOf(q) {
    if (!answer) return;
    const txt = (q && answers[q.id]) || '';
    if (answer.text !== txt) setAnswerText(txt);
    if (!txt && answer.place === 'below') moveAnswer(lastT, 'peek');   // pas de réponse : la bande d'écriture
    emit('text', { text: txt });
  }
  // cartes vues : seq (dans l'ordre), cur = la question posée ; on peut revenir en arrière et repartir en avant
  const seq = [];
  let cur = -1;
  function drawNext(t) {
    question = makeQuestion(t);
    if (!question) return;
    seq.length = cur + 1; seq.push({ id: question.id, q: question.q, v: question.v, margin: question.margin }); cur = seq.length - 1;
    showAnswerOf(question); emit('draw', { id: question.id });
  }
  // une carte déjà vue revient de son côté (s = −1 : de la gauche, +1 : de la droite)
  function bringBack(t, k, s) {
    const e = seq[k]; cur = k;
    let Q, fromPeek = null;
    if (peekQ && peekQ.id === e.id) { Q = peekQ; fromPeek = peekAt; peekQ = null; dragPeek = 0; } else Q = inkQuestion(e.id, e.v);
    const rest = centerPose(e.v);
    // (09/10) déjà entrevue au bord gauche : elle repart de là où on la voyait
    question = { ...Q, anim: 'return', t0: t, dur: RETURN_T, from: fromPeek || { ...rest, x: rest.x + s * (lay.Ww / 2 + CARD.w * 1.2), y: rest.y - 8, rz: rest.rz + s * 0.3 }, landedAt: t + RETURN_T };
    showAnswerOf(question);
    emit('draw', { id: question.id });
  }
  const hasPrev = () => cur > 0;
  // dir −1 : la question part à gauche = la suivante (déjà vue : elle revient de la droite ; sinon le paquet tire) ;
  // dir +1 : elle part à droite = la précédente revient de la gauche
  function discard(t, dir = -1, from = null) {
    if (!question || busy(question, t) || ended) return false;
    if (dir > 0 && !hasPrev()) return false;
    if (answer && writing) answers[question.id] = answer.text || '';
    leaving.push({ ...question, anim: 'discard', t0: t, dur: DISCARD_T, dir, from: from || poseOf(question, t) });
    emit('discard', { id: question.id });
    discards++;
    question = null;
    if (dir > 0) bringBack(t + DISCARD_T * 0.25, cur - 1, -1);
    else if (cur < seq.length - 1) bringBack(t + DISCARD_T * 0.25, cur + 1, 1);
    else { pendingDraw = t + DISCARD_T * 0.45; if (answer && answer.text) setAnswerText(''); emit('text', { text: '' }); }
    return true;
  }

  // ---------- la carte réponse ----------
  function makeAnswer(t) {
    const pre = preA && preA.forId === question.id ? preA : null;
    preA = null;
    const v = pre ? pre.v : { ...variant(), noLogo: true };
    const a = { v, ink: null, text: '', cursorMM: null, first: 0, place: 'peek', anim: 'slide', t0: t, dur: 0.8, from: { ...peekPose(v), y: lay.yDeck } };
    a.cursorMM = pre ? pre.cursorMM : makeStripInk('', Math.floor(v.seed * 1000) + 7, question.margin).cursor;
    return a;
  }
  const HINT_ANSWER = 'ta réponse est le thème', HINT_BLANK = 'le thème de ton poème';
  function renderAnswer(c = act()) {
    if (!c) return;
    const sd = Math.floor(c.v.seed * 1000) + 7;
    const mg = c === answer && question ? question.margin : undefined;    // aligné sur la question
    // invitation en grisé tant que rien n'est écrit : la réponse fait le thème du poème ; la carte blanche : son thème
    const hint = jeu ? null : c === blank ? HINT_BLANK : HINT_ANSWER;
    const m = c.place === 'peek' ? makeStripInk(c.text, sd, mg, hint) : makeAnswerInk(c.text, sd, LINES, writing ? null : c.first, mg, hint);
    if (c.ink) card.freeInk(c.ink);
    c.ink = card.makeInk(m.canvas, !!m.hinted); releaseCanvas(m.canvas); c.inkRG = !!m.hinted; c.cursorMM = m.cursor; c.count = m.count;
  }
  function setAnswerText(clean, c = act()) { c.text = clean; c.first = 0; renderAnswer(c); }
  function setText(s) {
    const answer = act();
    if (!answer || !writing) return;
    lastKeyT = lastT;
    const clean = s.toLowerCase().replace(/[’‘`´]/g, "'").replace(/[\r\n\t]/g, ' ').replace(/ {2,}/g, ' ');
    const prev = answer.text || '';
    if (clean === prev) return;
    if (mode === 'q' && question) answers[question.id] = clean;
    if (clean.length > prev.length && clean.startsWith(prev)) {      // lettres du prénom tapées → elles s'éclairent
      for (const ch of clean.slice(prev.length)) { const b = bare(ch); [...nameText].forEach((n, i) => { if (b && n === b) lightName(i); }); }
    }
    setAnswerText(clean);
  }
  function startWriting() {
    const answer = act();
    if (!answer || ended || (jeu && !jw)) return false;
    writing = true;
    if (question && answer.place === 'below') moveAnswer(lastT, 'peek');     // retour dans la bande sous la question
    renderAnswer(); emit('write', {}); return true;
  }
  // Entrée / « terminé » : la carte réponse sort dessous et montre ses trois premières lignes
  function stopWriting() {
    if (!writing) return;
    writing = false;
    const a = act();
    if (a) { a.first = 0; if (a === answer && a.text) moveAnswer(lastT, 'below'); renderAnswer(); }
  }
  // relire : molette / glissé vertical (réponse validée), une ligne à la fois
  function scrollAnswer(dl) {
    const answer = act();
    if (!answer || writing || !answer.text) return;
    const n = answer.count || 1, f = Math.max(0, Math.min(n - LINES, answer.first + dl));
    if (f !== answer.first) { answer.first = f; renderAnswer(); }
  }

  const FLIP_T = 1.2;
  function chooseBlank(t) {
    if (ended || !blank || mode === 'free' || busy(answer, t) || busy(blank, t)) return false;
    if (writing) { writing = false; renderAnswer(answer); }
    mode = 'free'; freeT = t;
    blank.from = poseOf(blank, t); blank.place = 'up'; blank.anim = 'flip'; blank.t0 = t; blank.dur = FLIP_T;
    setAnswerText('', blank);
    startWriting();
    emit('blank', {});
    return true;
  }
  // retour : la carte blanche refait son tour et redescend, le paquet revient
  function back(t) {
    if (mode !== 'free' || ended || busy(blank, t)) return false;
    writing = false;
    mode = 'q'; backT = t;
    blank.from = poseOf(blank, t); blank.place = 'rest'; blank.anim = 'flip'; blank.t0 = t; blank.dur = FLIP_T;
    if (blank.ink) { card.freeInk(blank.ink); blank.ink = null; } blank.text = '';
    if (autoWrite) startWriting();
    return true;
  }
  // la carte blanche s'offre après une première question passée, tant qu'aucune réponse n'est validée
  const choicesOn = () => !jeu && !ended && mode === 'q' && discards >= 1 && !(answer && answer.text && !writing && answer.place === 'below');

  // ---------- lumière (manière 1) + inclinaison de la carte en focus ----------
  const tilt = { x: 0, y: 0 }, ts = { x: 0, y: 0 };
  const breath = { x: 0, y: 0 };      // (réservé ; la respiration de la lampe est calculée ici, voir breathAz / breathEl)
  const lp = { x: Math.cos(L.lightAz), y: Math.sin(L.lightAz), vx: 0, vy: 0 };
  // Lumière cinématique (05/10). Ce qui délave la carte en gris clair, c'est une lampe du même côté que le regard
  // (la caméra la voit presque d'au-dessus, un peu depuis le bas de l'écran) : le papier mat renvoie la lumière vers
  // l'œil et les ombres du gaufrage passent derrière les reliefs. Belle lumière = au-dessus mais rasante, de côté ou
  // de l'arrière. Donc : la lampe orbite librement (respiration + inclinaison) mais reste tenue en douceur hors du
  // secteur du regard (≥ lampGap de part et d'autre), et sa hauteur respire entre très rasante et la hauteur
  // d'origine, jamais au-delà. Force compensée (clarté d'ensemble inchangée) : seuls ombres et reliefs vivent.
  // Respiration : deux sinus lents non synchronisés (≈ 19 s et 9 s ; hauteur ≈ 23 s et 10 s).
  // (mesures : &breathFixAz= / &breathFixEl= figent la respiration, en rad)
  const CAM_AZ = -Math.PI / 2;                       // le regard vient du bas de l'écran
  const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
  const lampBreathAz = t => Number.isFinite(L.breathFixAz) ? L.breathFixAz : L.breathAz * (0.72 * Math.sin(t * 0.33) + 0.28 * Math.sin(t * 0.69 + 1.3));
  const lampBreathEl = t => Number.isFinite(L.breathFixEl) ? L.breathFixEl : L.breathEl * (0.7 * Math.sin(t * 0.27 + 2.1) + 0.3 * Math.sin(t * 0.61 + 0.4));
  const lamp = { a: L.lightAz, va: 0, e: L.elBase, ve: 0 };
  function stepLight(dt) {
    const kk = Math.min(1, dt * 3); ts.x += (tilt.x - ts.x) * kk; ts.y += (tilt.y - ts.y) * kk;
    // orbite : angle compté depuis l'opposé du regard (0 = contre-jour, haut de l'écran), adouci aux limites
    const back = CAM_AZ + Math.PI, lim = Math.PI - L.lampGap;
    let rel = wrapA(L.lightAz + lampBreathAz(lastT) + 1.2 * L.tiltAmp * L.lightVar * ts.x - back);
    rel = lim * Math.tanh(rel / lim);
    // hauteur : rasante ↔ hauteur d'origine, adoucie aux bornes
    const mid = (L.elMin + L.elMax) / 2, half = (L.elMax - L.elMin) / 2;
    let e = L.elBase + lampBreathEl(lastT) + ts.y * L.elevAmp * L.lightVar;
    e = mid + half * Math.tanh((e - mid) / half);
    const w = 2.2, z = 0.85;
    const da = wrapA(back + rel - lamp.a);
    lamp.va += (w * w * da - 2 * z * w * lamp.va) * dt; lamp.a += lamp.va * dt;
    lamp.ve += (w * w * (e - lamp.e) - 2 * z * w * lamp.ve) * dt; lamp.e += lamp.ve * dt;
    lp.x = Math.cos(lamp.a); lp.y = Math.sin(lamp.a);
  }

  let vp = null, eye = null, lastT = 0, focusAns = 0;
  // dernier état dessiné (matrices des cartes, prénom, caméra, lampe) : la feuille reprend la main depuis là
  const snap = { q: null, a: null, b: null, name: null, glow: [], cam: null, lamp: null, ap: null };
  let sheetHidesName = false;
  // coupure du prénom : la même que sur l'accueil (1 ou 2 lignes)
  const nameLines = (text, W, H) => layoutName(text, { adv: nameR.adv, capHeight: nameR.capHeight }, { w: W, h: H, cx: W / 2, cy: H / 2 }).lines.map(l => l.text);
  // prénom : 11 % du haut de l'écran, capitale ≈ 3,4 % de la hauteur (bornée), plan des cartes
  const nameCap = H => Math.min(52, Math.max(26, 0.052 * H)) * 0.66;
  function nameY(eye, cy) {
    const fy = 0.11, ndcY = 1 - 2 * fy, tf = Math.tan(FOV / 2);
    const fwd = norm3(sub3([0, cy, 0], eye)), right = norm3(cross3(fwd, [0, 1, 0])), up = cross3(right, fwd);
    const dir = norm3(add3(fwd, mul3(up, ndcY * tf)));
    const s = -eye[2] / dir[2];
    return eye[1] + dir[1] * s;
  }
  // où le prénom se posera (caméra au repos, sans clavier) : origine de chasse, ligne de base et taille d'un em
  // de chaque lettre, en px écran — l'accueil y conduit son prénom avant de passer la main (aucun saut)
  function nameTargets(text, W, H) {
    layout(W, H);
    const cy = (lay.yDeck + lay.yAns) / 2, Ds = lay.D;
    const e = [0, cy - Ds * Math.sin(TILT), Ds * Math.cos(TILT)];
    const m = M4.mul(M4.perspective(FOV, W / H, Ds * 0.3, Ds * 3), M4.lookAt(e, [0, cy, 0], [0, 1, 0]));
    const L0 = nameR.layout(text.toUpperCase(), 0, nameY(e, cy), nameCap(H) * lay.Hw / H, lay.Ww * 0.86, [], nameLines(text.toUpperCase(), W, H));
    nameKey = '';                                       // la prochaine image refait la vraie mise en page
    const P = (x, y) => { const w = m[3] * x + m[7] * y + m[15]; return [((m[0] * x + m[4] * y + m[12]) / w * 0.5 + 0.5) * W, (0.5 - (m[1] * x + m[5] * y + m[13]) / w * 0.5) * H]; };
    // fsx : l'em en largeur — le plan des cartes est vu un peu de biais, un em y paraît plus large que haut (08/10 : sans
    // lui, les lettres de l'accueil étaient ≈ 2 % trop étroites et le prénom s'élargissait au relais)
    return L0.glyphs.map(g => { const a = P(g.x, g.base), b = P(g.x, g.base + L0.em), c = P(g.x + L0.em, g.base); return { ch: g.ch, x: a[0], y: a[1], fs: a[1] - b[1], fsx: c[0] - a[0] }; });
  }

  function frame(t, dt, W, H) {
    lastT = t;
    layout(W, H);
    if (pendingDraw >= 0 && t >= pendingDraw) { pendingDraw = -1; drawNext(t); }
    // la question suivante se prépare pendant qu'on lit celle-ci (09/10, à-coups sur iPhone X : sa frappe se faisait
    // au moment où la question passée s'envolait) ; la précédente, ramenée de côté, reprend l'encre de l'esquisse
    if (question && !question.anim && !preQ && !dragging && t - question.landedAt > 1.2 && pendingDraw < 0) prepare();
    if (!blank) {
      const v = { ...variant(), noLogo: true };
      blank = { v, ink: null, labelInk: card.makeInk(makeInkMap('carte blanche', Math.floor(v.seed * 1000) + 3).canvas), text: '', cursorMM: null, first: 0, place: 'rest', out: 1, appearT: null };
    }
    // la carte blanche monte du bas (après une question passée) ; elle se range quand une réponse est validée
    const bIn = (answer && !answer.anim && choicesOn()) || mode === 'free' || busy(blank, t);
    if (bIn && blank.appearT == null) blank.appearT = t + 2.2;
    if (!bIn) blank.appearT = null;
    blank.out += ((bIn ? 0 : 1) - blank.out) * Math.min(1, dt * 1.8);
    for (const c of [question, answer, blank]) if (c && c.anim && c.anim !== 'undraw' && t - c.t0 >= c.dur) {   // (le retour au portail : elle reste sur le paquet)
      const first = c === answer && c.anim === 'slide';
      c.anim = null;
      if (first && !ended && mode === 'q' && autoWrite) startWriting();   // la carte réponse vient d'apparaître : curseur, clavier
    }
    // la question est posée et il n'y a pas encore de carte réponse : elle sort du paquet
    if (question && !question.anim && !answer && !ended && (!jeu || jw)) { answer = makeAnswer(t); renderAnswer(answer); }
    // jeu : la carte réponse retirée se fond, puis s'en va
    ansOut += ((jeu && !jw ? 1 : 0) - ansOut) * Math.min(1, dt * 2.5);
    if (answer && jeu && !jw && ansOut > 0.995) { if (answer.ink) card.freeInk(answer.ink); answer = null; }
    leaving = leaving.filter(c => { if (t - c.t0 < c.dur) return true; if (c.ink) card.freeInk(c.ink); if (c.backInk) card.freeInk(c.backInk); return false; });
    stepLight(dt);
    kb += ((writing && kbPx > 40 ? 1 : 0) - kb) * Math.min(1, dt * 4);
    focusAns += (((mode === 'free' || (answer && (writing || (answer.place === 'below' && answer.text)))) ? 1 : 0) - focusAns) * Math.min(1, dt * 3);
    // lettres du prénom tapées : attaque douce, descente lente, chacune à son rythme (comme l'onde de l'accueil)
    for (let i = 0; i < glowT.length; i++) {
      if (glowT[i] == null) { glow[i] = 0; continue; }
      const p = glowP[i], tau = t - glowT[i];
      glow[i] = tau < p.att ? p.k * sstep(0, p.att, tau) : p.k * Math.exp(-(tau - p.att) / p.dec);
      if (glow[i] < 0.004 && tau > p.att) glowT[i] = null;
    }
    const te = ended ? t - ended.t0 : 0;

    // caméra ; clavier ouvert : la carte réponse (à sa taille) au milieu de la partie visible, le reste s'efface
    const vis = 1 - kbPx / H, scale = 1, Hs = lay.Hw, Ds = lay.D;
    const yA = mode === 'free' ? lay.yDeck : lay.yDeck - STRIP / 2;   // la question et la bande (ou la carte blanche montée)
    const cyK = yA - (0.5 - (vis / 2 + 0.05)) * Hs;
    const cy = lerp((lay.yDeck + lay.yAns) / 2, cyK, kb);
    eye = [0, cy - Ds * Math.sin(TILT), Ds * Math.cos(TILT)];
    vp = M4.mul(M4.perspective(FOV, W / H, Ds * 0.3, Ds * 3), M4.lookAt(eye, [0, cy, 0], [0, 1, 0]));

    const k = lay.Hw / 235;
    let qp = question ? poseOf(question, t) : { x: 0, y: lay.yDeck, z: 0 };
    let anp = answer ? poseOf(answer, t) : null, bp = blank ? poseOf(blank, t) : null;
    if (ended) {
      // 1) la carte réponse remonte se glisser sous la question, un peu décalée : une paire (1 s)
      // 2) la paire descend doucement et se fond dans le fond ; le paquet s'efface. Vers la feuille (toSheet) : la
      //    paire reste, la feuille la reprend
      const keep = toSheet && ended.kind !== 'improvisation';
      const u1 = sstep(0, 1.0, te), u2 = keep ? 0 : ease(clamp01((te - 0.9) / 1.6));
      const recede = p => ({ ...p, y: p.y - 26 * u2 });
      if (question && ended.qFrom) qp = recede(lerpPose(ended.qFrom, centerPose(question.v), ease(u1)));
      if (ended.kind === 'reponse' && ended.aFrom) {
        const host = centerPose(question.v);
        const target = { ...host, x: host.x + 1.8, y: host.y - 2.4, z: UNDER_Z, rz: host.rz + 0.025 };
        const p = lerpPose(ended.aFrom, target, ease(u1));
        p.z = lerp(ended.aFrom.z, target.z, sstep(0, 0.35, u1));   // monte d'abord : passe au-dessus du paquet
        anp = recede(p);
      }
      if ((ended.kind === 'theme' || mode === 'free') && ended.aFrom) bp = recede(ended.aFrom);   // la carte vierge écrite s'éloigne seule
    }
    // effleurer (09/10) : la carte sous la souris se soulève un peu, sous le doigt elle s'enfonce — on sent qu'elle répond
    for (const id of ['question', 'answer', 'blank', 'deck']) {
      hovA[id] = (hovA[id] || 0) + ((hovId === id ? 1 : 0) - (hovA[id] || 0)) * Math.min(1, dt * 9);
      prA[id] = (prA[id] || 0) + ((prId === id ? 1 : 0) - (prA[id] || 0)) * Math.min(1, dt * 16);
    }
    if (!ended && !reduced) {
      if (question) qp = { ...qp, z: qp.z + lift('question') };
      if (anp && answer.place !== 'peek') anp = { ...anp, z: anp.z + lift('answer') };   // (glissée sous la question : elle y reste)
      if (bp) bp = { ...bp, z: bp.z + lift('blank') };
    }
    const ap = focusAns > 0.5 ? (mode === 'free' ? bp : anp) || qp : qp;      // carte en focus : la lampe et le projecteur la suivent
    const R = L.lightR0 * lay.Hw, Z = L.lightZ * k, D0 = Math.hypot(R, Z), el0 = Math.atan2(Z, R), ln = Math.hypot(lp.x, lp.y) || 1;
    const el = lamp.e;
    const lightPos = [ap.x + lp.x / ln * D0 * Math.cos(el), ap.y + lp.y / ln * D0 * Math.cos(el), D0 * Math.sin(el)];
    const light = L.light * k * k * Math.sin(el0) / Math.sin(el);
    const spotPos = [ap.x, ap.y + 0.35 * lay.Hw, lay.D * 0.55];
    const sd = [ap.x - spotPos[0], ap.y - spotPos[1], ap.z - spotPos[2]], sl = Math.hypot(...sd);
    const P = { ...L, lightPos, light, spotPos, spotDir: sd.map(x => x / sl), spotI: L.spot * k * k * (sl / 300) ** 2 * (1 - relayK(t)),   // (relais : pas de projecteur au portail)
      spotCosOut: Math.cos(Math.atan(0.62 * CARD.w / sl)), spotCosIn: Math.cos(Math.atan(0.4 * CARD.w / sl)) };

    // la carte en focus s'incline (souris / téléphone), l'autre respire et est baissée
    let crx = -ts.y * L.cardTilt, cry = ts.x * L.cardTilt;
    // relais : l'inclinaison et la lumière du portail au départ, les nôtres à l'arrivée (glissement continu)
    const pl = relay && relay.light ? relay.light() : null, rkL = relayK(t);
    if (pl) { crx = lerp(crx, pl.rx, rkL); cry = lerp(cry, pl.ry, rkL); }
    const group = (px, py, pz, ph, wt) => {
      const sw = L.sway * 0.5 * (1 - wt);
      const rx = crx * wt + sw * (0.6 * Math.sin(t * 0.61 + ph) + 0.4 * Math.sin(t * 1.37 + 2.1 * ph));
      const ry = cry * wt + sw * 1.2 * (0.6 * Math.sin(t * 0.47 + 1.7 * ph) + 0.4 * Math.sin(t * 1.13 + 0.6 * ph));
      const dz = sw * 12 * Math.sin(t * 0.29 + ph);
      return M4.mul(M4.mul(M4.model(0, 0, 0, px, py, pz + dz), M4.model(rx, ry, 0)), M4.model(0, 0, 0, -px, -py, -pz));
    };
    const wQ = 1 - focusAns, wA = focusAns;
    // le paquet (avec la question et la carte réponse) : arrivée = fondu depuis le fond + petite montée ;
    // départ quand la carte blanche prend sa place = il recule et se fond dans le fond ; retour = l'inverse.
    // Fin sans paire : il s'éloigne dans le noir. Jamais d'assombrissement vers le noir (rectangle sur le fond).
    const intro = ease(clamp01((t - startT) / 1.4));
    const qVis = mode === 'free' ? 1 - ease(clamp01((t - freeT) / 0.9)) : backT >= 0 ? ease(clamp01((t - backT - 0.2) / 0.9)) : 1;
    const Gq0 = group(0, lay.yDeck, 0, 0.0, ended ? 0 : wQ);
    let Gq = M4.mul(M4.model(0, 0, 0, 0, 6 * (1 - qVis), -30 * (1 - intro) - 140 * (1 - qVis)), Gq0);
    const rk = relayK(t);
    // retour : vue par la tranche (au milieu de son retournement), la question prend le papier de la carte du portail,
    // qui la remplacera à l'arrivée (aucun changement de texture visible)
    if (relay && relay.dir === 'out' && relay.v && !relay.swapped && question && question.anim === 'undraw' && (t - question.t0) / question.dur >= 0.55) {
      relay.swapped = true;
      const { seed, paperXf, logoOff, warp } = relay.v;
      question.v = { ...question.v, seed, paperXf, logoOff, warp };
      if (question.backInk) card.freeInk(question.backInk);
      question.backInk = backInkOf(question.v);
    }
    if (relay) {
      // décalage (monde) qui pose le haut de notre paquet exactement sur la carte du portail (résolu une fois)
      if (relay.scale == null) { const mine = CARD.w * W / lay.Ww; relay.scale = relay.wpx > 0 && mine > 0 ? Math.min(2, Math.max(0.5, relay.wpx / mine)) : 1; }
      if (!relay.off) {
        const top = [0, lay.yDeck, STACK * PITCH], sW = lay.Ww / W;
        let ox = 0, oy = 0;
        for (let i = 0; i < 6; i++) {
          const x = top[0] + ox, y = top[1] + oy, z = top[2];
          const cx = vp[0] * x + vp[4] * y + vp[8] * z + vp[12], cyy = vp[1] * x + vp[5] * y + vp[9] * z + vp[13], cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
          const sx = (cx / cw * 0.5 + 0.5) * W, sy = (0.5 - cyy / cw * 0.5) * H;
          ox += (relay.px - sx) * sW; oy -= (relay.py - sy) * sW / Math.cos(TILT);
        }
        relay.off = [ox, oy];
      }
      const sc = 1 + (relay.scale - 1) * rk, cx0 = relay.off[0] * rk, cy0 = lay.yDeck + relay.off[1] * rk;
      const S = new Float32Array([sc, 0, 0, 0, 0, sc, 0, 0, 0, 0, sc, 0, cx0 - sc * 0, cy0 - sc * lay.yDeck, 0, 1]);
      Gq = M4.mul(S, Gq);
      if (pl) {
        const top = [0, lay.yDeck, STACK * PITCH], g = Gq;
        const c = [g[0] * top[0] + g[4] * top[1] + g[8] * top[2] + g[12], g[1] * top[0] + g[5] * top[1] + g[9] * top[2] + g[13], g[2] * top[0] + g[6] * top[1] + g[10] * top[2] + g[14]];
        P.lightPos = P.lightPos.map((v, i) => lerp(v, c[i] + pl.rel[i] * sc, rkL));
        P.light = lerp(P.light, pl.light, rkL);
      }
      // retour fini : le paquet reste à la place du portail (relay gardé, figé) jusqu'à ce que la couche soit vidée —
      // sinon, pendant les images qui suivent, il revenait à notre place (une carte droite au niveau de la première)
      if (t - relay.t0 >= relay.dur && !relay.fin) { const d = relay.done; if (relay.dir === 'out') relay.fin = true; else relay = null; d && d(); }
    }
    const Ga = !ended && answer && answer.place === 'below' && !answer.anim ? group(0, lay.yAns, 0, 2.3, wA) : Gq;
    const Gb = !ended && blank && blank.place === 'up' && !blank.anim ? group(0, lay.yDeck, 0, 2.3, wA) : group(0, bp ? bp.y : 0, 0, 4.1, 0);
    const endFade = ended && !(toSheet && ended.kind !== 'improvisation') ? 1 - sstep(0.15, 1, ease(clamp01((te - 0.9) / 1.6))) : 1;   // la carte se fond en descendant
    const deckFade = ended ? 1 - sstep(0.3, 1.6, te) : 1;           // le paquet s'efface pendant que la paire part
    const vq = intro * Math.pow(qVis, 1.5);
    const fadeD = vq * deckFade * endFade;
    const fadeQ = vq * (ended && ended.kind !== 'reponse' ? deckFade : 1) * endFade;
    const fadeB = (ended && mode === 'q' ? deckFade : 1) * endFade;
    const dimQ = ended ? 1 : 1 - L.unfocusDim * (1 - wQ), dimA = ended ? 1 : 1 - L.unfocusDim * (1 - wA);
    const dimB = ended ? 1 : mode === 'free' ? dimA : 1 - L.unfocusDim;
    gl.enable(gl.DEPTH_TEST);
    const model = (G, p) => M4.mul(G, M4.model(p.rx, p.ry, p.rz, p.x, p.y, p.z));
    const occQ = question && mode === 'q' && qVis > 0.99 ? { x: qp.x, y: qp.y, z: qp.z, rz: qp.rz } : null;
    // paquet (d'un bloc avec la question posée dessus)
    const n = fadeD > 0.01 ? visibleStack() : 0;
    // tirage : la carte tirée part de la place du dessus, et le paquet (une carte de moins dessus, une de plus
    // dessous) a d'abord sa nouvelle carte du dessus à cette même hauteur — les deux se confondaient une image
    // (croix d'ombre). Il est donc d'abord un cran plus bas, et remonte pendant que la carte est en l'air.
    const drawU = question && question.anim === 'draw' ? clamp01((t - question.t0) / question.dur) : 1;
    const drop = 1 - sstep(0.2, 0.5, drawU);
    for (let i = 0; i < n; i++) {
      const v = stack[STACK - n + i], p = deckPose(i, v);
      p.z -= drop * PITCH;
      if (i === n - 1 && !ended && !reduced) p.z += lift('deck');
      card.draw(vp, eye, P, { model: model(Gq, p), lod: i === n - 1 && drop < 0.5 ? 'fine' : 'coarse', shade: (0.55 + 0.45 * (i + 1) / n) * dimQ, fade: fadeD, occ: ended ? null : occQ, ...v });
    }
    for (const c of leaving) card.draw(vp, eye, P, { model: model(Gq, poseOf(c, t)), lod: 'fine', ink: c.ink, shade: dimQ, fade: fadeQ, ...c.v });
    // l'esquisse « revenir » : un bout de la carte précédente se montre au bord gauche
    // la précédente, prête d'avance (son encre) dès qu'elle existe : l'esquisse « revenir », et (09/10) quand on
    // glisse la question vers la droite, elle revient un peu du bord gauche, avec le doigt — on comprend ce qui va arriver
    if (hasPrev() && mode === 'q' && !ended && question && !question.anim && !peekQ && t - question.landedAt > 0.8) { const e = seq[cur - 1]; peekQ = inkQuestion(e.id, e.v); }
    { const want = dragging && dragX > 0 && hasPrev() ? clamp01(dragX / (0.22 * lay.Ww)) : 0; dragPeek += (want - dragPeek) * Math.min(1, dt * 12); }
    if (peekQ && (ended || !question || seq[cur - 1]?.id !== peekQ.id) && backHint <= 0 && dragPeek < 0.001) { card.freeInk(peekQ.ink); peekQ = null; }
    if (peekQ && (backHint > 0.001 || dragPeek > 0.001) && fadeQ > 0.01) {
      const rest = centerPose(peekQ.v), off = { ...rest, x: rest.x - (lay.Ww / 2 + CARD.w * 1.2), y: rest.y - 8, rz: rest.rz - 0.3 };
      const show = { ...rest, x: -lay.Ww / 2 + 13 - CARD.w / 2, y: rest.y - 3, rz: rest.rz - 0.08 };
      const k = Math.max(backHint, dragPeek), to = dragPeek > backHint ? { ...show, x: show.x + 16 * dragPeek, rz: show.rz + 0.04 * dragPeek, z: (show.z || 0) - 1.5 } : show;   // (sous la question : pas de chevauchement)
      peekAt = lerpPose(off, to, k);
      card.draw(vp, eye, P, { model: model(Gq, peekAt), lod: 'fine', ink: peekQ.ink, shade: dimQ, fade: fadeQ, ...peekQ.v });
    } else peekAt = null;
    if (question && fadeQ > 0.01) {
      // coin supérieur droit légèrement corné (09/10) : tant qu'aucune question n'a été passée, seulement après les deux
      // esquisses « suivante » (hintX : à cornerDelay puis + 7 s, sans frappe entre-temps) ; une fois une question
      // passée, le geste est appris : le coin est là dès que la carte est posée. Une fois corné, il le reste.
      const idleFor = question.anim ? -1 : t - question.landedAt;
      const quiet = question.anim ? -1 : t - Math.max(question.landedAt, lastKeyT);
      if (!question.anim && (discards > 0 ? idleFor > 0.6 : quiet > L.cornerDelay + 9.2)) question.curlOn = true;
      const on = question.curlOn && !ended && mode === 'q' ? 1 : 0;
      question.curlA = (question.curlA || 0) + (on - (question.curlA || 0)) * Math.min(1, dt * 1.5);
      const lift = -0.3 * question.curlA;                          // vers la caméra (carte retournée)
      card.draw(vp, eye, P, { model: (snap.q = model(Gq, qp)), lod: 'fine', ink: question.ink, inkBack: question.backInk || null, shade: dimQ, fade: fadeQ, ...question.v, curl: [-1, 1, lift] });
    }
    if (answer && fadeQ > 0.01) {
      const cur = mode === 'q' && !busy(answer, t) && (writing || !answer.text) && !ended ? cursorAt(answer.cursorMM, t) : {};
      card.draw(vp, eye, P, { model: (snap.a = model(Ga, anp)), lod: 'fine', ink: answer.ink, shade: mode === 'free' ? dimQ : dimA, fade: fadeQ * (1 - ansOut), occ: answer.place === 'peek' && !ended ? occQ : null, ...answer.v, ...cur, inkRG: !!answer.inkRG });
    }
    if (blank && blank.out < 0.999 && fadeB > 0.01) {
      // « carte blanche » tapé au recto tant qu'elle attend ; pendant son tour, l'encre change quand le recto est caché
      const fu = blank.anim === 'flip' ? sstep(0.12, 0.85, clamp01((t - blank.t0) / blank.dur)) : 1;
      const label = blank.anim === 'flip' ? (blank.place === 'up' ? fu < 0.5 : fu >= 0.5) : blank.place === 'rest';
      const cur = mode === 'free' && !busy(blank, t) && (writing || !blank.text) && !ended ? cursorAt(blank.cursorMM || { x: 10, y: CARD.h / 2 - TYPE.lead + 1.2 }, t) : {};
      card.draw(vp, eye, P, { model: (snap.b = model(Gb, bp)), lod: 'fine', ink: label ? blank.labelInk : blank.ink, inkRG: !label && !!blank.inkRG, shade: dimB, fade: fadeB, ...blank.v, ...cur });
    }
    // prénom (à plat, en retrait) ; ses lettres s'éclairent quand on les tape ; tout s'allume à la fin
    if (nameText) {
      const py = nameY(eye, cy);
      const g = [...nameText].map((_, i) => Math.max(glow[i] || 0, ended ? sstep(0.9 + i * 0.12, 1.5 + i * 0.12, te) * 0.9 : 0));
      const key = nameText + W + 'x' + H + Math.round(py * 10) + Math.round(scale * 100) + g.map(x => x.toFixed(2)).join();
      if (key !== nameKey) {
        snap.name = nameR.layout(nameText, 0, py, nameCap(H) * Hs / H, lay.Ww * scale * 0.86, g, nameLines(nameText, W, H));
        nameKey = key;
      }
      if (kb > 0.02) gl.disable(gl.DEPTH_TEST);           // clavier ouvert : le prénom reste devant
      if (!sheetHidesName) nameR.draw(vp, eye, P, L, fadeQ > 0.5 ? occQ : null, t);
      gl.enable(gl.DEPTH_TEST);
      snap.glow = g;
    }
    snap.cam = { cy, D: Ds, eye, vp, Hw: lay.Hw, W, H }; snap.lamp = { ...lamp }; snap.ap = { x: ap.x, y: ap.y, z: ap.z || 0 };
    if (ended && !ended.done && toSheet && te > (ended.kind === 'improvisation' ? 1.5 : 1.15)) { ended.done = true; emit('end', { kind: ended.kind, text: ended.text, id: ended.id }); }
    if (ended && !ended.done && te > 2.9) { ended.done = true; emit('end', { kind: ended.kind, text: ended.text, id: ended.id }); }
  }
  // curseur à une position (mm depuis le coin haut-gauche de la face lue, recto) : trait fin qui respire
  function cursorAt(cm, t) {
    const a = 0.55 + 0.4 * Math.sin(t * 2.4);
    return { cursor: [CARD.w / 2 - cm.x, CARD.h / 2 - cm.y - 0.8, CTYPE.size * 0.92, a], cursorFace: 1 };
  }

  // ---------- sélection ----------
  function screenQuad(p) {
    const mvp = M4.mul(vp, M4.model(p.rx, p.ry, p.rz, p.x, p.y, p.z));
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
      const x = sx * CARD.w / 2, y = sy * CARD.h / 2;
      const cx = mvp[0] * x + mvp[4] * y + mvp[12], cy = mvp[1] * x + mvp[5] * y + mvp[13], cw = mvp[3] * x + mvp[7] * y + mvp[15];
      return [(cx / cw * 0.5 + 0.5) * lay.W, (0.5 - cy / cw * 0.5) * lay.H];
    });
  }
  const inside = (q, x, y) => {
    let s = 0;
    for (let i = 0; i < 4; i++) {
      const [ax, ay] = q[i], [bx, by] = q[(i + 1) % 4], c = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
      if (c !== 0) { if (s === 0) s = Math.sign(c); else if (Math.sign(c) !== s) return false; }
    }
    return true;
  };
  const rectOf = q => { const xs = q.map(p => p[0]), ys = q.map(p => p[1]); return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) }; };
  function hit(x, y) {
    if (!vp) return null;
    if (mode === 'free' || (backT >= 0 && lastT - backT < 0.8)) return mode === 'free' && blank && inside(screenQuad(poseOf(blank, lastT)), x, y) ? 'blank' : null;
    if (question && inside(screenQuad(poseOf(question, lastT)), x, y)) return 'question';
    if (answer && ansOut < 0.5 && inside(screenQuad(poseOf(answer, lastT)), x, y)) return 'answer';
    if (blank && blank.out < 0.5 && inside(screenQuad(poseOf(blank, lastT)), x, y)) return 'blank';
    const n = visibleStack();
    if (n && inside(screenQuad(deckPose(n - 1, stack[STACK - 1])), x, y)) return 'deck';
    return null;
  }
  function nearCorner(x, y) {          // le coin supérieur droit (à l'écran) de la question
    const q = screenQuad(poseOf(question, lastT));
    let best = q[0]; for (const p of q) if (p[0] - p[1] > best[0] - best[1]) best = p;
    const w = Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]);
    return Math.hypot(x - best[0], y - best[1]) < w * 0.2;
  }
  // rectangles écran (px CSS) : la question (zone où la souris laisse la carte droite) ; la carte en focus ;
  // la carte réponse (la page place le signe « donner » dessous)
  function cardRect() { if (!vp) return null; const c = focusAns > 0.5 ? act() : question; return c ? rectOf(screenQuad(poseOf(c, lastT))) : rectOf(screenQuad(deckPose(STACK - 1, stack[STACK - 1]))); }
  // bas de la place « réponse sortie » (repos, sans animation) : PASSER se fixe dessous, sans jamais bouger
  function restBottom() { return vp ? rectOf(screenQuad(answerPose({ jx: 0, jy: 0, jr: 0 }))).bottom : null; }
  // repères fixes (repos) pour la page : bas de la bande d'écriture, haut de la carte vierge
  function marks() {
    if (!vp) return null;
    const z = { jx: 0, jy: 0, jr: 0 };
    return { peekBottom: rectOf(screenQuad(peekPose(z))).bottom, blankTop: rectOf(screenQuad(blankRest(z))).top, deckBottom: rectOf(screenQuad(centerPose(z))).bottom };
  }
  function lowestBottom() {
    if (!vp) return null;
    let b = 0;
    for (const c of [question, answer]) if (c) b = Math.max(b, rectOf(screenQuad(poseOf(c, lastT))).bottom);
    return b || null;
  }
  // partie visible de la carte réponse (sous la question quand elle n'en dépasse que d'une ligne)
  function activeRect() {
    const answer = act();
    if (!answer || !vp) return null;
    const r = rectOf(screenQuad(poseOf(answer, lastT)));
    if (answer.place === 'peek') r.top = Math.max(r.top, question ? rectOf(screenQuad(poseOf(question, lastT))).bottom : r.top);
    return r;
  }

  // ---------- gestes ----------
  function tap(x, y, t) {
    if (ended) return { type: null };
    const h = hit(x, y);
    if (mode === 'free') {
      if (h === 'blank') return startWriting() ? { type: 'write' } : { type: null };
      return { type: null };
    }
    if (h === 'blank') return chooseBlank(t) ? { type: 'write' } : { type: null };
    if (h === 'question' && nearCorner(x, y)) return discard(t, 1) ? { type: 'discard' } : { type: null };
    if (h === 'answer') return startWriting() ? { type: 'write' } : { type: null };
    if (h === 'deck' && question) return discard(t, -1) ? { type: 'discard' } : { type: null };
    return { type: null };
  }
  function drag(dx) { if (question && !busy(question, lastT) && !ended && mode === 'q') { dragging = true; dragX = dx * lay.Ww / lay.W; } }
  function release(dx, vx, t) {
    if (!dragging) return { type: null };
    const from = question ? poseOf(question, t) : null;
    dragging = false;
    const far = Math.abs(dx) > lay.W * 0.22 || Math.abs(vx) > 0.6;
    dragX = 0;
    if (far) return discard(t, Math.sign(dx) || -1, from) ? { type: dx > 0 ? 'previous' : 'discard' } : { type: 'cancel' };
    return { type: 'cancel' };
  }
  function give(t) {
    const a = act();
    if (!a || !a.text || ended) return false;
    writing = false;
    const theme = mode === 'free';
    ended = { t0: t, kind: theme ? 'theme' : 'reponse', text: a.text, id: theme ? null : question?.id ?? null,
      qFrom: !theme && question ? { ...poseOf(question, t), v: question.v } : null, aFrom: poseOf(a, t) };
    return true;
  }
  // PASSER : la fin (improvisation depuis le prénom) ; tout s'efface, le prénom s'allume
  function pass(t) {
    if (ended) return null;
    writing = false;
    ended = { t0: t, kind: 'improvisation', qFrom: null, aFrom: mode === 'free' ? poseOf(blank, t) : null };
    return 'end';
  }

  function start(t) { startT = noIntro ? t - 10 : t; pendingDraw = t + (noIntro ? 0.3 : 1.1); }
  function drawAt(t) { if (!question) pendingDraw = t; }          // le premier tirage, à l'instant voulu (relais du portail)      // le paquet arrive (fondu), puis il tire
  // retour depuis la feuille : la scène revient telle qu'on l'a laissée (question, réponse, carte blanche), en
  // fondu depuis le fond ; les lettres du prénom, revenues d'elles-mêmes à leur place, redescendent au repos
  function reopen(t) {
    if (!ended) return;
    const kind = ended.kind; ended = null; startT = t; sheetHidesName = false; nameKey = '';
    if (kind === 'improvisation' && mode === 'free') { backT = -1; }
    for (let i = 0; i < nameText.length; i++) { glowP[i] = { att: 0.001, dec: 1.8 + 0.6 * rnd(), k: 0.9 }; glowT[i] = t; }
  }
  function snapshot() {
    const kind = ended ? ended.kind : null;
    return {
      kind, text: ended?.text || '', id: ended?.id ?? null,
      question: question && kind === 'reponse' ? { id: question.id, q: question.q, v: question.v, margin: question.margin, ink: question.ink, M: snap.q } : null,
      answer: answer && kind === 'reponse' ? { v: answer.v, text: answer.text, M: snap.a } : null,
      blank: blank && kind === 'theme' ? { v: blank.v, text: blank.text, labelInk: blank.labelInk, M: snap.b } : null,
      name: nameText, glyphs: snap.name ? snap.name.glyphs : [], em: snap.name ? snap.name.em : 1, glow: snap.glow.slice(),
      cam: snap.cam, lamp: snap.lamp, ap: snap.ap, ts: { ...ts },
    };
  }
  function hideName(on) { sheetHidesName = on; }
  function setName(s) { nameText = (s || '').toUpperCase(); nameKey = ''; glow = []; glowT = []; glowP = []; }
  // une lettre du prénom s'allume (si elle l'est déjà, elle repart de sa clarté actuelle, sans saut)
  function lightName(i) {
    const cur = glow[i] || 0, k = 0.75 + 0.25 * rnd();
    const att = 0.35 + 0.5 * rnd();
    glowP[i] = { att, dec: 1.6 + 2 * rnd(), k };
    glowT[i] = lastT - att * Math.asin(Math.min(1, cur / k)) / (Math.PI / 2);   // reprise approchée sur la montée
  }
  function setTilt(x, y) { tilt.x = Math.max(-1, Math.min(1, x)); tilt.y = Math.max(-1, Math.min(1, y)); }
  function setKeyboard(px) { kbPx = px; }
  function setJeuWrite(on) { jw = jeu && !!on; if (!jw) writing = false; }
  function setBreath(x, y) { breath.x = x; breath.y = y; }
  return {
    frame, tap, drag, release, give, pass, back, start, prepare, reopen, snapshot, hideName, renderer: card, nameR, setName, hitAt: (x, y) => hit(x, y), setHover: id => { hovId = id || null; }, setPress: id => { prId = id || null; }, setTilt, setBreath, setKeyboard, setText, startWriting, stopWriting, scrollAnswer, setJeuWrite, drawAt, relayIn, relayOut, relaying: () => !!relay && !relay.fin,
    activeRect, cardRect, lowestBottom, restBottom, marks, chooseBlank, nameTargets,
    // idle : secondes sans frappe depuis que la question est posée (« passer » n'apparaît qu'après un moment)
    state: () => ({ freeFor: mode === 'free' ? lastT - freeT : 0, hasPrev: hasPrev(), idle: mode === 'free' ? lastT - Math.max(freeT + FLIP_T, lastKeyT) : question && !question.anim ? lastT - Math.max(question.landedAt, lastKeyT) : 0, writing, mode, kb: kb > 0.3, choices: choicesOn() && !!answer && !answer.anim, active: act() ? { kind: mode === 'free' ? 'blank' : 'question', id: question?.id, text: act().text } : null, ended: !!ended, discards, offered: false }),
    look: L, layout: lay,
  };
}
