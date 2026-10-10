// La vitrine (10/10, alt.html) : ce qu'il y a dans l'envoi, joué EN DIRECT dans la scène de la feuille — la feuille de
// la personne, son prénom, puis une seule histoire qui s'enchaîne, en trois étapes qu'on avance ou recule :
//   0 la feuille (le prénom en colonne)
//   1 la carte question monte du bas de l'écran, se retourne face cachée, se pose sur la feuille ; la feuille et la carte
//     entrent dans l'enveloppe ; une carte noire vierge se pose sur le dos, un fil noir fait le tour de l'enveloppe et la
//     tient ; le rabat se ferme sur la carte ; le cachet de cire
//   2 le fil glisse, la carte vierge aussi ; le carbone blanc s'y pose, le prénom s'écrit à la main (en noir sur le
//     carbone) ; le carbone se soulève : le prénom, blanc, sur la carte ; un timbre ; puis la carte rejoint d'autres cartes
//     à prénoms, le fil passe dans leurs trous : la guirlande des SINGULIES (le fil du poignet reste une surprise)
// Tout est une fonction de l'horloge vt (s) : reculer rejoue à l'envers. sheet.js lui confie la feuille, l'enveloppe et
// le cachet (ses propres horloges E / PO, sans retournement), la vitrine dessine le reste (carte, carte vierge,
// carbone, timbre, fil, autres cartes).
import { M4, CARD } from '../cards/cardRenderer.js';
import { ENV, E, PO, FLAP_H } from '../sheet/envelope.js';
import { createThread, pathLen } from './thread.js';
import { handOrder, loadHand, handStyle, handInk, stampInk } from './hand.js';

const clamp01 = u => Math.min(1, Math.max(0, u));
const sstep = (a, b, x) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const ease = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
const easeOut = u => 1 - Math.pow(1 - clamp01(u), 3);
const lerp = (a, b, u) => a + (b - a) * u;
const mix3 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
const span = (a, b, x) => clamp01((x - a) / (b - a));
const T = (x, y, z) => M4.model(0, 0, 0, x, y, z);
const ap = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
const posOf = m => [m[12], m[13], m[14]];
const PM = p => M4.model(p.rx || 0, p.ry || 0, p.rz || 0, p.x, p.y, p.z);
const lerpPose = (a, b, u) => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), z: lerp(a.z, b.z, u), rx: lerp(a.rx || 0, b.rx || 0, u), ry: lerp(a.ry || 0, b.ry || 0, u), rz: lerp(a.rz || 0, b.rz || 0, u) });
const poseOfM = m => ({ x: m[12], y: m[13], z: m[14], rx: 0, ry: 0, rz: Math.atan2(m[1], m[0]) });

// les phases (s) : la carte, l'enveloppe, la carte vierge, la guirlande ; les étapes qu'on montre en regroupent deux
const D = [2.3, 7.0, 6.2, 5.4];
const K = D.reduce((a, d) => (a.push(a[a.length - 1] + d), a), [0]);
export const VKEYS = [K[0], K[2], K[4]];
const BACK_SPEED = 2.6;
// ce qu'on écrit sur les autres cartes de la guirlande
const OTHERS = ['Julie', 'Isabelle', 'Marysol', 'Anaïs', 'Lou', 'Nour', 'Sacha', 'Inès', 'Hugo', 'Yanis', 'Camille', 'Léon', 'Mila', 'Noé', 'Rose', 'Jade', 'Tom', 'Zoé', 'Malo', 'Lina'];

