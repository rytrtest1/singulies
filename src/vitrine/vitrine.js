// La vitrine (11/10, alt.html) : ce qu'il y a dans l'envoi, joué EN DIRECT dans la scène de la feuille, sans bouger la
// vue (la feuille garde sa taille et sa place ; le cadre ne s'élargit qu'un peu, si un objet dépasse, et revient) :
//   0 la feuille
//   1 la carte question sort du haut de l'écran (face cachée) et se pose en bas de la feuille
//   2 l'enveloppe (dressée, à la place de la feuille) glisse sur la feuille et la carte ; une carte vierge arrive du haut
//     et se pose sur l'enveloppe ; le rabat se ferme sur elle ; le cachet de cire
//   3 la carte vierge vient devant ; le carbone blanc, son prénom écrit à la main (en noir sur le carbone), le carbone se
//     soulève (le prénom blanc), le timbre
// (le fil, lui, est dans la page : il relie les descriptions — src/alt/fil.js)
// Tout est une fonction de l'horloge vt (s) : reculer rejoue à l'envers. sheet.js dessine la feuille, l'enveloppe et le
// cachet (ses horloges, sans retournement ; l'enveloppe dans le repère de la feuille), la vitrine le reste.
import { M4, CARD } from '../cards/cardRenderer.js';
import { ENV, PO } from '../sheet/envelope.js';
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

// les étapes (s) : la carte, l'enveloppe, la carte vierge et la guirlande
const D = [2.2, 5.0, 5.8];
export const VKEYS = D.reduce((a, d) => (a.push(a[a.length - 1] + d), a), [0]);
const K = VKEYS;
const BACK_SPEED = 2.6;

