// La vitrine (11/10, alt.html) : ce qu'il y a dans l'envoi, joué EN DIRECT dans la scène de la feuille — rien ne bouge
// tout seul : on avance (ou on recule) d'une étape en faisant défiler la page, ou avec les flèches, à tout moment, et tout
// se rejoue dans l'ordre. La vue reste celle de la feuille (elle s'élargit à peine si un objet dépasse), sauf pour le
// cachet, qu'on regarde se faire de près, comme dans le parcours.
//   0 la feuille
//   1 la carte question arrive du bas de l'écran et se pose à cheval sur le bas de la feuille (face cachée)
//   2 l'enveloppe arrive de côté, dressée, et avale la feuille et la carte ; elle tourne (le cachet reste au milieu, la vue
//     s'en approche) jusqu'à se coucher ; le rabat se ferme, la cire, le cachet
//   3 l'enveloppe s'en va ; la carte mystère (couchée, logo gaufré) arrive du bas ; un fil noir s'enroule autour et la tient
// Tout est une fonction de l'horloge vt (s) : reculer rejoue à l'envers. sheet.js dessine la feuille, l'enveloppe et le
// cachet (ses horloges, sans retournement ; l'enveloppe dans le repère de la feuille), la vitrine le reste.
import { M4, CARD } from '../cards/cardRenderer.js';
import { ENV, PO, FLAP_H } from '../sheet/envelope.js';
import { createThread, pathLen } from './thread.js';

const clamp01 = u => Math.min(1, Math.max(0, u));
const sstep = (a, b, x) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const ease = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
const easeOut = u => 1 - Math.pow(1 - clamp01(u), 3);
const lerp = (a, b, u) => a + (b - a) * u;
const span = (a, b, x) => clamp01((x - a) / (b - a));
const T = (x, y, z) => M4.model(0, 0, 0, x, y, z);
const ap = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];

// les étapes (s) : la carte, l'enveloppe et le cachet, la carte mystère
const D = [2.0, 5.6, 5.2];
export const VKEYS = D.reduce((a, d) => (a.push(a[a.length - 1] + d), a), [0]);
const K = VKEYS;
const BACK_SPEED = 2.6;