export function createVitrine(o) {
  const { gl, card, rnd, PRENOM, SY, EC, SHEET, C_POSE, C_IN, reduced } = o;
  const base = o.base || './';
  const thread = createThread(gl);
  card.addShape('carbon', { w: 102, h: 66, r: 0.5, t: 0.05 });
  card.addShape('stamp', { w: 20, h: 24, r: 0.25, t: 0.06 });
  card.addShape('hole', { w: 3.4, h: 3.4, r: 1.7, t: 0.02 });
  const variant = () => ({ seed: rnd() * 100, paperXf: [rnd.range(-2.5, 2.5), rnd.range(-1.5, 1.5), rnd() < 0.5 ? 0 : Math.PI, 0],
    logoOff: [rnd.range(-0.15, 0.15), rnd.range(-0.15, 0.15)], warp: [rnd.range(0.05, 0.3), rnd.range(-0.18, 0.04), rnd.range(-0.1, 0.1)],
    jx: rnd.range(-0.6, 0.6), jy: rnd.range(-0.5, 0.5), jr: rnd.range(-0.015, 0.015) });
  const vQ = o.top || variant(), vB = variant(), vC = { ...variant(), warp: [0, 0, 0] }, vS = variant();
  // les écritures de cette visite (la sienne d'abord) et les prénoms des autres cartes
  const hands = handOrder();
  const others = OTHERS.filter(n => n.toLowerCase() !== PRENOM.toLowerCase()).sort(() => Math.random() - 0.5).slice(0, 3);
  const G = [{ name: PRENOM, font: hands[0], v: vB, k: 0 }, ...others.map((name, i) => ({ name, font: hands[i + 1], v: variant(), k: [-1, 1, 2][i] }))];
  G.forEach(g => { g.st = handStyle(g.font, (Math.random() * 1e9) >>> 0); g.ink = null; });
  Promise.all(G.map(g => loadHand(g.font, base))).then(() => { G.forEach(g => { if (g.ink) { card.freeInk(g.ink); g.ink = null; } }); carbonU = -1; });
  const BOX = { cx: CARD.w / 2 - 3, cy: CARD.h / 2 + 3, w: 60 };              // la zone où l'on écrit (mm, depuis le coin haut-gauche)
  const CARB_OFF = [2.5, -1.2];                                              // le carbone sur la carte (décalé)
  const nameInk = g => g.ink || (g.ink = card.makeInk(handInk(g.name, g.st, CARD.w, CARD.h, 14, BOX, 1)));
  let carbonInk = null, carbonU = -1, carbonCv = null;
  function carbonInkAt(u) {
    const q = Math.round(u * 60) / 60;
    if (q === carbonU && carbonInk) return carbonInk;
    carbonU = q;
    // la même écriture sur le carbone (plus grand : décalée d'autant)
    const bx = { cx: BOX.cx + (102 - CARD.w) / 2 - CARB_OFF[0], cy: BOX.cy + (66 - CARD.h) / 2 + CARB_OFF[1], w: BOX.w };
    carbonCv = handInk(G[0].name, G[0].st, 102, 66, 9, bx, q, carbonCv);
    if (carbonInk) card.freeInk(carbonInk);
    carbonInk = card.makeInk(carbonCv);
    return carbonInk;
  }
  let stampTex = null;
  const stamp = () => stampTex || (stampTex = card.makeInk(stampInk()));
  const CARBON_P = { albedo: 0.52, rough: 0.7, spec: 0.6, sheen: 0, glint: 0.05, grain: 0.5, fiber: 0.02, edge: 0.5, inkAlb: 0.012, inkPaper: 2 };
  const STAMP_AT = [29, 12.8, 0.2];

  // ---- l'horloge ----
  let vt = 0, target = 0, k = 0;
  const go = i => { k = Math.max(0, Math.min(VKEYS.length - 1, i)); target = VKEYS[k]; if (reduced) vt = target; };
  const jump = i => { go(i); vt = target; };
  function update(dt) {
    if (vt < target) vt = Math.min(target, vt + dt);
    else if (vt > target) vt = Math.max(target, vt - dt * BACK_SPEED);
  }
  const on = () => vt > 0 || target > 0;

  // ---- l'enveloppe (phase 2) : son horloge (sans retournement), celle de l'envoi (le rabat, le cachet) ----
  const r2 = () => vt - K[1];
  const evOf = () => Math.min(E.flip[0] - 0.15, Math.max(0, r2()) * 1.9);
  const PP0 = PO.flap[0] - 0.05, R2_FLAP = 4.3;
  const ppOf = () => Math.min(PO.zoomOut[1] - 0.2, PP0 + Math.max(0, r2() - R2_FLAP) * 1.5);
  const B_LOC = { x: 0, y: -26, z: 0 };                                      // la carte vierge, sur le dos de l'enveloppe
  const bulgeAt = (x, y) => 1.2 * Math.max(0, 1 - (x / (ENV.w / 2)) ** 2) * Math.max(0, 1 - (y / (ENV.h / 2)) ** 2);
  const inCard = (x, y) => { const dx = Math.max(0, Math.abs(x - B_LOC.x) - CARD.w / 2), dy = Math.max(0, Math.abs(y - B_LOC.y) - CARD.h / 2); return 1 - sstep(0, 1.6, Math.hypot(dx, dy)); };
  const zBack = 1.95;
  // le fil fait le tour de l'enveloppe à la hauteur y (repère de l'enveloppe), sur la carte vierge
  function loopPath(y0, tilt, dyOff = 0) {
    const pts = [], w2 = ENV.w / 2 + 0.5, step = 3, yAt = x => y0 + tilt * x + dyOff;
    for (let x = -w2; x <= w2; x += step) { const y = yAt(x); pts.push([x, y, zBack + bulgeAt(x, y) + 0.45 + 0.75 * inCard(x, y) + 0.5]); }
    for (let i = 1; i < 6; i++) { const a = Math.PI * i / 6; pts.push([w2 + 0.9 * Math.sin(a), yAt(w2), zBack / 2 + (zBack / 2 + 0.9) * Math.cos(a) - 0.2]); }
    for (let x = w2; x >= -w2; x -= step) pts.push([x, yAt(x), -0.45]);
    for (let i = 1; i <= 6; i++) { const a = Math.PI * i / 6; pts.push([-w2 - 0.9 * Math.sin(a), yAt(-w2), zBack / 2 - (zBack / 2 + 0.9) * Math.cos(a) - 0.2]); }
    return pts;
  }
  const LOOP = { y: -24, tilt: 0.015 }, loopLen = pathLen(loopPath(0, 0));

  // la carte question : du bas de l'écran (recto), elle se retourne en montant (face cachée) et se pose sur la feuille ;
  // puis elle entre dans l'enveloppe avec la feuille
  function questionM(Msheet) {
    const u = ease(span(0.1, 2.1, vt));
    const relLand = { x: C_POSE.x + vQ.jx, y: C_POSE.y + vQ.jy * 2, z: 2.2, rz: C_POSE.rz };
    const uC = ease(span(E.cIn[0], E.cIn[1], evOf()));
    const rel = { x: lerp(relLand.x, C_IN.x, uC), y: lerp(relLand.y, C_IN.y, uC), z: lerp(2.2, C_IN.z, uC) + 9 * Math.sin(Math.PI * uC), rz: lerp(relLand.rz, C_IN.rz, uC) };
    const land = M4.mul(Msheet, M4.model(0, 0, rel.rz, rel.x, rel.y, rel.z));
    if (u >= 1) return land;
    const p1 = posOf(land), p0 = [p1[0] - 6, SY - SHEET.h / 2 - 170, 60];
    const p = mix3(p0, p1, u); p[2] += 34 * Math.sin(Math.PI * u);
    return M4.model(-0.25 * Math.sin(Math.PI * u), Math.PI * (1 - sstep(0.25, 0.8, u)), lerp(0.25, rel.rz, u), p[0], p[1], p[2]);
  }
  // la carte vierge : posée sur le dos de l'enveloppe (logo gaufré vers nous), puis elle glisse, se soulève, se retourne
  const W_CARD = () => [EC.x, EC.y - 6, EC.z + 58];
  function blankM(Menv) {
    const r = r2();
    const onEnv = M4.mul(Menv, M4.model(0, Math.PI, 0.02, B_LOC.x, B_LOC.y, zBack + 1.25));
    const ua = easeOut(span(2.5, 3.3, r));                                   // arrivée : d'en haut, devant
    if (ua < 1) { const p1 = posOf(onEnv), p0 = [p1[0] + 30, p1[1] + 120, p1[2] + 70]; const p = mix3(p0, p1, ua); return M4.mul(T(p[0] - p1[0], p[1] - p1[1], p[2] - p1[2]), onEnv); }
    const r3 = vt - K[2];
    if (r3 <= 0) return onEnv;
    // elle glisse hors du rabat (vers le bas), puis vient devant nous en se retournant (la face lisse, pour écrire)
    const us = ease(span(0.4, 1.3, r3)), ul = ease(span(1.1, 2.3, r3));
    const slid = M4.mul(Menv, M4.model(0, Math.PI, 0.02, B_LOC.x, B_LOC.y - 72 * us, zBack + 1.25 + 3 * Math.sin(Math.PI * us)));
    if (ul <= 0) return slid;
    const a = posOf(slid), b = W_CARD(), p = mix3(a, b, ul);
    p[2] += 18 * Math.sin(Math.PI * ul);
    const br = sstep(2.3, 3.0, r3);
    return M4.model(-0.15 * Math.sin(Math.PI * ul) + br * 0.02 * Math.sin(vt * 0.9), Math.PI * (1 + ul), lerp(0.02, -0.02, ul) + br * 0.01 * Math.sin(vt * 0.6), p[0], p[1], p[2]);
  }
  // la guirlande : la carte de la personne (k = 0) et les autres, suspendues
  const GD = [112, -3, -26];
  const gPose = (g, t) => {
    const w = W_CARD(), sw = 0.03 * Math.sin(t * 0.8 + g.k * 1.3) + 0.015 * Math.sin(t * 0.37 + g.k);
    return { x: w[0] + GD[0] * g.k, y: w[1] + 8 + GD[1] * g.k + 1.2 * Math.sin(t * 0.7 + g.k), z: w[2] + GD[2] * g.k, rx: 0.04 * Math.sin(t * 0.5 + g.k), ry: 0.05 * Math.sin(t * 0.45 + g.k * 2), rz: sw };
  };
  const HX = CARD.w / 2 - 5, HY = -3;                                     // les trous : sur les côtés gauche et droit (le fil les perfore)

  // ---- ce que sheet.js reprend : l'enveloppe, la feuille, la caméra ----
  function envState() {
    if (!on() || vt <= K[1]) return null;
    let fade = 1;
    if (vt > K[2]) fade = 1 - ease(span(0.7, 2.0, vt - K[2]));             // la carte vierge vient devant : l'enveloppe s'efface
    return { ev: evOf(), pp: ppOf(), fade, M: null, flapDz: 1.1 };
  }
  const sheetState = () => (on() && vt > K[2] + 0.8 ? { hide: true } : null);
  // la caméra (cadres de sheet.js : A = la feuille ; E = la feuille et l'enveloppe ; P = l'enveloppe entière)
  function camera(f, frameFor, W, H) {
    if (!on()) return null;
    const lg = c => ({ cx: c.cx, cy: c.cy, lD: Math.log(c.D) });
    const mixC = (a, b, u) => ({ cx: lerp(a.cx, b.cx, u), cy: lerp(a.cy, b.cy, u), lD: lerp(a.lD, b.lD, u) });
    // la feuille et sa carte (qui dépasse en bas)
    const AC = lg(frameFor(SY + C_POSE.y - CARD.h / 2 - 10, SY + SHEET.h / 2 + 4, -SHEET.w / 2, SHEET.w / 2 + 8, SHEET.w * 1.1, W, H));
    let c = mixC(lg(f.A), AC, ease(span(0.3, 2.1, vt)));
    if (vt > K[1]) {
      const r = r2();
      c = mixC(c, lg(f.E), ease(span(E.cam[0], E.cam[1], evOf())));
      c = mixC(c, lg(f.P), ease(span(2.4, 3.7, r)));
      // le cachet de près pendant qu'il se fait, puis l'enveloppe entière
      const pp = ppOf(), uz = (reduced ? 0 : 1) * ease(span(PO.zoomIn[0], PO.zoomIn[1], pp)) * (1 - ease(span(PO.zoomOut[0], PO.zoomOut[1], pp)));
      if (uz > 0) { const sy = EC.y + ENV.h / 2 - FLAP_H + 4, zD = f.P.D * Math.max(0.25, 70 / (f.P.Hw * Math.min(1, W / H))); c = mixC(c, { cx: EC.x, cy: sy, lD: Math.log(zD) }, uz); }
    }
    // un cadre pour des objets à la hauteur z (vers nous) : la vue recule d'autant et se décale (elle regarde d'en bas)
    const TILT = 0.22, fr = (y0, y1, x0, x1, wantW, z) => { const q = frameFor(y0, y1, x0, x1, wantW, W, H); return { cx: q.cx, cy: q.cy + z * Math.tan(TILT), lD: Math.log(q.D + z * Math.cos(TILT)) }; };
    const w = W_CARD();
    if (vt > K[2]) c = mixC(c, fr(w[1] - 34, w[1] + 34, w[0] - 50, w[0] + 50, 128, w[2]), ease(span(1.0, 2.4, vt - K[2])));   // la carte vierge, de près
    if (vt > K[3]) c = mixC(c, fr(w[1] - 70, w[1] + 40, w[0] - 60, w[0] + 175, 250, w[2] - 25), ease(span(2.6, 4.6, vt - K[3])));   // la guirlande
    if (!Number.isFinite(c.cx + c.cy + c.lD)) return null;   // (jamais de vue invalide : celle de la feuille)
    return c;
  }
  // la lampe se tourne vers l'objet qu'on regarde
  function focus() {
    if (!on()) return null;
    if (vt > K[2]) { const w = W_CARD(); return { x: w[0], y: w[1], envW: 1 - 0.5 * sstep(0, 2, vt - K[2]) }; }
    if (vt > K[1]) return { x: EC.x, y: EC.y + 20, envW: ease(span(E.cam[0], E.cam[1], evOf())) };
    return null;
  }

  // ---- dessin de ce qui est propre à la vitrine ----
  function draw(vp, eye, P, Msheet, Menv, t) {
    if (!on()) return { occ: null };
    let occ = null;
    const drawCard = (M, v, x = {}) => card.draw(vp, eye, P, { model: M, lod: 'fine', ...v, ...x });
    const drawStamp = (M, fade = 1) => card.draw(vp, eye, P, { model: M, lod: 'stamp', ...vS, inkBack: stamp(), logoScale: [0.3, 0.3], logoOff: [0, 1.2], fade });
    // la carte question (face cachée), jusque dans l'enveloppe
    if (vt < K[2] + 0.8) {
      const M = questionM(Msheet);
      drawCard(M, vQ, { fade: sstep(0.05, 0.5, vt) });
      if (vt > 2.0 && vt < K[1] + 1.2) occ = { m: M };
    }
    // la carte vierge et le fil sur l'enveloppe ; puis le carbone, le prénom, le timbre
    const r = r2();
    if (Menv && r > 2.4 && vt <= K[3]) {
      const Mb = blankM(Menv), g = G[0], r3 = vt - K[2];
      drawCard(Mb, vB, { logoK: 1, inkBack: r3 > 3.0 ? nameInk(g) : null, fade: sstep(2.45, 2.8, r) });
      if (r3 > 2.3 && r3 < 5.6) {
        const ui = ease(span(2.4, 3.0, r3)), uo = ease(span(4.8, 5.5, r3)), wr = span(3.1, 4.6, r3);
        const Mc = M4.mul(Mb, M4.model(0, 0, -0.02 * (1 - ui) - 0.1 * uo, CARB_OFF[0] + 130 * (1 - ui) + 150 * uo, CARB_OFF[1] - 6 * uo, 0.55 + 6 * Math.sin(Math.PI * ui) * (1 - ui) + 16 * Math.sin(Math.PI * Math.min(1, uo * 1.3))));
        card.draw(vp, eye, { ...P, ...CARBON_P }, { model: Mc, lod: 'carbon', ...vC, noLogo: true, inkBack: r3 > 3.05 ? carbonInkAt(wr) : null, paperTile: 40, paperLo: 0.5, fade: sstep(2.35, 2.6, r3) * (1 - sstep(5.2, 5.55, r3)) });
      }
      if (r3 > 5.5) {                                                        // le timbre tombe dans le coin
        const u = easeOut(span(5.55, 6.1, r3));
        drawStamp(M4.mul(Mb, M4.model(0.3 * (1 - u), 0, lerp(0.45, 0.06, u), STAMP_AT[0] + 16 * (1 - u), STAMP_AT[1] + 20 * (1 - u), STAMP_AT[2] + 36 * (1 - u) * (1 - u))), sstep(5.55, 5.75, r3));
      }
      // le fil : il fait le tour, puis il glisse
      const prog = span(2.9, 4.0, r), ls = r3 > 0 ? ease(span(0, 1.2, r3)) : 0;
      if (prog > 0) thread.draw(vp, eye, P, loopPath(LOOP.y, LOOP.tilt, -110 * ls).map(p => ap(Menv, p)), 0.45, { upTo: prog * loopLen * 1.02, fade: 1 - sstep(0.7, 1, ls) });
    }
    // la guirlande
    if (vt > K[3]) {
      const r4 = vt - K[3], Ms = [];
      G.forEach(g => {
        const pz = gPose(g, t);
        const M = g.k === 0 ? PM(lerpPose(poseOfM(blankM(Menv || T(0, 0, 0))), pz, ease(span(0, 1.0, r4)))) : PM(pz);
        Ms.push(M);
        const fade = g.k === 0 ? 1 : sstep(0.3, 1.2, r4);
        drawCard(M, g.v, { logoK: 1, inkBack: nameInk(g), fade });
        const hf = sstep(0.1, 0.5, r4) * fade;
        for (const sx of [-HX, HX]) card.draw(vp, eye, { ...P, albedo: 0, spec: 0, env: 0, sheen: 0, glint: 0 }, { model: M4.mul(M, T(sx, HY, 0.1)), lod: 'hole', noLogo: true, fade: hf });
        if (g.k === 0) drawStamp(M4.mul(M, M4.model(0, 0, 0.06, ...STAMP_AT)));
      });
      // le fil passe dans les trous, de gauche à droite (les cartes rangées par place)
      const order = G.map((g, i) => ({ g, M: Ms[i] })).sort((a, b) => a.g.k - b.g.k);
      const pts = [], sag = lerp(15, 9, sstep(3.8, 4.6, r4));
      const sagTo = (a, b, s, n = 18) => { for (let j = 1; j <= n; j++) { const u = j / n, p = mix3(a, b, u); p[1] -= s * 4 * u * (1 - u); pts.push(p); } };
      const f0 = ap(order[0].M, [-HX, HY, 0.8]), start = [f0[0] - 90, f0[1] + 16, f0[2] + 20];
      pts.push(start); sagTo(start, f0, sag * 0.6);
      order.forEach(({ M }, i) => {
        pts.push(ap(M, [-HX, HY, -0.8]), ap(M, [HX, HY, -0.8]));
        const rf = ap(M, [HX, HY, 0.8]); pts.push(rf);
        if (i < order.length - 1) sagTo(rf, ap(order[i + 1].M, [-HX, HY, 0.8]), sag);
        else sagTo(rf, [rf[0] + 90, rf[1] + 16, rf[2] - 20], sag * 0.6);
      });
      const head = pathLen(pts) * ease(span(1.0, 3.8, r4));
      if (head > 0) thread.draw(vp, eye, P, pts, 0.45, { upTo: head });
    }
    return { occ };
  }

  function free() {
    thread.free();
    for (const g of G) if (g.ink) card.freeInk(g.ink);
    if (carbonInk) card.freeInk(carbonInk);
    if (stampTex) card.freeInk(stampTex);
  }
  return { on, update, go, jump, state: () => ({ vt, target, k, arrived: vt === target, keys: VKEYS }), envState, sheetState, camera, focus, draw, free };
}
