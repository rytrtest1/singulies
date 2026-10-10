// La vitrine (11/10, alt.html) : ce qu'il y a dans l'envoi, joué EN DIRECT dans la scène de la feuille, sans bouger la
// vue (la feuille garde sa taille et sa place ; le cadre ne s'élargit qu'un peu, si un objet dépasse, et revient) — un
// fil noir fait le lien d'une étape à l'autre (le fil rouge), et annonce la guirlande :
//   0 la feuille ; le fil pend sous « JEU », en haut
//   1 la carte question descend de « JEU » (face cachée), le fil la suit, elle se pose en bas de la feuille
//   2 l'enveloppe (dressée, à la place de la feuille) glisse sur la feuille et la carte ; une carte vierge descend le
//     long du fil (enfilée par ses trous), se pose sur l'enveloppe ; le fil en fait le tour et la tient ; le rabat se
//     ferme sur elle ; le cachet de cire
//   3 le fil glisse, la carte vierge vient devant ; le carbone blanc, son prénom écrit à la main (en noir sur le carbone),
//     le carbone se soulève (le prénom blanc), le timbre ; le fil passe par ses trous et file vers d'autres cartes à
//     prénoms qu'on devine aux bords : la guirlande des SINGULIES (le fil du poignet reste une surprise)
// Tout est une fonction de l'horloge vt (s) : reculer rejoue à l'envers. sheet.js dessine la feuille, l'enveloppe et le
// cachet (ses horloges, sans retournement ; l'enveloppe dans le repère de la feuille), la vitrine le reste.
import { M4, CARD } from '../cards/cardRenderer.js';
import { ENV, PO } from '../sheet/envelope.js';
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

// les étapes (s) : la carte, l'enveloppe, la carte vierge et la guirlande
const D = [2.6, 6.2, 6.0];
export const VKEYS = D.reduce((a, d) => (a.push(a[a.length - 1] + d), a), [0]);
const K = VKEYS;
const BACK_SPEED = 2.6;
const OTHERS = ['Julie', 'Isabelle', 'Marysol', 'Anaïs', 'Lou', 'Nour', 'Sacha', 'Inès', 'Hugo', 'Yanis', 'Camille', 'Léon', 'Mila', 'Noé', 'Rose', 'Jade', 'Tom', 'Zoé', 'Malo', 'Lina'];
const N = 180;                                                                // points du fil (pour passer d'une forme à l'autre)

// un chemin rééchantillonné à N points, à pas égal
function resample(pts, n = N) {
  const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]));
  const tot = L[L.length - 1] || 1, out = []; let j = 1;
  for (let i = 0; i < n; i++) {
    const s = tot * i / (n - 1); while (j < pts.length - 1 && L[j] < s) j++;
    const a = pts[j - 1], b = pts[j], u = (L[j] - L[j - 1]) > 0 ? (s - L[j - 1]) / (L[j] - L[j - 1]) : 0;
    out.push(mix3(a, b, clamp01(u)));
  }
  return out;
}
const blendPath = (A, B, u) => A.map((p, i) => mix3(p, B[i], u));
const seg = (a, b, n = 12) => Array.from({ length: n }, (_, i) => mix3(a, b, (i + 1) / n));