export function createVitrine(o) {
  const { gl, card, rnd, PRENOM, SY, SHEET, reduced } = o;
  const base = o.base || './';
  card.addShape('carbon', { w: 102, h: 66, r: 0.5, t: 0.05 });
  card.addShape('stamp', { w: 20, h: 24, r: 0.25, t: 0.06 });
  const variant = () => ({ seed: rnd() * 100, paperXf: [rnd.range(-2.5, 2.5), rnd.range(-1.5, 1.5), rnd() < 0.5 ? 0 : Math.PI, 0],
    logoOff: [rnd.range(-0.15, 0.15), rnd.range(-0.15, 0.15)], warp: [rnd.range(0.05, 0.3), rnd.range(-0.18, 0.04), rnd.range(-0.1, 0.1)],
    jx: rnd.range(-0.6, 0.6), jy: rnd.range(-0.5, 0.5), jr: rnd.range(-0.015, 0.015) });
  const vQ = o.top || variant(), vB = variant(), vC = { ...variant(), warp: [0, 0, 0] }, vS = variant();
  // l'écriture de cette visite (tirée au hasard parmi 21)
  const G = [{ name: PRENOM, font: handOrder()[0], v: vB, k: 0 }];
  G.forEach(g => { g.st = handStyle(g.font, (Math.random() * 1e9) >>> 0); g.ink = null; });
  Promise.all(G.map(g => loadHand(g.font, base))).then(() => { G.forEach(g => { if (g.ink) { card.freeInk(g.ink); g.ink = null; } }); carbonU = -1; });
  const BOX = { cx: CARD.w / 2 - 3, cy: CARD.h / 2 + 3, w: 60 };
  const CARB_OFF = [2.5, -1.2];
  const nameInk = g => g.ink || (g.ink = card.makeInk(handInk(g.name, g.st, CARD.w, CARD.h, 14, BOX, 1)));
  let carbonInk = null, carbonU = -1, carbonCv = null;
  function carbonInkAt(u) {
    const q = Math.round(u * 60) / 60;
    if (q === carbonU && carbonInk) return carbonInk;
    carbonU = q;
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
  const r2 = () => vt - K[1], r3 = () => vt - K[2];

  // ---- les places (repère de la feuille : son centre, mm) ----
  const TOP = SHEET.h / 2;
  // la carte question : en bas de la feuille, sous la signature (elle dépasse un peu en bas s'il le faut)
  const QY = Math.min(-SHEET.h / 2 + CARD.h / 2 - 4, (o.sigY ?? -60) - 7 - CARD.h / 2);
  const Q_REST = { x: vQ.jx * 2, y: QY + vQ.jy, z: 0.45, rz: -0.03 + vQ.jr };
  // elle sort simplement du haut de l'écran, face cachée, et descend se poser (droite, sans détour)
  function questionRel() {
    const u = easeOut(span(0.1, 1.9, vt));
    return M4.model(0, 0, Q_REST.rz, Q_REST.x, lerp(TOP + 170, Q_REST.y, u), Q_REST.z + 4 * (1 - u));
  }
  // l'enveloppe : dressée (le rabat à droite), elle arrive de la gauche et se pose sur la feuille
  const ENV_Z = -0.2;
  function envRel() {
    const u = ease(span(0, 1.3, r2()));
    return M4.mul(T(-(ENV.h + 40) * (1 - u), 0, ENV_Z), M4.model(0, 0, -Math.PI / 2));
  }
  const PP0 = PO.flap[0] - 0.05, R2_FLAP = 2.5;
  const ppOf = () => Math.min(PO.seal[1] + 0.4, PP0 + Math.max(0, r2() - R2_FLAP) * 1.35);
  // la carte vierge, posée sur l'enveloppe (repère de la feuille), logo gaufré vers nous ; le fil passe sur elle
  const B_REST = [-12, -26, ENV_Z + 3.25];                                 // (au-dessus du dos bombé de l'enveloppe pleine)
  const zBack = 1.95;
  // la carte vierge : elle arrive du haut de l'écran et se pose sur l'enveloppe ; puis elle vient devant
  const FRONT = [0, 4, 24];
  function blankRel() {
    const ud = easeOut(span(1.1, 2.4, r2()));
    let p = [B_REST[0], lerp(TOP + 190, B_REST[1], ud), B_REST[2] + 3 * (1 - ud)], ry = Math.PI, rx = 0, rz = 0;
    const ul = ease(span(0.3, 1.6, r3()));
    if (ul > 0) { p = mix3(p, FRONT, ul); p[2] += 16 * Math.sin(Math.PI * ul); ry = Math.PI * (1 + ul); rx = -0.12 * Math.sin(Math.PI * ul); rz = 0; }
    const br = sstep(1.6, 2.4, r3());
    return M4.model(rx + br * 0.02 * Math.sin(vt * 0.9), ry, rz + br * 0.01 * Math.sin(vt * 0.6), p[0], p[1], p[2]);
  }

  // ---- ce que sheet.js reprend : l'enveloppe (dans le repère de la feuille), la feuille, la caméra ----
  function envState() {
    if (!on() || vt <= K[1]) return null;
    const fade = r3() > 0 ? 1 - ease(span(0.5, 1.6, r3())) : 1;            // la carte vierge vient devant : l'enveloppe s'efface
    return { ev: 0, pp: ppOf(), fade, rel: envRel(), bulge: sstep(0.8, 1.3, r2()), flapDz: 1.9, sealRot: Math.PI / 2 };
  }
  // (la feuille et la carte question, une fois l'enveloppe posée dessus : cachées — elles sont dedans)
  const sheetState = () => (on() && vt > K[1] + 1.35 ? { hide: true } : null);
  // la vue : celle de la feuille ; un peu plus large seulement si la carte ou l'enveloppe dépasse, et elle revient
  function camera(f, frameFor, W, H) {
    if (!on()) return null;
    const lg = c => ({ cx: c.cx, cy: c.cy, lD: Math.log(c.D) });
    const mixC = (a, b, u) => ({ cx: lerp(a.cx, b.cx, u), cy: lerp(a.cy, b.cy, u), lD: lerp(a.lD, b.lD, u) });
    const bot = Math.min(-SHEET.h / 2, QY - CARD.h / 2 - 2, -ENV.w / 2), top = Math.max(SHEET.h / 2, ENV.w / 2);
    const B = lg(frameFor(SY + bot - 8, SY + top + 4, -SHEET.w / 2, SHEET.w / 2, SHEET.w * 1.1, W, H));
    const wide = ease(span(1.2, 2.4, vt)) * (1 - ease(span(0.6, 1.8, r3())));
    const c = mixC(lg(f.A), B, wide);
    return Number.isFinite(c.cx + c.cy + c.lD) ? c : null;
  }
  // la lampe se tourne vers l'objet qu'on regarde (l'enveloppe : la direction réglée pour le cachet)
  function focus() {
    if (!on()) return null;
    if (vt > K[1]) return { x: 0, y: SY, envW: r3() > 0 ? 1 - 0.5 * sstep(0, 1.5, r3()) : sstep(0, 1.2, r2()) };
    return null;
  }

  // ---- dessin de ce qui est propre à la vitrine ----
  function draw(vp, eye, P, Msheet, Menv, t) {
    if (!on()) return { occ: null };
    let occ = null;
    const drawCard = (M, v, x = {}) => card.draw(vp, eye, P, { model: M, lod: 'fine', ...v, ...x });
    // la carte question (face cachée) : du haut de l'écran à la feuille, puis dans l'enveloppe
    if (vt < K[1] + 1.4) {
      const Mq = M4.mul(Msheet, questionRel());
      drawCard(Mq, vQ);
      if (vt > 1.8) occ = { m: Mq };
    }
    // la carte vierge (sur l'enveloppe, puis devant nous) ; le carbone ; le timbre
    if (vt > K[1] + 1.0) {
      const Mb = M4.mul(Msheet, blankRel()), rr = r3();
      drawCard(Mb, vB, { logoK: 1, inkBack: rr > 2.7 ? nameInk(G[0]) : null });
      if (rr > 1.9 && rr < 5.1) {
        const ui = ease(span(2.0, 2.6, rr)), uo = ease(span(4.3, 5.0, rr)), wr = span(2.7, 4.1, rr);
        const Mc = M4.mul(Mb, M4.model(0, 0, -0.02 * (1 - ui) - 0.1 * uo, CARB_OFF[0] + 130 * (1 - ui) + 150 * uo, CARB_OFF[1] - 6 * uo, 0.55 + 6 * Math.sin(Math.PI * ui) * (1 - ui) + 16 * Math.sin(Math.PI * Math.min(1, uo * 1.3))));
        card.draw(vp, eye, { ...P, ...CARBON_P }, { model: Mc, lod: 'carbon', ...vC, noLogo: true, inkBack: rr > 2.65 ? carbonInkAt(wr) : null, paperTile: 40, paperLo: 0.5, fade: sstep(1.95, 2.2, rr) * (1 - sstep(4.7, 5.05, rr)) });
      }
      if (rr > 5.0) {
        const u = easeOut(span(5.05, 5.6, rr));
        card.draw(vp, eye, P, { model: M4.mul(Mb, M4.model(0.3 * (1 - u), 0, lerp(0.45, 0.06, u), STAMP_AT[0] + 16 * (1 - u), STAMP_AT[1] + 20 * (1 - u), STAMP_AT[2] + 36 * (1 - u) * (1 - u))),
          lod: 'stamp', ...vS, inkBack: stamp(), logoScale: [0.3, 0.3], logoOff: [0, 1.2], fade: sstep(5.05, 5.25, rr) });
      }
    }
    return { occ };
  }

  function free() {
    for (const g of G) if (g.ink) card.freeInk(g.ink);
    if (carbonInk) card.freeInk(carbonInk);
    if (stampTex) card.freeInk(stampTex);
  }
  return { on, update, go, jump, state: () => ({ vt, target, k, arrived: vt === target, keys: VKEYS }), envState, sheetState, camera, focus, draw, free };
}
