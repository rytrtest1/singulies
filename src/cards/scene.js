// Scène 2 — question et réponse (04/10). Monde en mm, cartes dans le plan XY face à la caméra.
// Le paquet (au centre, à sa place) tire pour la personne : la carte du dessus se soulève, se retourne en
// l'air et se pose sur le paquet, question visible. Puis une carte réponse (même papier, sans logo) sort du
// paquet et se pose dessous : le curseur y apparaît et le clavier s'ouvre (page). On écrit : trois lignes
// visibles (les dernières) ; validée, la carte montre le début, molette / glissé vertical pour tout relire.
// Une autre question : le coin supérieur droit, corné après 3 s (il se soulève de temps en temps, comme une
// page qu'on va tourner), ou glisser la carte de côté, ou toucher le paquet. PASSER (page, toujours visible) :
// sur une question → la carte réponse monte au centre (thème libre) ; sur le thème libre → la fin.
// Lumière : manière 1 (orbite + hauteur) + la carte en focus s'incline vers la souris / le téléphone.
import { createCardRenderer, M4, CARD } from './cardRenderer.js';
import { loadTypeFont, makeInkMap, makeAnswerInk, makeStripInk, STRIP, TYPE } from './ink.js';
import { createNameRelief } from './nameRelief.js';
import { createRng } from '../field/rng.js';
import QUESTIONS from './questions.json';

export const LOOK = {
  // réglé par Maxence sur téléphone (04/10). Cartes noires ; lampe en orbite + hauteur (manière 1, 60 %) ; la
  // carte en focus s'incline vers la souris / le mouvement du téléphone, celle en attente respire et est baissée.
  light: 0.111, lightR: 400, env: 0.28, albedo: 0.029, exposure: 0.74, lightAz: 0.67, lightR0: 1.0, lightZ: 210, tiltAmp: 1.45,
  lightMode: 1, elevAmp: 0.45, flashZ: 70, cardTilt: 0.2, lightVar: 0.6, sway: 0.06, unfocusDim: 0.25, spot: 0.06,
  h: 0.19, b: 1.32, crease: 0, fiber: 0.06, foot: 0.76, footW: 0.165, parallax: 0,
  rough: 0.64, spec: 3.1, sheen: 0, glint: 0.35, edge: 3, grain: 1.25, diffRough: 0.65, envSpec: 0.32, toe: 0.0078,
  nameFlat: 0.42,   // prénom à plat (gris en retrait) ; 0 → prénom en relief (nameAlb, nameRelief…)
  nameAlb: 0.5, nameRelief: 0.05, nameBevel: 0.07, nameSpec: 0.4, nameGrain: 1.25, nameFiber: 0.06, nameGlint: 0.35,
  inkAlb: 0.35, inkPress: 0.1, inkWear: 3, inkThr: 0.35, inkVar: 0.6, inkPaper: 11.5, inkOrg: 0,
  cornerDelay: 5,    // s avant que le coin se corne
};
const FOV = 26 * Math.PI / 180;
const TILT = 0.22;
const STACK = 12, PITCH = 0.15;
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