export function createVitrine(o) {
  const { gl, card, rnd, PRENOM, SY, SHEET, reduced } = o;
  const base = o.base || './';
  const thread = createThread(gl);
  card.addShape('carbon', { w: 102, h: 66, r: 0.5, t: 0.05 });
  card.addShape('stamp', { w: 20, h: 24, r: 0.25, t: 0.06 });
  card.addShape('hole', { w: 3.4, h: 3.4, r: 1.7, t: 0.02 });
  const variant = () => ({ seed: rnd() * 100, paperXf: [rnd.range(-2.5, 2.5), rnd.range(-1.5, 1.5), rnd() < 0.5 ? 0 : Math.PI, 0],
    logoOff: [rnd.range(-0.15, 0.15), rnd.range(-0.15, 0.15)], warp: [rnd.range(0.05, 0.3), rnd.range(-0.18, 0.04), rnd.range(-0.1, 0.1)],
    jx: rnd.range(-0.6, 0.6), jy: rnd.range(-0.5, 0.5), jr: rnd.range(-0.015, 0.015) });
  const vQ = o.top || variant(), vB = variant(), vC = { ...variant(), warp: [0, 0, 0] }, vS = variant();
  // les écritures de cette visite (la sienne d'abord) et les prénoms des cartes voisines
  const hands = handOrder();
  const others = OTHERS.filter(n => n.toLowerCase() !== PRENOM.toLowerCase()).sort(() => Math.random() - 0.5).slice(0, 2);
  const G = [{ name: PRENOM, font: hands[0], v: vB, k: 0 }, ...others.map((name, i) => ({ name, font: hands[i + 1], v: variant(), k: i ? 1 : -1 }))];
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
  const HX = CARD.w / 2 - 5, HY = -3;                                        // les trous de la carte vierge : côtés gauche et droit

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
  const ANCHOR = [0, TOP + 150, 18];                                        // au-dessus de l'écran, sous « JEU »
  // la carte question : en bas de la feuille, sous la signature (elle dépasse un peu en bas s'il le faut)
  const QY = Math.min(-SHEET.h / 2 + CARD.h / 2 - 4, (o.sigY ?? -60) - 7 - CARD.h / 2);
  const Q_REST = { x: vQ.jx * 2, y: QY + vQ.jy, z: 0.45, rz: -0.03 + vQ.jr };
  function questionRel() {                                                   // elle descend de « JEU », face cachée
    const u = ease(span(0.15, 2.3, vt));
    const y = lerp(TOP + 110, Q_REST.y, u), x = lerp(0, Q_REST.x, u);
    const sw = (1 - u) * 0.08 * Math.sin(vt * 5);
    return M4.model(-0.2 * (1 - u), 0, lerp(0.12, Q_REST.rz, u) + sw, x, y, Q_REST.z + 26 * (1 - u) * Math.sin(Math.PI * Math.min(1, u * 1.1)) + 8 * (1 - u));
  }
  // l'enveloppe : dressée (le rabat à droite), elle arrive de la gauche et se pose sur la feuille
  const ENV_Z = -0.2;
  function envRel() {
    const u = ease(span(0, 1.3, r2()));
    return M4.mul(T(-(ENV.h + 40) * (1 - u), 0, ENV_Z), M4.model(0, 0, -Math.PI / 2));
  }
  const PP0 = PO.flap[0] - 0.05, R2_FLAP = 4.0;
  const ppOf = () => Math.min(PO.seal[1] + 0.4, PP0 + Math.max(0, r2() - R2_FLAP) * 1.35);
  // la carte vierge, posée sur l'enveloppe (repère de la feuille), logo gaufré vers nous ; le fil passe sur elle
  const B_REST = [-12, -26, ENV_Z + 3.25];                                 // (au-dessus du dos bombé de l'enveloppe pleine)
  const zBack = 1.95;
  // la carte vierge : elle descend de « JEU » enfilée sur le fil, se pose sur l'enveloppe ; puis elle vient devant
  const FRONT = [0, 4, 24];
  function blankRel(Ms) {
    const ud = ease(span(1.3, 2.9, r2()));
    let p = [lerp(0, B_REST[0], ud), lerp(TOP + 110, B_REST[1], ud), lerp(28, B_REST[2], ud)], ry = Math.PI, rx = -0.2 * (1 - ud), rz = 0.1 * (1 - ud) * Math.sin(vt * 4);
    const ul = ease(span(0.3, 1.6, r3()));
    if (ul > 0) { p = mix3(p, FRONT, ul); p[2] += 16 * Math.sin(Math.PI * ul); ry = Math.PI * (1 + ul); rx = -0.12 * Math.sin(Math.PI * ul); rz = 0; }
    const br = sstep(1.6, 2.4, r3());
    return M4.model(rx + br * 0.02 * Math.sin(vt * 0.9), ry, rz + br * 0.01 * Math.sin(vt * 0.6), p[0], p[1], p[2]);
  }
  // les cartes voisines de la guirlande, qu'on devine aux bords
  const nbRel = g => M4.model(0.04 * Math.sin(vt * 0.5 + g.k), 0.05 * Math.sin(vt * 0.45 + g.k * 2), 0.03 * Math.sin(vt * 0.8 + g.k * 1.3), FRONT[0] + 112 * g.k, FRONT[1] + 2 * Math.sin(vt * 0.7 + g.k), FRONT[2] - 8);

  // ---- le fil : une forme par étape, et il passe de l'une à l'autre ----
  const wob = (i, a) => a * Math.sin(vt * 0.9 + i * 0.37);
  function hangPath() {                                                     // il pend sous « JEU »
    const end = [0.6 * Math.sin(vt * 0.8), TOP + 6, 10];
    return seg(ANCHOR, end, 40).map((p, i) => [p[0] + wob(i, 0.4) * (i / 40), p[1], p[2]]);
  }
  function trailPath(Mq) {                                                  // il suit la carte question, jusqu'à son coin
    const c = ap(Mq, [CARD.w / 2 - 4, CARD.h / 2 + 1, 0.4]), side = [SHEET.w / 2 + 4, TOP - 30, 6];
    const mid = [lerp(ANCHOR[0], side[0], 0.6), TOP + 40, 12];
    const pts = [ANCHOR]; pts.push(...seg(ANCHOR, mid, 20), ...seg(mid, [lerp(side[0], c[0], 0.3), lerp(side[1], c[1], 0.3), 7], 20), ...seg([lerp(side[0], c[0], 0.3), lerp(side[1], c[1], 0.3), 7], c, 20));
    return pts;
  }
  function vPath(Mb) {                                                      // enfilée par les trous de la carte vierge
    const l = ap(Mb, [-HX, HY, 0]), r = ap(Mb, [HX, HY, 0]), lb = ap(Mb, [-HX, HY, 0.8]), rb = ap(Mb, [HX, HY, 0.8]);
    const a1 = [ANCHOR[0] - 5, ANCHOR[1], ANCHOR[2]], a2 = [ANCHOR[0] + 5, ANCHOR[1], ANCHOR[2]];
    return [a1, ...seg(a1, l, 30), lb, rb, ...seg(r, a2, 30)];
  }
  function loopPath(Me) {                                                   // il fait le tour de l'enveloppe et tient la carte
    // (repère de l'enveloppe : une boucle le long de son grand côté, à la hauteur de la carte vierge)
    const xl = -B_REST[1], pts = [], h2 = ENV.h / 2 + 0.5;
    const inCard = y => { const d = Math.max(0, Math.abs(y - (B_REST[0])) - CARD.w / 2); return 1 - sstep(0, 1.6, d); };
    const bulge = y => 1.2 * Math.max(0, 1 - (xl / (ENV.w / 2)) ** 2) * Math.max(0, 1 - (y / (ENV.h / 2)) ** 2);
    for (let y = -h2; y <= h2; y += 3) pts.push([xl, y, lerp(zBack + bulge(y) + 0.55, 3.95, inCard(y))]);
    for (let i = 1; i < 6; i++) { const a = Math.PI * i / 6; pts.push([xl, h2 + 0.9 * Math.sin(a), zBack / 2 + (zBack / 2 + 0.9) * Math.cos(a) - 0.2]); }
    for (let y = h2; y >= -h2; y -= 3) pts.push([xl, y, -0.45]);
    for (let i = 1; i <= 6; i++) { const a = Math.PI * i / 6; pts.push([xl, -h2 - 0.9 * Math.sin(a), zBack / 2 - (zBack / 2 + 0.9) * Math.cos(a) - 0.2]); }
    return pts.map(p => ap(Me, p));
  }
  function garlandPath(Ms, sag) {                                           // par les trous : la guirlande
    const ord = G.map((g, i) => ({ g, M: Ms[i] })).sort((a, b) => a.g.k - b.g.k), pts = [];
    const sagTo = (a, b, s, n = 16) => { for (let j = 1; j <= n; j++) { const u = j / n, p = mix3(a, b, u); p[1] -= s * 4 * u * (1 - u); pts.push(p); } };
    const f0 = ap(ord[0].M, [-HX, HY, 0.8]), start = [f0[0] - 110, f0[1] + 10, f0[2]];
    pts.push(start); sagTo(start, f0, sag * 0.6);
    ord.forEach(({ M }, i) => {
      pts.push(ap(M, [-HX, HY, -0.8]), ap(M, [HX, HY, -0.8]));
      const rf = ap(M, [HX, HY, 0.8]); pts.push(rf);
      if (i < ord.length - 1) sagTo(rf, ap(ord[i + 1].M, [-HX, HY, 0.8]), sag);
      else sagTo(rf, [rf[0] + 110, rf[1] + 10, rf[2]], sag * 0.6);
    });
    return pts;
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
  // ready : la feuille est posée (0 → 1) — le fil n'apparaît qu'alors
  function draw(vp, eye, P, Msheet, Menv, t, ready = 1) {
    if (!on()) {                                                            // la feuille seule : le fil pend sous « JEU »
      if (ready > 0.01) thread.draw(vp, eye, P, hangPath().map(p => ap(Msheet, p)), 0.45, { fade: ready });
      return { occ: null };
    }
    let occ = null;
    const drawCard = (M, v, x = {}) => card.draw(vp, eye, P, { model: M, lod: 'fine', ...v, ...x });
    const drawStamp = (M, fade = 1) => card.draw(vp, eye, P, { model: M, lod: 'stamp', ...vS, inkBack: stamp(), logoScale: [0.3, 0.3], logoOff: [0, 1.2], fade });
    // la carte question (face cachée) : de « JEU » à la feuille, puis dans l'enveloppe
    let Mq = null;
    if (vt < K[1] + 1.4) {
      Mq = M4.mul(Msheet, questionRel());
      drawCard(Mq, vQ, { fade: sstep(0.05, 0.4, vt) });
      if (vt > 2.1) occ = { m: Mq };
    }
    // la carte vierge (enfilée sur le fil, puis sur l'enveloppe, puis devant nous) ; le carbone ; le timbre
    let Mb = null;
    if (vt > K[1] + 1.2) {
      Mb = M4.mul(Msheet, blankRel());
      const rr = r3();
      drawCard(Mb, vB, { logoK: 1, inkBack: rr > 2.7 ? nameInk(G[0]) : null, fade: sstep(K[1] + 1.25, K[1] + 1.6, vt) });
      if (rr > 1.9 && rr < 5.1) {
        const ui = ease(span(2.0, 2.6, rr)), uo = ease(span(4.3, 5.0, rr)), wr = span(2.7, 4.1, rr);
        const Mc = M4.mul(Mb, M4.model(0, 0, -0.02 * (1 - ui) - 0.1 * uo, CARB_OFF[0] + 130 * (1 - ui) + 150 * uo, CARB_OFF[1] - 6 * uo, 0.55 + 6 * Math.sin(Math.PI * ui) * (1 - ui) + 16 * Math.sin(Math.PI * Math.min(1, uo * 1.3))));
        card.draw(vp, eye, { ...P, ...CARBON_P }, { model: Mc, lod: 'carbon', ...vC, noLogo: true, inkBack: rr > 2.65 ? carbonInkAt(wr) : null, paperTile: 40, paperLo: 0.5, fade: sstep(1.95, 2.2, rr) * (1 - sstep(4.7, 5.05, rr)) });
      }
      if (rr > 5.0) {
        const u = easeOut(span(5.05, 5.6, rr));
        drawStamp(M4.mul(Mb, M4.model(0.3 * (1 - u), 0, lerp(0.45, 0.06, u), STAMP_AT[0] + 16 * (1 - u), STAMP_AT[1] + 20 * (1 - u), STAMP_AT[2] + 36 * (1 - u) * (1 - u))), sstep(5.05, 5.25, rr));
      }
      const hf = sstep(1.0, 1.6, rr);                                       // les trous (visibles une fois devant nous)
      if (hf > 0.01) for (const sx of [-HX, HX]) card.draw(vp, eye, { ...P, albedo: 0, spec: 0, env: 0, sheen: 0, glint: 0 }, { model: M4.mul(Mb, T(sx, HY, 0.1)), lod: 'hole', noLogo: true, fade: hf });
    }
    // les cartes voisines (on les devine aux bords)
    const Ms = [Mb];
    if (vt > K[2]) {
      const rr = r3();
      for (const g of G.slice(1)) {
        const M = M4.mul(Msheet, nbRel(g)); Ms.push(M);
        const fade = sstep(0.9, 1.9, rr);
        if (fade < 0.01) continue;
        drawCard(M, g.v, { logoK: 1, inkBack: nameInk(g), fade });
        for (const sx of [-HX, HX]) card.draw(vp, eye, { ...P, albedo: 0, spec: 0, env: 0, sheen: 0, glint: 0 }, { model: M4.mul(M, T(sx, HY, 0.1)), lod: 'hole', noLogo: true, fade });
      }
    }
    // ---- le fil : d'une forme à l'autre ----
    let path = resample(hangPath().map(p => ap(Msheet, p)));
    if (vt > 0 && Mq) {
      path = blendPath(path, resample(trailPath(questionRel()).map(p => ap(Msheet, p))), ease(span(0.05, 0.9, vt)));
    }
    if (vt > K[1]) {
      const r = r2();
      // il quitte la carte question (entrée dans l'enveloppe) et va chercher la carte vierge en haut
      const trail = resample(trailPath(questionRel()).map(p => ap(Msheet, p)));
      const vB_ = Mb ? resample(vPath(blankRel()).map(p => ap(Msheet, p))) : resample(hangPath().map(p => ap(Msheet, p)));
      path = blendPath(trail, vB_, ease(span(0.6, 1.6, r)));
      if (Menv) path = blendPath(path, resample(loopPath(Menv)), ease(span(2.9, 3.9, r)));
    }
    if (vt > K[2] && Menv && Mb) {
      const rr = r3(), garl = resample(garlandPath(Ms.length === G.length ? Ms : [Mb, Mb, Mb], lerp(14, 8, sstep(3, 4, rr))));
      path = blendPath(resample(loopPath(Menv)), garl, ease(span(0.1, 1.8, rr)));
    }
    thread.draw(vp, eye, P, path, 0.45);
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