export function createVitrine(o) {
  const { gl, card, rnd, SY, SHEET, reduced } = o;
  const thread = createThread(gl);
  const variant = () => ({ seed: rnd() * 100, paperXf: [rnd.range(-2.5, 2.5), rnd.range(-1.5, 1.5), rnd() < 0.5 ? 0 : Math.PI, 0],
    logoOff: [rnd.range(-0.15, 0.15), rnd.range(-0.15, 0.15)], warp: [rnd.range(0.05, 0.3), rnd.range(-0.18, 0.04), rnd.range(-0.1, 0.1)],
    jx: rnd.range(-0.6, 0.6), jy: rnd.range(-0.5, 0.5), jr: rnd.range(-0.015, 0.015) });
  const vQ = o.top || variant(), vM = variant();

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
  const BOT = -SHEET.h / 2;
  // la carte question : à cheval sur le bas de la feuille, sous la signature
  const QY = Math.min(BOT + 8, (o.sigY ?? -60) - 6 - CARD.h / 2);
  const Q_REST = { x: vQ.jx * 2, y: QY + vQ.jy, z: 0.45, rz: -0.025 + vQ.jr };
  function questionRel() {                                                   // du bas de l'écran, droite, sans détour
    const u = easeOut(span(0.05, 1.8, vt));
    return M4.model(0, 0, Q_REST.rz, Q_REST.x, lerp(BOT - 230, Q_REST.y, u), Q_REST.z + 3 * (1 - u));
  }
  // l'enveloppe : dressée, elle arrive de la gauche et avale la feuille ; puis elle tourne autour du cachet jusqu'à se
  // coucher (le cachet reste au même endroit, au milieu de la vue qui s'en approche) ; enfin elle s'en va
  const ENV_Z = -0.2, SEAL_L = ENV.h / 2 - FLAP_H + 7, PIV = [SEAL_L, 0];   // le cachet (repère de l'enveloppe : (0, SEAL_L))
  const rzOf = () => -Math.PI / 2 * (1 - ease(span(1.3, 2.7, r2())));
  function envRel() {
    const rz = rzOf(), us = ease(span(0, 1.2, r2()));
    const cx = PIV[0] + SEAL_L * Math.sin(rz), cy = PIV[1] - SEAL_L * Math.cos(rz);   // centre = pivot − R(rz)·(0, SEAL_L)
    const away = ease(span(0.1, 1.3, r3()));
    return M4.mul(T(cx - (ENV.h + 40) * (1 - us), cy - 260 * away, ENV_Z), M4.model(0, 0, rz));
  }
  const PP0 = PO.flap[0] - 0.05;
  const ppOf = () => Math.min(PO.seal[1] + 0.3, PP0 + Math.max(0, r2() - 2.65));
  // la carte mystère : couchée, logo gaufré vers nous ; le fil s'enroule autour (trois tours en biais) et la tient
  const MC = [0, 6, 14];
  function mysteryFrame() {
    const u = easeOut(span(0.5, 1.8, r3())), br = sstep(1.8, 2.6, r3());
    return M4.model(br * 0.025 * Math.sin(vt * 0.7), br * 0.04 * Math.sin(vt * 0.5 + 1), -0.02 + br * 0.012 * Math.sin(vt * 0.6), MC[0], lerp(BOT - 200, MC[1], u), MC[2]);
  }
  // le fil autour de la carte (repère de la carte, face vers nous = +z) : il entre par le haut à gauche, fait trois tours
  // en biais (devant de haut en bas, derrière en remontant), puis finit noué sur le haut, un bout qui pend
  const WRAP = (() => {
    const h2 = CARD.h / 2 + 0.35, zf = 0.42, pts = [];
    const edge = (x, y, from, to) => { for (let i = 1; i <= 6; i++) { const a = from + (to - from) * i / 6; pts.push([x, y + Math.sign(y) * 0.35 * Math.sin(Math.PI * i / 6), zf * Math.cos(a)]); } };
    const xs = [-17, -9, -1, 7];
    pts.push([-31, h2 + 13, 1.2], [-26, h2 + 7, 0.9], [-21, h2 + 2.5, 0.6], [xs[0] - 3, h2, zf]);
    for (let i = 0; i < 3; i++) {
      const a = xs[i], b = xs[i + 1];
      for (let j = 1; j <= 10; j++) { const u = j / 10; pts.push([a - 3 + 6 * u, h2 - 2 * h2 * u, zf]); }    // devant, en descendant
      edge(a + 3, -h2, 0, Math.PI);                                                                       // sous le bord
      for (let j = 1; j <= 10; j++) { const u = j / 10; pts.push([a + 3 + (b - 3 - a - 3) * u, -h2 + 2 * h2 * u, -zf]); }   // derrière, en remontant
      edge(b - 3, h2, Math.PI, 2 * Math.PI);                                                              // par-dessus le bord
    }
    // le nœud, puis le bout qui pend
    const e = pts[pts.length - 1];
    pts.push([e[0] + 2, e[1] + 0.8, zf + 0.5], [e[0] + 3.4, e[1] - 0.6, zf + 0.7], [e[0] + 2.2, e[1] - 1.8, zf + 0.6], [e[0] + 3.6, e[1] - 6, zf + 0.5], [e[0] + 5, e[1] - 12, zf + 0.6], [e[0] + 5.6, e[1] - 17, zf + 0.8]);
    return pts;
  })();
  const WRAP_L = pathLen(WRAP);

  // ---- ce que sheet.js reprend : l'enveloppe (dans le repère de la feuille), la feuille, la caméra ----
  function envState() {
    if (!on() || vt <= K[1]) return null;
    const fade = r3() > 0 ? 1 - sstep(0.6, 1.3, r3()) : 1;
    return { ev: 0, pp: ppOf(), fade, rel: envRel(), bulge: sstep(0.8, 1.2, r2()), flapDz: 0, sealRot: -rzOf() };
  }
  // (la feuille et la carte question, une fois l'enveloppe posée dessus : cachées — elles sont dedans)
  const sheetState = () => (on() && vt > K[1] + 1.25 ? { hide: true } : null);
  // la vue : celle de la feuille (un peu plus large si la carte dépasse en bas) ; de près sur le cachet ; puis la feuille
  function camera(f, frameFor, W, H) {
    if (!on()) return null;
    const lg = c => ({ cx: c.cx, cy: c.cy, lD: Math.log(c.D) });
    const mixC = (a, b, u) => ({ cx: lerp(a.cx, b.cx, u), cy: lerp(a.cy, b.cy, u), lD: lerp(a.lD, b.lD, u) });
    const bot = Math.min(BOT, QY - CARD.h / 2 - 3);
    const AC = lg(frameFor(SY + bot - 8, SY + SHEET.h / 2 + 4, -SHEET.w / 2, SHEET.w / 2, SHEET.w * 1.1, W, H));
    let c = mixC(lg(f.A), AC, ease(span(0.3, 1.7, vt)));
    if (vt > K[1]) {                                                         // le cachet, de près
      const S = lg(frameFor(SY + PIV[1] - 42, SY + PIV[1] + 42, PIV[0] - 46, PIV[0] + 46, 92, W, H));
      c = mixC(c, S, ease(span(1.25, 2.9, r2())));
    }
    if (vt > K[2]) c = mixC(c, lg(f.A), ease(span(0.1, 1.5, r3())));       // puis la feuille, de nouveau
    return Number.isFinite(c.cx + c.cy + c.lD) ? c : null;
  }
  function focus() {
    if (!on() || vt <= K[1]) return null;
    if (vt > K[2]) return { x: MC[0], y: SY + MC[1], envW: 1 - 0.5 * sstep(0, 1.2, r3()) };
    return { x: PIV[0], y: SY + PIV[1], envW: sstep(0, 1.2, r2()) };
  }

  // ---- dessin de ce qui est propre à la vitrine ----
  function draw(vp, eye, P, Msheet) {
    if (!on()) return { occ: null };
    let occ = null;
    if (vt < K[1] + 1.3) {                                                   // la carte question
      const Mq = M4.mul(Msheet, questionRel());
      card.draw(vp, eye, P, { model: Mq, lod: 'fine', ...vQ });
      if (vt > 1.6) occ = { m: Mq };
    }
    if (vt > K[2] + 0.45) {                                                  // la carte mystère, et le fil qui l'enroule
      const Mf = M4.mul(Msheet, mysteryFrame());
      card.draw(vp, eye, P, { model: M4.mul(Mf, M4.model(0, Math.PI, 0)), lod: 'fine', ...vM, logoK: 1 });
      const u = span(1.75, 4.4, r3());
      if (u > 0) thread.draw(vp, eye, P, WRAP.map(p => ap(Mf, p)), 0.4, { upTo: WRAP_L * (u * (2 - u)), taper: true, pitch: 1.5 });
    }
    return { occ };
  }

  function free() { thread.free(); }
  return { on, update, go, jump, state: () => ({ vt, target, k, arrived: vt === target, keys: VKEYS }), envState, sheetState, camera, focus, draw, free };
}
