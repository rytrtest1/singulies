// La carte mystère et le fil (11/10 ; 12/10 : un module, pour la vitrine ET l'enveloppe envoyée après le paiement) :
// au dos de l'enveloppe, sous le cachet, la carte vierge arrive du bas et se pose ; un seul fil, à deux bouts : chacun
// sort d'un petit trou percé de l'intérieur (à 9 mm du bord gauche, du bord droit), court sur le dos, monte sur la
// carte, et ils se nouent au centre de la carte (une boucle de chaque côté, deux bouts qui pendent).
// Repère : celui de l'enveloppe, sans échelle (mm du monde de la feuille). r : secondes depuis le début (0 → MYST_T).
import { M4, CARD } from '../cards/cardRenderer.js';
import { ENV, FLAP_H, SEAL_OFF } from '../sheet/envelope.js';
import { createThread, pathLen, FIL_R } from './thread.js';

export const MYST_T = 4.0;
const CARD_S = Math.SQRT1_2, CW = CARD.w * CARD_S, CH = CARD.h * CARD_S;   // la feuille est une A4 : la carte à sa taille
const clamp01 = u => Math.min(1, Math.max(0, u));
const span = (a, b, x) => clamp01((x - a) / (b - a));
const easeOut = u => 1 - Math.pow(1 - clamp01(u), 3);
const lerp = (a, b, u) => a + (b - a) * u;
const S = k => new Float32Array([k, 0, 0, 0, 0, k, 0, 0, 0, 0, k, 0, 0, 0, 0, 1]);
const ap = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];

// variant() : un papier tiré (comme les autres cartes)
export function createMystery(gl, card, variant) {
  const thread = createThread(gl);
  const vM = variant();
  const SEAL_Y = ENV.h / 2 - FLAP_H + SEAL_OFF;              // le cachet (sur la pointe du rabat)
  const MY_Y = SEAL_Y - 12 - CH / 2;                         // la carte : juste sous le cachet
  const BACK_Z = 1.6 + ENV.t / 2;                            // la surface du dos
  // le dos bombé (l'enveloppe pleine) : nul sur les bords, ≈ 1,2 mm au centre
  const bulgeAt = (x, y) => 1.2 * Math.max(0, 1 - (x / (ENV.w / 2)) ** 2) * Math.max(0, 1 - (y / (ENV.h / 2)) ** 2);
  const CARD_Z = BACK_Z + bulgeAt(0, MY_Y) + 0.32;
  // (12/10, Maxence) elle arrive du bas, comme la carte question (elle ne passe jamais sur le cachet)
  const local = r => { const u = easeOut(span(0.25, 1.45, r)); return M4.model(0, 0, -0.012, 0, lerp(MY_Y - 170, MY_Y, u), CARD_Z + 14 * (1 - u) * (1 - u)); };
  const HOLE_X = ENV.w / 2 - 9;
  const onBack = (x, y, lift = 0.42) => [x, y, BACK_Z + bulgeAt(x, y) + lift];
  const onCard = (x, y, lift = 0) => [x, y, CARD_Z + 0.6 + lift];
  function strand(side) {
    const sg = side, pts = [], y = MY_Y + 0.4 * sg;
    // il sort du trou (d'abord sous la surface : il émerge)
    pts.push([-sg * HOLE_X, y, BACK_Z - 0.4], [-sg * HOLE_X, y, BACK_Z + 0.1]);
    for (let i = 1; i <= 24; i++) { const x = -sg * HOLE_X + sg * (HOLE_X - CW / 2 - 1.5) * i / 24; pts.push(onBack(x, y + 0.25 * Math.sin(i * 0.7 + side))); }
    // il monte sur le bord de la carte
    pts.push(onCard(-sg * (CW / 2 + 0.5), y, -0.3), onCard(-sg * (CW / 2 - 1.5), y));
    for (let i = 1; i <= 12; i++) { const x = -sg * (CW / 2 - 1.5) + sg * (CW / 2 - 1.5 - 1.6) * i / 12; pts.push(onCard(x, y)); }
    // le nœud : une boucle, puis le bout qui pend (un peu différent de chaque côté) — à la taille de la carte (A4)
    const lp = [[-1.2, 0.8], [-6, 5.6], [-12.5, 5.4], [-15, 1], [-11, -1.8], [-3, -1.2], [0.8, 0.3]].map(([a, b]) => [a * CARD_S, b * CARD_S]);
    for (const [a, b] of lp) pts.push(onCard(sg * a, y + b, 0.3));
    const tail = (side > 0 ? [[-1.8, -4], [-4.2, -10], [-6.6, -17]] : [[-1.2, -4.2], [-2.8, -11], [-4.2, -18.5]]).map(([a, b]) => [a * CARD_S, b * CARD_S]);
    for (const [a, b] of tail) pts.push(onCard(sg * a, y + b, 0.2));
    return pts;
  }
  const STR = [strand(1), strand(-1)], STR_L = STR.map(pathLen);
  // Me : le repère de l'enveloppe (sans échelle) ; r : secondes ; fade
  function draw(vp, eye, P, Me, r, fade = 1) {
    if (r <= 0) return;
    const Mf = M4.mul(M4.mul(Me, local(r)), S(CARD_S));
    card.draw(vp, eye, P, { model: M4.mul(Mf, M4.model(0, Math.PI, 0)), lod: 'fine', ...vM, logoK: 1, fade });
    const g = span(1.35, 3.8, r);
    if (g > 0) {
      const e = g < 0.5 ? 2 * g * g : 1 - Math.pow(-2 * g + 2, 2) / 2;
      STR.forEach((pts, i) => thread.draw(vp, eye, P, pts.map(p => ap(Me, p)), FIL_R, { upTo: STR_L[i] * e, pitch: 1.5, fade }));
    }
  }
  return { draw, free: () => thread.free() };
}