export async function createCardScene(gl, { base = './', seed = (Math.random() * 1e9) >>> 0, look = {}, on = {} } = {}) {
  const card = await createCardRenderer(gl, base);
  const nameR = await createNameRelief(gl, card.paperTex);
  await loadTypeFont(base);
  const L = { ...LOOK, ...look };
  const rnd = createRng(seed);
  const emit = (k, d) => { try { on[k] && on[k](d); } catch (e) { console.error(e); } };

  const order = QUESTIONS.map(q => q.id);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
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
  let question = null, answer = null;
  let leaving = [];
  let pendingDraw = -1;
  let writing = false, kbPx = 0, kb = 0;
  let ended = null;
  let nameText = '', nameKey = '', glow = [];

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
  const answerPose = v => ({ x: v.jx, y: lay.yAns + v.jy, z: 0, rx: 0, ry: Math.PI, rz: v.jr });
  const visibleStack = () => Math.max(0, Math.min(STACK, QUESTIONS.length - next));

  // ---------- animations ----------
  let dragX = 0, dragging = false;
  const busy = (c, t) => !!(c && c.anim && t - c.t0 < c.dur);
  // carte réponse : 'peek' (dépasse d'une ligne sous la question, on écrit), 'below' (sortie dessous, validée),
  // 'center' (thème libre, à la place de la question)
  const peekPose = v => { const q = question ? centerPose(question.v) : centerPose(v); return { ...q, x: q.x + v.jx * 0.5, y: q.y - STRIP, z: UNDER_Z, rz: q.rz + v.jr * 0.5 }; };
  const restPose = c => c === question ? centerPose(c.v, dragging ? dragX : 0) : c.place === 'center' ? centerPose(c.v) : c.place === 'peek' ? peekPose(c.v) : answerPose(c.v);
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
    if (c.anim === 'discard') {
      const a = c.from, e = Math.pow(u, 1.8), s = c.dir || -1;
      return { ...a, x: a.x + s * e * (lay.Ww / 2 + CARD.w * 1.2), y: a.y - 8 * u, z: a.z + 4 * sstep(0, 0.3, u), rz: a.rz + s * 0.3 * e };
    }
    if (c.anim === 'move') {                          // déplacement de la carte réponse (dessous ↔ bande, centre)
      const a = c.from, b = restPose(c), e = ease(u), p = lerpPose(a, b, e);
      // ne quitte (ou ne rejoint) la hauteur « sous la question » qu'une fois dégagée
      p.z = b.z < a.z ? lerp(a.z, b.z, sstep(0.6, 1, u)) : lerp(a.z, b.z, sstep(0, 0.4, u));
      if (c.place === 'center') p.z += 30 * Math.sin(Math.PI * e);
      return p;
    }
    return restPose(c);
  }

  // ---------- questions ----------
  function makeQuestion(t) {
    if (next >= QUESTIONS.length) return null;
    const id = order[next++];
    const v = stack.pop(); stack.unshift(variant());
    const q = QUESTIONS.find(x => x.id === id);
    const ink = card.makeInk(makeInkMap(q.q, Math.floor(v.seed * 1000) + id).canvas);
    return { id, q: q.q, v, ink, anim: 'draw', t0: t, dur: DRAW_T, from: deckPose(STACK - 1, v), landedAt: t + DRAW_T };
  }
  function drawNext(t) { question = makeQuestion(t); if (question) emit('draw', { id: question.id }); }
  function discard(t, dir = -1, from = null) {
    if (!question || busy(question, t) || ended) return false;
    leaving.push({ ...question, anim: 'discard', t0: t, dur: DISCARD_T, dir, from: from || poseOf(question, t) });
    emit('discard', { id: question.id });
    discards++;
    question = null;
    pendingDraw = t + DISCARD_T * 0.45;
    if (answer && answer.text) setAnswerText('');       // la réponse appartenait à la question écartée
    return true;
  }

  // ---------- la carte réponse ----------
  function makeAnswer(t) {
    const v = { ...variant(), noLogo: true };
    const q = centerPose(question.v);
    const a = { v, ink: null, text: '', cursorMM: null, first: 0, place: 'peek', anim: 'slide', t0: t, dur: 0.8, from: { ...q, z: UNDER_Z } };
    a.cursorMM = makeStripInk('', Math.floor(v.seed * 1000) + 7).cursor;
    return a;
  }
  function renderAnswer() {
    const sd = Math.floor(answer.v.seed * 1000) + 7;
    const m = answer.place === 'peek' ? makeStripInk(answer.text, sd) : makeAnswerInk(answer.text, sd, LINES, writing ? null : answer.first);
    if (answer.ink) card.freeInk(answer.ink);
    answer.ink = card.makeInk(m.canvas); answer.cursorMM = m.cursor; answer.count = m.count;
  }
  function setAnswerText(clean) { answer.text = clean; answer.first = 0; renderAnswer(); }
  function setText(s) {
    if (!answer || !writing) return;
    const clean = s.toLowerCase().replace(/[’‘`´]/g, "'").replace(/[\r\n\t]/g, ' ').replace(/ {2,}/g, ' ');
    const prev = answer.text || '';
    if (clean === prev) return;
    if (clean.length > prev.length && clean.startsWith(prev)) {      // lettres du prénom tapées → elles s'éclairent
      for (const ch of clean.slice(prev.length)) { const b = bare(ch); [...nameText].forEach((n, i) => { if (b && n === b) glow[i] = 1; }); }
    }
    setAnswerText(clean);
  }
  function startWriting() {
    if (!answer || ended) return false;
    writing = true;
    if (question && answer.place === 'below') moveAnswer(lastT, 'peek');     // retour dans la bande sous la question
    renderAnswer(); emit('write', {}); return true;
  }
  // Entrée / « terminé » : la carte réponse sort dessous et montre ses trois premières lignes
  function stopWriting() {
    if (!writing) return;
    writing = false;
    if (answer) { answer.first = 0; if (question && answer.text) moveAnswer(lastT, 'below'); renderAnswer(); }
  }
  // relire : molette / glissé vertical (réponse validée), une ligne à la fois
  function scrollAnswer(dl) {
    if (!answer || writing || !answer.text) return;
    const n = answer.count || 1, f = Math.max(0, Math.min(n - LINES, answer.first + dl));
    if (f !== answer.first) { answer.first = f; renderAnswer(); }
  }

  // ---------- lumière (manière 1) + inclinaison de la carte en focus ----------
  const tilt = { x: 0, y: 0 }, ts = { x: 0, y: 0 };
  const lp = { x: Math.cos(L.lightAz), y: Math.sin(L.lightAz), vx: 0, vy: 0 };
  function stepLight(dt) {
    const kk = Math.min(1, dt * 3); ts.x += (tilt.x - ts.x) * kk; ts.y += (tilt.y - ts.y) * kk;
    const m = L.lightMode | 0, ax = tilt.x * L.lightVar, ay = (m === 1 ? 0 : tilt.y) * L.lightVar;
    let tx = Math.cos(L.lightAz) + L.tiltAmp * ax, ty = Math.sin(L.lightAz) + L.tiltAmp * ay;
    const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const w = 2.2, z = 0.85;
    for (const [k, v, tg] of [['x', 'vx', tx], ['y', 'vy', ty]]) {
      const acc = -2 * z * w * lp[v] - w * w * (lp[k] - tg);
      lp[v] += acc * dt; lp[k] += lp[v] * dt;
    }
  }

  let vp = null, eye = null, lastT = 0, focusAns = 0;
  function frame(t, dt, W, H) {
    lastT = t;
    layout(W, H);
    if (pendingDraw >= 0 && t >= pendingDraw) { pendingDraw = -1; drawNext(t); }
    for (const c of [question, answer]) if (c && c.anim && t - c.t0 >= c.dur) {
      const first = c === answer && c.anim === 'slide';
      c.anim = null;
      if (first && !ended) startWriting();             // la carte réponse vient d'apparaître : curseur, clavier
    }
    // la question est posée et il n'y a pas encore de carte réponse : elle sort du paquet
    if (question && !question.anim && !answer && !ended) answer = makeAnswer(t);
    leaving = leaving.filter(c => { if (t - c.t0 < c.dur) return true; if (c.ink) card.freeInk(c.ink); return false; });
    stepLight(dt);
    kb += ((writing && kbPx > 40 ? 1 : 0) - kb) * Math.min(1, dt * 4);
    focusAns += (((answer && (writing || answer.place === 'center')) ? 1 : 0) - focusAns) * Math.min(1, dt * 3);
    for (let i = 0; i < glow.length; i++) glow[i] = (glow[i] || 0) * Math.exp(-dt / 1.4);
    const endU = ended ? clamp01((t - ended.t0) / 2.2) : 0;

    // caméra ; clavier ouvert : la carte réponse (à sa taille) au milieu de la partie visible, le reste s'efface
    const vis = 1 - kbPx / H, scale = 1, Hs = lay.Hw, Ds = lay.D;
    const yA = question ? lay.yDeck - STRIP / 2 : lay.yDeck;   // la question et la bande (ou la carte du thème libre)
    const cyK = yA - (0.5 - (vis / 2 + 0.05)) * Hs;
    const cy = lerp((lay.yDeck + lay.yAns) / 2, cyK, kb);
    eye = [0, cy - Ds * Math.sin(TILT), Ds * Math.cos(TILT)];
    vp = M4.mul(M4.perspective(FOV, W / H, Ds * 0.3, Ds * 3), M4.lookAt(eye, [0, cy, 0], [0, 1, 0]));

    const k = lay.Hw / 235;
    const qp = question ? poseOf(question, t) : { x: 0, y: lay.yDeck, z: 0 };
    const anp = answer ? poseOf(answer, t) : null;
    const ap = anp && focusAns > 0.5 ? anp : qp;      // carte en focus : la lampe et le projecteur la suivent
    const R = L.lightR0 * lay.Hw, Z = L.lightZ * k, D0 = Math.hypot(R, Z), el0 = Math.atan2(Z, R), ln = Math.hypot(lp.x, lp.y) || 1;
    const el = (L.lightMode | 0) === 1 ? Math.min(1.35, Math.max(0.18, el0 + ts.y * L.elevAmp * L.lightVar)) : el0;
    const lightPos = [ap.x + lp.x / ln * D0 * Math.cos(el), ap.y + lp.y / ln * D0 * Math.cos(el), D0 * Math.sin(el)];
    const light = L.light * k * k * Math.sin(el0) / Math.sin(el);
    const spotPos = [ap.x, ap.y + 0.35 * lay.Hw, lay.D * 0.55];
    const sd = [ap.x - spotPos[0], ap.y - spotPos[1], ap.z - spotPos[2]], sl = Math.hypot(...sd);
    const P = { ...L, lightPos, light, spotPos, spotDir: sd.map(x => x / sl), spotI: L.spot * k * k * (sl / 300) ** 2,
      spotCosOut: Math.cos(Math.atan(0.62 * CARD.w / sl)), spotCosIn: Math.cos(Math.atan(0.4 * CARD.w / sl)) };

    // la carte en focus s'incline (souris / téléphone), l'autre respire et est baissée
    const crx = -ts.y * L.cardTilt, cry = ts.x * L.cardTilt;
    const group = (px, py, pz, ph, wt) => {
      const sw = L.sway * 0.5 * (1 - wt);
      const rx = crx * wt + sw * (0.6 * Math.sin(t * 0.61 + ph) + 0.4 * Math.sin(t * 1.37 + 2.1 * ph));
      const ry = cry * wt + sw * 1.2 * (0.6 * Math.sin(t * 0.47 + 1.7 * ph) + 0.4 * Math.sin(t * 1.13 + 0.6 * ph));
      const dz = sw * 12 * Math.sin(t * 0.29 + ph);
      return M4.mul(M4.mul(M4.model(0, 0, 0, px, py, pz + dz), M4.model(rx, ry, 0)), M4.model(0, 0, 0, -px, -py, -pz));
    };
    const wQ = 1 - focusAns, wA = focusAns;
    const Gq = group(0, lay.yDeck, 0, 0.0, wQ), Ga = answer && answer.place === 'below' && !answer.anim ? group(0, lay.yAns, 0, 2.3, wA) : Gq;
    const endShade = 1 - endU;
    const dimQ = (1 - L.unfocusDim * (1 - wQ)) * endShade, dimA = (1 - L.unfocusDim * (1 - wA)) * endShade;
    gl.enable(gl.DEPTH_TEST);
    const model = (G, p) => M4.mul(G, M4.model(p.rx, p.ry, p.rz, p.x, p.y, p.z));
    const occQ = question ? { x: qp.x, y: qp.y, z: qp.z, rz: qp.rz } : null;
    // paquet (d'un bloc avec la question posée dessus)
    const n = dimQ > 0.02 ? visibleStack() : 0;     // effacés (clavier ouvert) : on ne les dessine plus
    for (let i = 0; i < n; i++) {
      const v = stack[STACK - n + i], p = deckPose(i, v);
      card.draw(vp, eye, P, { model: model(Gq, p), lod: i === n - 1 ? 'fine' : 'coarse', shade: (0.55 + 0.45 * (i + 1) / n) * dimQ, occ: occQ, ...v });
    }
    for (const c of leaving) card.draw(vp, eye, P, { model: model(Gq, poseOf(c, t)), lod: 'fine', ink: c.ink, shade: dimQ, ...c.v });
    if (question && dimQ > 0.02) {
      // coin supérieur droit corné, seulement après cornerDelay s : il se soulève de temps en temps
      // (comme une page qu'on va tourner) puis retombe — invitation à prendre une autre question
      const idleFor = question.anim ? -1 : t - question.landedAt;
      const on = idleFor > L.cornerDelay && !ended ? 1 : 0;
      question.curlA = (question.curlA || 0) + (on - (question.curlA || 0)) * Math.min(1, dt * 1.5);
      const ph = ((idleFor - L.cornerDelay) % 4.5 + 4.5) % 4.5;   // cycle de 4,5 s : soulèvement, retombée
      const peek = sstep(0, 0.5, ph) * (1 - sstep(0.7, 1.5, ph));
      const lift = -(0.25 + 1.3 * peek) * question.curlA;          // vers la caméra (carte retournée)
      card.draw(vp, eye, P, { model: model(Gq, qp), lod: 'fine', ink: question.ink, shade: dimQ, ...question.v, curl: [-1, 1, lift] });
    }
    if (answer) {
      const cur = !busy(answer, t) && writing ? cursorAt(answer.cursorMM, t) : {};
      card.draw(vp, eye, P, { model: model(Ga, anp), lod: 'fine', ink: answer.ink, shade: dimA, occ: answer.place === 'peek' ? occQ : null, ...answer.v, ...cur });
    }
    // prénom (à plat, en retrait) ; ses lettres s'éclairent quand on les tape ; tout s'allume à la fin
    if (nameText) {
      const fy = 0.11, ndcY = 1 - 2 * fy, tf = Math.tan(FOV / 2);
      const fwd = norm3(sub3([0, cy, 0], eye)), right = norm3(cross3(fwd, [0, 1, 0])), up = cross3(right, fwd);
      const dir = norm3(add3(fwd, mul3(up, ndcY * tf)));
      const s = -eye[2] / dir[2], py = eye[1] + dir[1] * s;
      const g = [...nameText].map((_, i) => Math.max(glow[i] || 0, ended ? sstep(0.1 + i * 0.08, 0.5 + i * 0.08, (t - ended.t0)) * 0.9 : 0));
      const key = nameText + W + 'x' + H + Math.round(py * 10) + Math.round(scale * 100) + g.map(x => x.toFixed(2)).join();
      if (key !== nameKey) {
        const capPx = Math.min(52, Math.max(26, 0.052 * H)) * 0.66;
        nameR.layout(nameText, 0, py, capPx * Hs / H, lay.Ww * scale * 0.86, g);
        nameKey = key;
      }
      if (kb > 0.02) gl.disable(gl.DEPTH_TEST);           // clavier ouvert : le prénom reste devant
      nameR.draw(vp, eye, P, L, dimQ > 0.02 ? occQ : null);
      gl.enable(gl.DEPTH_TEST);
    }
    if (ended && !ended.done && t - ended.t0 > 2.6) { ended.done = true; emit('end', { kind: ended.kind, text: ended.text, id: ended.id }); }
  }
  // curseur à une position (mm depuis le coin haut-gauche de la face lue, recto) : trait fin qui respire
  function cursorAt(cm, t) {
    const a = 0.55 + 0.4 * Math.sin(t * 2.4);
    return { cursor: [CARD.w / 2 - cm.x, CARD.h / 2 - cm.y - 0.8, TYPE.size * 0.92, a], cursorFace: 1 };
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
    if (question && inside(screenQuad(poseOf(question, lastT)), x, y)) return 'question';
    if (answer && inside(screenQuad(poseOf(answer, lastT)), x, y)) return 'answer';
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
  function cardRect() { if (!vp) return null; const c = answer && focusAns > 0.5 ? answer : question; return c ? rectOf(screenQuad(poseOf(c, lastT))) : rectOf(screenQuad(deckPose(STACK - 1, stack[STACK - 1]))); }
  function activeRect() { return answer && vp ? rectOf(screenQuad(poseOf(answer, lastT))) : null; }

  // ---------- gestes ----------
  function tap(x, y, t) {
    if (ended) return { type: null };
    const h = hit(x, y);
    if (h === 'question' && nearCorner(x, y)) return discard(t, 1) ? { type: 'discard' } : { type: null };
    if (h === 'answer') return startWriting() ? { type: 'write' } : { type: null };
    if (h === 'deck' && question) return discard(t, -1) ? { type: 'discard' } : { type: null };
    return { type: null };
  }
  function drag(dx) { if (question && !busy(question, lastT) && !ended) { dragging = true; dragX = dx * lay.Ww / lay.W; } }
  function release(dx, vx, t) {
    if (!dragging) return { type: null };
    const from = question ? poseOf(question, t) : null;
    dragging = false;
    const far = Math.abs(dx) > lay.W * 0.22 || Math.abs(vx) > 0.6;
    dragX = 0;
    if (far) return discard(t, Math.sign(dx) || -1, from) ? { type: 'discard' } : { type: null };
    return { type: 'cancel' };
  }
  function give(t) {
    if (!answer || !answer.text || ended) return false;
    writing = false;
    ended = { t0: t, kind: question ? 'reponse' : 'theme', text: answer.text, id: question ? question.id : null };
    return true;
  }
  // PASSER : sur une question → la carte réponse monte au centre (thème libre) ; sinon → la fin
  function pass(t) {
    if (ended) return null;
    if (!question || !answer) { writing = false; ended = { t0: t, kind: 'improvisation' }; return 'end'; }
    if (busy(question, t) || busy(answer, t)) return null;
    leaving.push({ ...question, anim: 'discard', t0: t, dur: DISCARD_T, dir: -1, from: poseOf(question, t) });
    question = null; pendingDraw = -1;
    answer.from = poseOf(answer, t); answer.place = 'center'; answer.anim = 'move'; answer.t0 = t; answer.dur = MOVE_T;
    setAnswerText('');
    emit('blank', {});
    return 'blank';
  }

  function start(t) { pendingDraw = t + 0.6; }
  function setName(s) { nameText = (s || '').toUpperCase(); nameKey = ''; glow = []; }
  function setTilt(x, y) { tilt.x = Math.max(-1, Math.min(1, x)); tilt.y = Math.max(-1, Math.min(1, y)); }
  function setKeyboard(px) { kbPx = px; }
  return {
    frame, tap, drag, release, give, pass, start, setName, setTilt, setKeyboard, setText, startWriting, stopWriting, scrollAnswer,
    activeRect, cardRect,
    state: () => ({ writing, active: answer ? { kind: question ? 'question' : 'blank', id: question?.id, text: answer.text } : null, ended: !!ended, discards, offered: false }),
    look: L, layout: lay,
  };
}
