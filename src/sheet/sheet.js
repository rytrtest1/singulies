// Scène 3 — la feuille (nuit du 05 au 06/10, proposition). Même monde, même caméra, même lampe que la scène des
// cartes, qui lui passe la main sans coupure (snapshot : matrices des cartes, prénom, caméra, lampe).
// 1) La paire se referme : la carte réponse se glisse exactement sous la question et s'y fond ; la carte se
//    soulève, se retourne en l'air (la réponse est au dos de la question : une carte, deux faces) et va se poser
//    sur le bas d'une feuille A5 noire qui arrive du fond (logo gaufré à sec en tête, comme un papier à lettres).
// 2) Le prénom devient l'acrostiche : chaque lettre quitte le haut de l'écran, l'une après l'autre, et vient se
//    poser en colonne sur la feuille (une espace = une strophe) ; à l'arrivée elle s'allume un peu (absorbée).
//    Puis la lumière parcourt la colonne de haut en bas (le prénom se lit), et un curseur de machine respire à
//    côté de la première lettre : c'est là que le poème sera tapé.
// 3) L'enveloppe (08/10 : plus de choix « par la poste » / « en direct ») : quelques secondes après (jamais moins
//    de 3 s après le dernier geste), ou en glissant vers le haut, la feuille part directement dans l'enveloppe.
//    `?commande=1` : l'ancienne commande (deux cartes, « par la poste » et « en direct »).
// Toucher la carte : elle se retourne (question ↔ réponse). Retour : le temps remonte (tout se défait dans l'ordre
// inverse, les lettres remontent à leur place), puis la scène des cartes revient.
// Tout ce qui arrive est une fonction du temps de la scène (τ) : le retour n'est que τ qui décroît.
import { LUM } from '../app/lum.js';
import { M4, CARD } from '../cards/cardRenderer.js';
import { makeInkMap, makeAnswerInk, TYPE } from '../cards/ink.js';
import { createRng } from '../field/rng.js';
import { releaseCanvas } from '../app/compat.js';
import { handName } from '../text/accents.js';
import {
  ENV, ENV_BACK_H, FLAP_H, ENV_Z, SEAL_D, SEAL_K, SEAL_IN, SEAL_WOB, SEAL_LOOK0, SEAL_SHAPE0, sealDraw, sealForm, SEAL_PRESS0, envPieces, E, ADDR, SENDER, senderCount, PO, STAMPED, MAIL_W, FIELDS, emailOk, telOk,
  fieldsReady, fieldsOut, contactOk, cleanContact, fieldPos, senderInk, fieldsInk, contactCardInk,
} from './envelope.js';
import { typeLines } from './typewriter.js';
import { createVitrine } from '../vitrine/vitrine.js';
import { createThread } from '../vitrine/thread.js';
// (d'autres modules importent ces noms depuis sheet.js)
export { ENV, FIELDS, MAIL_W, addressInk, fieldsInk } from './envelope.js';

export const SHEET = { w: 148, h: 210, r: 0.6, t: 0.1 };
// liens de la commande : null = lien d'attente (« bientôt »)
export const ORDER_LINKS = { poste: null, direct: null };
const ORDERS = [{ id: 'poste', label: 'par la poste' }, { id: 'direct', label: 'en direct' }];

const FOV = 26 * Math.PI / 180, TILT = 0.22, TF = Math.tan(FOV / 2);
export const LOGO_Y = SHEET.h / 2 - 21;                 // logo en tête de feuille (centre, mm)
export const LOGO_K = 0.4;                              // ≈ 15 mm (le logo des cartes fait 38,5)
export const COL_X = -SHEET.w / 2 + 34;                 // marge de la colonne (un bloc de poème centré sur la page)
const C_OVER = 15;                               // la carte recouvre le bas de la feuille (mm)
export const C_POSE = { x: 26, y: -SHEET.h / 2 + C_OVER - CARD.h / 2, rz: -0.07 };
const O_GAP = 13;
const O_X = 10;                                  // la commande descend en cascade depuis la carte, un peu à droite

// temps de la scène (s)
const SHEET_IN = [0.15, 1.9];                    // la feuille arrive du fond
const MERGE = [0, 0.55];                         // la carte réponse se glisse sous la question et s'y fond
const CARD_MOVE = [0.35, 2.0];                   // la carte va se poser sur la feuille (en se retournant)
const FLY_AT = 1.05, FLY_GAP = 0.27, FLY_T = 1.35;
const CAM_T = 2.4;
const C_IN = { x: 14, y: -56, rz: -0.03, z: 0.3 };                  // la carte, posée sur la feuille pour entrer
const FD_IN = [1.6, 3.1];                        // (alt) la carte face cachée glisse sur la feuille
const FD_Y = -SHEET.h / 2 + CARD.h / 2 + 10;     // … et s'y pose entière, sous le nom, centrée (10/10 : rien ne dépasse de la feuille)
const ENVELOPE = new URLSearchParams(location.search).get('enveloppe') !== '0';   // ?enveloppe=0 : « bientôt » comme avant
// 08/10 : plus de commande — l'acrostiche posé, on passe directement à l'enveloppe (?commande=1 : les deux cartes)
const ORDERS_ON = new URLSearchParams(location.search).get('commande') === '1' || !ENVELOPE;
// ?adresse=0 (essai avec des amis, 06/10) : pas de choix ni d'adresse — après l'acrostiche, l'enveloppe se fait
// et part seule, la demande est envoyée (sans adresse ni contact), puis l'écran principal
// (10/10) merci.html, après le paiement : l'adresse est chez Stripe — l'enveloppe se fait et part seule, comme l'essai
// (10/10) pour.html : la personne à qui l'on offre répond ; l'adresse est chez Stripe, avec la commande
export const NOADDR = new URLSearchParams(location.search).get('adresse') === '0' || ['merci', 'pour'].includes(globalThis.document?.documentElement?.dataset?.page);
const ENV_LAMP = +new URLSearchParams(location.search).get('lampeEnv') || SEAL_SHAPE0.lamp;   // distance de la lampe sur l'enveloppe (× celle des cartes)

const clamp01 = u => Math.min(1, Math.max(0, u));
const sstep = (a, b, x) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const ease = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
const lerp = (a, b, u) => a + (b - a) * u;
const span = (r, x) => clamp01((x - r[0]) / (r[1] - r[0]));
const hop = ph => 3.2 * sstep(0, 0.16, ph) * (1 - sstep(0.16, 0.45, ph)) + 1.1 * sstep(0.45, 0.57, ph) * (1 - sstep(0.57, 0.85, ph));
const lerpM = (a, b, u) => { const o = new Float32Array(16); for (let i = 0; i < 16; i++) o[i] = a[i] + (b[i] - a[i]) * u; return o; };
const T = (x, y, z) => M4.model(0, 0, 0, x, y, z);
const S = k => new Float32Array([k, 0, 0, 0, 0, k, 0, 0, 0, 0, k, 0, 0, 0, 0, 1]);
const rotOf = m => { const o = new Float32Array(m); o[12] = o[13] = o[14] = 0; return o; };
const posOf = m => [m[12], m[13], m[14]];
const apply = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
// une lettre ou une carte qui voyage : translation interpolée (+ décalage), rotation interpolée (proches)
function blendM(a, b, u, off = [0, 0, 0]) {
  const R = lerpM(rotOf(a), rotOf(b), u), pa = posOf(a), pb = posOf(b);
  R[12] = lerp(pa[0], pb[0], u) + off[0]; R[13] = lerp(pa[1], pb[1], u) + off[1]; R[14] = lerp(pa[2], pb[2], u) + off[2];
  return R;
}

// opts : { card (renderer), nameR, look, from (snapshot de la scène des cartes), seed, reduced, on: { order, back } }
export function createSheetScene(gl, opts) {
  const { card, nameR, look: L, from, on = {} } = opts;
  const reduced = !!opts.reduced;
  let HOLD = !!opts.hold;   // (10/10, version alternative) la feuille reste : ni enveloppe ni commande (le paiement vient après)
  // l'adresse : par page (merci, essai sans adresse) ou par feuille (alt.html, une fois payé : elle est chez Stripe)
  let noAddr = opts.noAddr ?? NOADDR;
  const rnd = createRng(opts.seed ?? ((Math.random() * 1e9) >>> 0));
  const emit = (k, d) => { try { on[k] && on[k](d); } catch (e) { console.error(e); } };
  const P_LOGO = (P => new URLSearchParams(location.search).get(P))('logoFeuille') !== '0';
  card.addShape('sheet', { ...SHEET, fine: P_LOGO ? [10, 10, 0.25, 0, LOGO_Y] : null });
  card.addShape('env', { ...ENV, fine: null });
  card.addShape('envBack', { ...ENV, h: ENV_BACK_H, fine: null });
  card.addShape('flap', { ...ENV, h: FLAP_H, fine: null });
  // le cachet de cire argenté (06/10) : un disque bombé, le logo frappé en creux
  const SD = sealDraw(rnd);                                  // ce cachet-ci (forme tirée une fois)
  const sealLod = card.addShape('seal-' + SD.wobPhase.toFixed(3), { w: SEAL_D, h: SEAL_D, r: SEAL_D / 2, t: 0.2, fine: [SEAL_D / 2 + 1, SEAL_D / 2 + 1, 0.2, 0, 0], seg: 48, wobble: SEAL_WOB, wobPhase: SD.wobPhase, alwaysFine: true });
  // le rabat du bas, au dos : la poche d'une vraie enveloppe (ses bords en biais se voient, sous le rabat du haut)
  card.addShape('botFlap', { ...ENV, fine: null });
  const pv = () => ({ seed: rnd() * 100, paperXf: [rnd.range(-2.5, 2.5), rnd.range(-1.5, 1.5), rnd() < 0.5 ? 0 : Math.PI, 0],
    warp: [rnd.range(0.05, 0.15), rnd.range(-0.08, 0), 0], paperTile: 0.6 * CARD.w / 0.7, paperLo: 0.35, noLogo: true });
  const envV = { front: pv(), back: pv(), flap: { ...pv(), noLogo: true, warp: [0, 0, 0] } };
  // matière du cachet : métal argenté (diffus faible, reflet serré, la pièce s'y reflète), logo frappé profond ;
  // face 1 vers l'extérieur (rabat fermé, retourné) : logo en creux, remis à l'endroit (échelle y négative) ; bombé
  const sealV = { seed: rnd() * 100, paperXf: [0, 0, 0, 0], paperLo: 0.7,   // la cire : grain et marbrure (photo du papier, 09/10)
    logoOff: [0, 0], logoScale: [SEAL_K, -SEAL_K], warp: [0, 0, 0],
    seal: [1, SEAL_IN, SEAL_D / 2, SEAL_WOB] };
  // cire argentée (référence du 09/10) : argent satiné, clair, presque mat — reflet large et doux, fines paillettes ;
  // logo en relief arrondi
  const SEAL_LOOK = { ...SEAL_LOOK0 };
  // forme du cachet et ce qui l'entoure (réglables : scene-cartes.html?cachet&reponse=…, panneau « cachet »)
  const SEAL_SHAPE = { ...SEAL_SHAPE0, offX: SD.offX, offY: SD.offY, envAz: +(new URLSearchParams(location.search).get('lampeAz') ?? SEAL_SHAPE0.envAz),
    lamp: ENV_LAMP, zoom: 1, camDy: 0, rotX: 0, rotY: 0, lampAz: NaN, lampEl: NaN };
  const sealPQ = () => ({ sealP: [SEAL_SHAPE.hd, SEAL_SHAPE.hc, SEAL_SHAPE.crest, SEAL_SHAPE.ring], sealQ: [SEAL_SHAPE.pits, SEAL_SHAPE.cavWall, SEAL_SHAPE.cavEdge, SEAL_SHAPE.aoW] });
  const botV = { ...pv(), noLogo: true, warp: [0, 0, 0] };

  const sheetV = {
    seed: rnd() * 100, paperXf: [rnd.range(-2.5, 2.5), rnd.range(-1.5, 1.5), rnd() < 0.5 ? 0 : Math.PI, 0],
    warp: [rnd.range(0.35, 0.6), rnd.range(-0.35, -0.15), rnd.range(-0.2, 0.2)],
    logoOff: [0, LOGO_Y], logoScale: [LOGO_K, LOGO_K], noLogo: !P_LOGO,
    // papier d'une feuille : plus lisse qu'une carte (nuages atténués), motif de ≈ 75 mm (0,6 × 87 / 0,7)
    paperTile: 0.6 * CARD.w / 0.7, paperLo: 0.35,
  };

  // ---- la carte posée sur la feuille ----
  // réponse : une carte, deux faces — la question au recto (celle qu'on a tirée), la réponse tapée au dos ;
  // carte blanche : le thème au recto, « carte blanche » au dos ; improvisation : pas de carte
  let C = null;
  if (from.question && from.answer) {
    const v = from.question.v;
    const back = makeAnswerInk(from.answer.text, Math.floor(v.seed * 1000) + 11, 3, 0);
    C = { v, front: from.question.ink, back: card.makeInk(back.canvas), M0: from.question.M, A0: from.answer.M, av: from.answer.v,
      phi0: Math.PI, phi1: 2 * Math.PI, ownBack: true };
  } else if (from.blank) {
    const v = from.blank.v;
    const fr = makeAnswerInk(from.blank.text, Math.floor(v.seed * 1000) + 7, 3, 0);
    C = { v, front: card.makeInk(fr.canvas), back: from.blank.labelInk, M0: from.blank.M, phi0: Math.PI, phi1: Math.PI, ownFront: true };
  } else if (HOLD && from.top && !opts.noTopCard) {   // (10/10 : retirée en alt, elle distrayait)
    // (10/10, alt.html) la carte du dessus du paquet, posée face cachée sur la feuille : la question viendra après le
    // paiement (c'est cette carte, au même papier, que le paquet tire ensuite)
    C = { v: from.top, front: null, back: null, faceDown: true, phi0: 0, phi1: 0, leaveT: null };
  }
  if (C) { C.flips = 0; C.flipA = 0; C.flipT0 = -1; }

  // ---- l'acrostiche : une ligne par caractère du prénom (une espace = une ligne blanche, entre deux strophes) ----
  const name = from.name || '';
  // l'invitation du destinataire : le prénom du poème, accentué (« Léa nom ») — on l'écrit, rien n'est pré-rempli
  // le prénom du destinataire : déjà écrit, celui du poème, accentué (on peut le changer) — 09/10
  const PRENOM = handName(name).slice(0, 15), HINTS = {};
  const chars = [...name];
  nameR.letters(chars);
  const nLines = chars.length;
  // (10/10) l'acrostiche toujours centré sur la feuille : entre le haut (sous le logo) et le bas — ou, quand la carte
  // face cachée est posée sur la feuille (alt), le haut de la carte ; l'interligne se resserre s'il le faut
  const FD = !!(C && C.faceDown), colTop = SHEET.h / 2 - 32, colBot = FD ? FD_Y + CARD.h / 2 + 10 : -SHEET.h / 2 + 18;
  const lead = nLines > 1 ? Math.min(10.5, 148 / (nLines - 1), FD ? (colTop - colBot - 6) / (nLines - 1) : Infinity) : 10.5;
  const cap = Math.min(6.4, lead * 0.6), emT = cap / nameR.capHeight;
  // bloc un peu remonté quand la carte (réponse) recouvre le bas ; (alt) centré au-dessus de la carte posée sur la feuille
  const yc = C ? (FD ? (colTop + colBot) / 2 + cap / 2 : -6) : 0;
  const baseOf = k => yc + ((nLines - 1) / 2 - k) * lead - cap / 2;
  // départ : la lettre telle que la scène des cartes l'a laissée (monde, à plat)
  const starts = [];
  { let gi = 0; chars.forEach((ch, i) => { if (ch === ' ') { starts.push(null); return; } const g = from.glyphs[gi++]; starts.push(g ? T(g.x, g.base, 0) : null); }); }
  // la feuille se pose sous le prénom (son haut à 14 mm sous les lettres) : les lettres y descendent
  const gb = from.glyphs.length ? from.glyphs : [{ base: 0 }];
  const nameBot = Math.min(...gb.map(g => g.base)), nameTop = Math.max(...gb.map(g => g.base)) + from.em * nameR.capHeight;
  const SY = nameBot - 14 - SHEET.h / 2;
  const EC_Y = SY - 156;                                    // l'enveloppe : sa poche juste sous la feuille (pivotée)
  const flyers = [];
  { let k = 0; chars.forEach((ch, i) => { if (ch === ' ' || !starts[i]) return; flyers.push({ i, ch, at: FLY_AT + k * FLY_GAP + rnd.range(-0.05, 0.06), dur: FLY_T * rnd.range(0.92, 1.1), side: rnd.range(24, 34), lift: rnd.range(6, 12), g0: from.glow[i] ?? 0.9, k: 0.8 + 0.2 * rnd(), dec: 1.4 + 1.2 * rnd() }); k++; }); }
  const landAll = flyers.length ? Math.max(...flyers.map(f => f.at + f.dur)) : FLY_AT;
  const READ_AT = landAll + 0.9, READ_GAP = 0.2;            // la lumière parcourt la colonne
  const CURSOR_AT = READ_AT + flyers.length * READ_GAP * 0.6 + 0.4;
  const INTRO_END = Math.max(CURSOR_AT + 1, CARD_MOVE[1], SHEET_IN[1]);
  // curseur : une espace après la première lettre, sur sa ligne de base (mm, face lue)
  const first = chars.findIndex(c => c !== ' ');
  // lignes à écrire : un souligné à la machine à droite de chaque lettre, tapé quand elle se pose (fin commune,
  // marge droite = marge de la colonne)
  // (10/10, Maxence) les lettres centrées entre elles sur l'axe de la colonne ; la colonne et ses lignes, ensemble, centrées
  // sur la feuille (même marge à gauche de la colonne qu'à droite des lignes) ; les lignes partent toutes du même bord
  const W_COL = Math.max(0, ...chars.filter(c => c !== ' ').map(c => nameR.adv(c))) * emT;
  const COL_C = COL_X + W_COL / 2;                          // l'axe de la colonne
  const letX = ch => COL_C - nameR.adv(ch) * emT / 2;
  const RULE_X0 = COL_X + W_COL + TYPE.pitch * 1.2;
  const RULE_X1 = -COL_X;
  const rulesOf = tu => flyers.map((f, k) => {
    const x0 = RULE_X0;
    const u = reduced ? (tu > f.at + f.dur ? 1 : 0) : clamp01((tu - (f.at + f.dur + 0.12)) / 0.55);
    return [baseOf(f.i) - 0.9, x0, u, k + 1];
  });
  // la signature (09/10, Maxence : « comme à la machine, c'est ce que je fais ») : - ETERNEL -, calée à gauche sur la
  // colonne, juste sous la dernière ligne de l'acrostiche (10/10 : on signe le poème), tapée frappe par frappe une fois les lignes
  // tracées. Encre propre à la feuille (face lue = face 0 : inkBack), 8 px/mm, mise à jour par zone.
  const SIG = { text: '- ETERNEL -', px: 8, ch: 0.085 };
  SIG.x = COL_X;
  SIG.y = baseOf(nLines - 1) - Math.max(lead * 1.6, 14);   // (10/10, Maxence) un peu d'air entre le poème et la signature
  SIG.at = (flyers.length ? Math.max(...flyers.map(f => f.at + f.dur)) : FLY_AT) + 0.12 + 0.55 + 0.5;
  const sigCount = tu => reduced ? (tu > SIG.at ? SIG.text.length : 0) : Math.max(0, Math.min(SIG.text.length, Math.floor((tu - SIG.at) / SIG.ch) + 1));
  let sigTex = null, sigN = 0;
  function renderSig(n) {
    const PX = SIG.px;
    if (!sigTex) {                                              // la feuille entière, noire : l'encre est posée par zones
      const full = new OffscreenCanvas(Math.round(SHEET.w * PX), Math.round(SHEET.h * PX)), fx = full.getContext('2d');
      fx.fillStyle = '#000'; fx.fillRect(0, 0, full.width, full.height);
      sigTex = card.makeInk(full, true); releaseCanvas(full);
    }
    const bx = SHEET.w / 2 + SIG.x - 3, by = SHEET.h / 2 - SIG.y - 6, bw = SIG.text.length * TYPE.pitch + 8, bh = 10;
    const cv = new OffscreenCanvas(Math.round(bw * PX), Math.round(bh * PX)), cx = cv.getContext('2d');
    cx.fillStyle = '#000'; cx.fillRect(0, 0, cv.width, cv.height);
    cx.translate(-Math.round(bx * PX), -Math.round(by * PX));
    typeLines(cx, PX, [SIG.text], SHEET.w / 2 + SIG.x, SHEET.h / 2 - SIG.y, 0, 4049, 0.92, '#fff', n);
    card.updateInk(sigTex, cv, Math.round(bx * PX), Math.round(by * PX)); releaseCanvas(cv);
    sigN = n;
  }
  const cursorMM = first >= 0 ? { x: RULE_X0, y: baseOf(first) - 0.5 } : { x: 0, y: 0 };

  // ---- la commande ----
  const orders = (ORDERS_ON ? ORDERS : []).map((o, k) => {
    const v = { seed: rnd() * 100, paperXf: [rnd.range(-2.5, 2.5), rnd.range(-1.5, 1.5), rnd() < 0.5 ? 0 : Math.PI, 0], logoOff: [rnd.range(-0.15, 0.15), rnd.range(-0.15, 0.15)],
      warp: [rnd.range(0.05, 0.35), rnd.range(-0.2, 0.05), rnd.range(-0.12, 0.12)], jx: rnd.range(-1.5, 1.5), jr: rnd.range(-0.025, 0.025) };
    return { ...o, k, v, ink: card.makeInk(makeInkMap(o.label, Math.floor(v.seed * 1000) + 5).canvas), anim: null, a: 0, press: 0, bph: rnd() * 6.28 };
  });
  let soonInk = null;
  const oTop = (C ? C_POSE.y - CARD.h / 2 : -SHEET.h / 2) - 22;
  const oPose = o => ({ x: O_X + o.v.jx, y: SY + oTop - CARD.h / 2 - o.k * (CARD.h + O_GAP), rz: o.v.jr });

  // ---- caméra : départ = celle de la scène des cartes ; A = la feuille et sa carte ; B = la commande ----
  const frames = { A: null, B: null, AN: null, E: null, F: null, Fc: null };
  function frameFor(y0, y1, x0, x1, wantW, W, H) {
    const Hw = Math.max((y1 - y0) * 1.1, Math.max(wantW, (x1 - x0) * 1.08) * H / W);
    return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, D: Hw / (2 * TF), Hw };
  }
  // (10/10, alt) une réserve en bas de l'écran (la légende, la flèche, le bandeau qui viendront) : la feuille se cadre
  // entière dans ce qui reste au-dessus — la vue est calculée pour la hauteur utile, puis prolongée vers le bas
  // (11/10) et une réserve en haut (le bandeau des pages), et une feuille un peu plus petite (les pages voisines se
  // devinent sur les côtés) : sheetZoom(W, H) ≤ 1
  function frameAbove(y0, y1, x0, x1, wantW, W, H) {
    const ins = Math.min(H * 0.45, Math.max(0, opts.insetBottom ? opts.insetBottom() : 0));
    const top = Math.min(H * 0.2, Math.max(0, opts.insetTop ? opts.insetTop() : 0)), z = opts.sheetZoom ? opts.sheetZoom(W, H) : 1;
    if (!ins && !top && z === 1) return frameFor(y0, y1, x0, x1, wantW, W, H);
    const He = H - ins - top, f = frameFor(y0, y1, x0, x1, wantW, W, He), Hw = f.Hw / z * H / He;
    return { cx: f.cx, cy: f.cy + (top + He / 2 - H / 2) * Hw / H, D: Hw / (2 * TF), Hw };
  }
  function layout(W, H) {
    const cBot = C && !C.faceDown ? C_POSE.y - CARD.h / 2 : -SHEET.h / 2;   // (alt) la carte est SUR la feuille : même cadrage
    frames.A = frameAbove(SY + cBot - 8, SY + SHEET.h / 2 + 4, -SHEET.w / 2, SHEET.w / 2, SHEET.w * 1.1, W, H);
    // tant que les lettres sont en haut : la feuille et le prénom au-dessus
    frames.AN = frameAbove(SY + cBot - 8, Math.max(SY + SHEET.h / 2 + 4, nameTop + 8), -SHEET.w / 2, SHEET.w / 2, SHEET.w * 1.1, W, H);
    const oBot = oTop - 2 * CARD.h - O_GAP;
    const x0 = O_X - CARD.w / 2 - 2, x1 = Math.max(O_X + CARD.w / 2, C ? C_POSE.x + CARD.w / 2 : 0) + 2;
    // l'enveloppe sous la feuille ; puis l'adresse (téléphone : de près ; ordinateur : l'enveloppe entière)
    frames.E = frameFor(EC_Y - ENV.h / 2 - 8, SY + SHEET.h / 2 + 8, -ENV.w / 2, ENV.w / 2, ENV.w * 1.1, W, H);
    // (l'adresse et, sous l'enveloppe, POSTER : le clavier ouvert ne doit cacher ni l'une ni l'autre)
    const ax = -ENV.w / 2 + ADDR.x + 15 * TYPE.pitch, ay = EC_Y + ENV.h / 2 - (ADDR.y - 6 + ENV.h + 16) / 2;
    frames.F = W < H * 1.1 ? frameFor(ay - 30, ay + 30, ax - 50, ax + 50, 0, W, H) : frameFor(EC_Y - ENV.h / 2 - 12, EC_Y + ENV.h / 2 + FLAP_H + 4, -ENV.w / 2 - 8, ENV.w / 2 + 8, 0, W, H);   // (ordinateur : avec le rabat ouvert)
    // l'expéditeur, en haut à gauche : la vue s'en approche pendant qu'il se tape (le coin de l'enveloppe)
    const qx = -ENV.w / 2 + SENDER.x + 5 * TYPE.pitch, qy = EC_Y + ENV.h / 2 - (SENDER.y + SENDER.lead);
    frames.Fs = W < H * 1.1 ? frameFor(qy - 22, qy + 22, qx - 34, qx + 34, 0, W, H) : frameFor(qy - 30, qy + 30, qx - 48, qx + 70, 0, W, H);
    // envoyée : l'enveloppe entière, avec de l'air (elle se retourne et bascule)
    // (09/10 : avec son rabat ouvert, qui dépasse en haut, jusqu'à ce qu'il se ferme)
    frames.P = frameFor(EC_Y - ENV.h / 2 - 24, EC_Y + ENV.h / 2 + FLAP_H + 6, -ENV.w / 2 - 14, ENV.w / 2 + 14, 0, W, H);
    frames.B = frameFor(SY + oBot - 6, SY + (C ? C_POSE.y + CARD.h / 2 : -SHEET.h / 2 + 30) + 6, x0, x1, CARD.w / 0.78, W, H);
  }

  // ---- état ----
  let t0 = -1, lastT = 0, backing = null, done = false, lastGesture = -99;
  let sv = 0, sT = 0, svV = 0;                               // 0 = la feuille, 1 = la commande
  let orderAt = -1, chosen = null;
  const camS = { cx: 0, cy: from.cam.cy, D: from.cam.D };
  const lamp = { ...from.lamp };
  const ap = { x: from.ap.x, y: from.ap.y, vx: 0, vy: 0 };
  const tilt = { x: 0, y: 0 }, ts = { x: from.ts?.x || 0, y: from.ts?.y || 0 };
  let vp = null, eye = null, W = 1, H = 1, lastMsheet = T(0, 0, 0), lastMenv = null;
  // enveloppe : { t0, back: null | { t0, e0 }, postT, pu, writing, text, ink, cursor, sent }
  let env = null, kbPx = 0, kb = 0;
  const EC = { x: 0, y: EC_Y, z: ENV_Z };
  const envClock = t => !env ? 0 : env.back ? Math.max(0, env.back.e0 - (t - env.back.t0) * 2.2 / SLOW) : (t - env.t0) / SLOW;
  // (10/10, alt) la vitrine : ce qu'il y a dans l'envoi, joué ici même, de la feuille de la personne (src/vitrine)
  const VIT = HOLD && opts.vitrine ? createVitrine({ gl, card, rnd, PRENOM, SY, EC, SHEET, C_POSE, C_IN, reduced, top: from.top || null, base: opts.base || './', sigY: SIG.y }) : null;
  let vOcc = null;
  // (11/10, Maxence) les lignes à écrire, à droite des lettres : un fil noir cousu (le même fil partout) — il sort de la
  // feuille à gauche, court jusqu'à la marge, y rentre ; il se coud à mesure que chaque lettre se pose
  const fil = createThread(gl), FIL_R = 0.26;
  function rulePath(y, x0, u) {
    const x1 = RULE_X1, xe = x0 + (x1 - x0) * u, zt = SHEET.t / 2 + FIL_R + 0.35, pts = [[x0 - 0.25, y, -0.4], [x0 + 0.4, y, zt * 0.7]];
    for (let x = x0 + 1.2; x < xe; x += 1.2) pts.push([x, y + 0.05 * Math.sin(x * 0.7 + y), zt + 0.05 * Math.sin(x * 1.3 + y * 2)]);
    pts.push([xe, y, zt]);
    if (u >= 1) pts.push([x1 + 0.4, y, zt * 0.7], [x1 + 1.05, y, -0.4]);
    return pts;
  }
  const quads = {};

  // τ : temps de la scène ; au retour il redescend (le temps remonte)
  // tout va ≈ 1,45 × plus vite qu'à l'origine, de la réponse donnée jusqu'à l'adresse (Maxence 06/10) ; ?lent=k ralentit
  const SPEED = 1.45;
  const FAST = opts.fast || 1;   // (10/10, alt) la feuille et la descente des lettres plus vives (l'envoi garde son rythme)
  const SLOW = (+(new URLSearchParams(location.search).get('lent') || 1) || 1) / SPEED;   // captures : temps ralenti
  const LENT = SLOW * SPEED;                                 // (l'envoi garde son propre rythme : seul ?lent l'allonge)
  function tau(t) {
    if (!backing) return (t - t0) * FAST / SLOW;
    return Math.max(0, backing.tau0 - (t - backing.t0) * 2.4 * FAST / SLOW);
  }

  // ---- lumière (celle de la scène des cartes) ----
  const CAM_AZ = -Math.PI / 2, wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
  let envW = 0;                                              // 0 → 1 : la vue est sur l'enveloppe
  function stepLight(dt, t) {
    const kk = Math.min(1, dt * 3); ts.x += (tilt.x - ts.x) * kk; ts.y += (tilt.y - ts.y) * kk;
    const backDir = CAM_AZ + Math.PI, lim = Math.PI - L.lampGap;
    const bAz = Number.isFinite(L.breathFixAz) ? L.breathFixAz : L.breathAz * (0.72 * Math.sin(t * 0.33) + 0.28 * Math.sin(t * 0.69 + 1.3));
    const bEl = Number.isFinite(L.breathFixEl) ? L.breathFixEl : L.breathEl * (0.7 * Math.sin(t * 0.27 + 2.1) + 0.3 * Math.sin(t * 0.61 + 0.4));
    let rel = wrapA(L.lightAz + bAz + 1.2 * L.tiltAmp * L.lightVar * ts.x - backDir);
    rel = lim * Math.tanh(rel / lim);
    // l'enveloppe : la lampe vient de la direction réglée pour le cachet (Maxence 09/10), en respirant un peu autour
    rel = lerp(rel, SEAL_SHAPE.envAz + 0.35 * bAz, envW);
    const mid = (L.elMin + L.elMax) / 2, half = (L.elMax - L.elMin) / 2;
    let e = L.elBase + bEl + ts.y * L.elevAmp * L.lightVar;
    e = mid + half * Math.tanh((e - mid) / half);
    const w = 2.2, z = 0.85, da = wrapA(backDir + rel - lamp.a);
    lamp.va += (w * w * da - 2 * z * w * lamp.va) * dt; lamp.a += lamp.va * dt;
    lamp.ve += (w * w * (e - lamp.e) - 2 * z * w * lamp.ve) * dt; lamp.e += lamp.ve * dt;
  }

  // respiration d'un objet (celle des cartes) ; wt = 1 : en focus (suit l'inclinaison), 0 : respire seul
  function group(px, py, ph, wt, tiltK, t) {
    const sw = (reduced ? 0 : L.sway) * 0.5 * (1 - wt) * tiltK;
    const crx = -ts.y * L.cardTilt * tiltK, cry = ts.x * L.cardTilt * tiltK;
    const rx = crx * wt + sw * (0.6 * Math.sin(t * 0.61 + ph) + 0.4 * Math.sin(t * 1.37 + 2.1 * ph));
    const ry = cry * wt + sw * 1.2 * (0.6 * Math.sin(t * 0.47 + 1.7 * ph) + 0.4 * Math.sin(t * 1.13 + 0.6 * ph));
    const dz = sw * 12 * Math.sin(t * 0.29 + ph);
    return M4.mul(M4.mul(T(px, py, dz), M4.model(rx, ry, 0)), T(-px, -py, 0));
  }

  function frame(t, dt, w, h) {
    if (t0 < 0) t0 = t;
    lastT = t; W = w; H = h;
    layout(W, H);
    const tu = tau(t);
    if (backing && tu <= 0 && !backing.fired) { backing.fired = true; emit('back', {}); }
    if (VIT) VIT.update(dt);
    const V = VIT && VIT.on() ? VIT : null, VE = V && !env ? V.envState() : null;   // la vitrine : son enveloppe (sans adresse)
    const ev = VE ? VE.ev : envClock(t);
    if (env && env.back && ev <= 0) closeEnv();
    const inEnv = !!env || !!VE;
    // envoyée : horloge propre, qui redescend au retour
    if (env) env.pp = Math.max(0, env.pp + (env.postT >= 0 ? 1 : -2.5) * dt / LENT);
    const pp = VE ? VE.pp : env ? env.pp : 0, posting = isPosting();
    if (env && env.ink && !noAddr) {
      const sn = senderCount(ev);
      if (sn !== env.senderN) { env.senderN = sn; const r = senderInk(991, sn); card.updateInk(env.ink, r.canvas, r.x, r.y); releaseCanvas(r.canvas); }
    }
    // le coup de tampon (jamais incliné pareil ; le retour l'efface)
    if (env && !noAddr && (pp >= PO.hit) !== !!env.stamp) {
      if (pp >= PO.hit && env.stampPre) {                      // préparé au toucher de POSTER : ici, seulement l'envoi au GPU
        env.stamp = env.stampPre.stamp; card.updateInk(env.ink, env.stampPre.canvas, 0, 0); releaseCanvas(env.stampPre.canvas);
        env.cursor = env.stampPre.cursor; env.stampPre = null;
      } else {
        env.stamp = pp >= PO.hit ? newStamp() : null;
        renderAddress();
      }
    }
    const writePhase = !!env && !env.back && ev >= E.write && !posting && !noAddr;
    // essai sans adresse : retournée, l'enveloppe part d'elle-même
    if (noAddr && env && !env.back && env.postT < 0 && ev >= E.write + 0.5) { env.postT = t; env.sent = false; }

    if (!env && !backing && ENVELOPE && !HOLD && tu > CURSOR_AT + 0.3) prepareEnv();
    // passage automatique vers la commande : le curseur posé, et jamais moins de 3 s après le dernier geste
    if (!backing && !HOLD && orderAt < 0 && tu > CURSOR_AT + 1.8 && t - lastGesture > 3) showOrders(t);
    if (backing) sT = 0;
    // ressort de la vue (feuille ↔ commande)
    { const w2 = reduced ? 30 : 2.4; svV += (w2 * w2 * (sT - sv) - 2 * w2 * svV) * dt; sv += svV * dt; }
    const s = clamp01(sv);
    const uCam = inEnv ? sstep(E.cam[0], E.cam[1], ev) : 0;
    const sL = s * (1 - uCam);                                // ce que la vue « commande » retire à la feuille
    const writingNow = (env && env.writing) || (direct && direct.writing);
    kb += ((writingNow && kbPx > 40 ? 1 : 0) - kb) * Math.min(1, dt * 4);
    if (direct) direct.pu += ((direct.postT >= 0 ? 1 : 0) - direct.pu) * Math.min(1, dt * 1.1);

    // caméra : de celle des cartes à la feuille (τ), puis feuille ↔ commande (s), puis l'enveloppe
    const ci = reduced ? sstep(0, 0.6, tu) : ease(clamp01(tu / CAM_T));
    const fB = frames.B, an = sstep(landAll - 0.5, landAll + 1.9, tu);
    const fA = { cx: lerp(frames.AN.cx, frames.A.cx, an), cy: lerp(frames.AN.cy, frames.A.cy, an), D: Math.exp(lerp(Math.log(frames.AN.D), Math.log(frames.A.D), an)) };
    const es = ease(s);
    let cxT = lerp(fA.cx, fB.cx, es), cyT = lerp(fA.cy, fB.cy, es), lD = lerp(Math.log(fA.D), Math.log(fB.D), es);
    if (inEnv) {
      // l'enveloppe ; en se retournant, la vue s'approche du coin de l'expéditeur (u2), puis va à l'adresse (u4)
      const u1 = ease(uCam), u2 = ease(span(E.cam2, ev)), u4 = ease(span(E.cam3, ev)), fE = frames.E, fS = frames.Fs, fF = frames.F;
      // clavier ouvert : l'adresse au milieu de la partie visible
      const vis = 1 - kbPx / H, fcy = fF.cy - (0.5 - (vis / 2 + 0.04)) * fF.Hw * kb;
      cxT = lerp(lerp(lerp(cxT, fE.cx, u1), fS.cx, u2), fF.cx, u4); cyT = lerp(lerp(lerp(cyT, fE.cy, u1), fS.cy, u2), fcy, u4);
      lD = lerp(lerp(lerp(lD, Math.log(fE.D), u1), Math.log(fS.D), u2), Math.log(fF.D), u4);
      // envoyée : la vue recule jusqu'à l'enveloppe entière (téléphone : on était tout près de l'adresse)
      const u3 = ease(span(PO.cam, pp)), fP = frames.P;
      cxT = lerp(cxT, fP.cx, u3); cyT = lerp(cyT, fP.cy, u3); lD = lerp(lD, Math.log(fP.D), u3);
      // le cachet de près pendant qu'il se fait (Maxence 09/10) ; on revient au cadrage de l'enveloppe entière avant la
      // bascule : la tranche y est calée sur le champ de l'email
      const uz = (reduced ? 0 : 1) * ease(span(PO.zoomIn, pp)) * (1 - ease(span(PO.zoomOut, pp)));
      if (uz > 0) { const sy = EC.y + ENV.h / 2 - FLAP_H + 7, zD = fP.D * Math.max(0.2, (SEAL_D * 2.4) / (2 * fP.D * TF * Math.min(1, W / H)));
        cxT = lerp(cxT, EC.x, uz); cyT = lerp(cyT, sy, uz); lD = lerp(lD, Math.log(zD), uz); }
    }
    // la vitrine : sa propre vue (la feuille, l'enveloppe, la carte vierge, la guirlande, tout l'envoi)
    { const vc = V && !env ? V.camera(frames, frameAbove, W, H) : null; if (vc) { cxT = vc.cx; cyT = vc.cy; lD = vc.lD; } }
    // « en direct », clavier ouvert : la carte au milieu de la partie visible
    if (direct && !inEnv) { const vis = 1 - kbPx / H, oy = oPose(direct.o).y; cyT = lerp(cyT, oy - (0.5 - (vis / 2 + 0.04)) * frames.B.Hw, kb); }
    camS.cx = lerp(0, cxT, ci); camS.cy = lerp(from.cam.cy, cyT, ci); camS.D = Math.exp(lerp(Math.log(from.cam.D), lD, ci));
    // le coup de tampon se sent jusque dans la vue : une secousse brève, amortie
    const jph = pp - PO.hit, jolt = STAMPED && inEnv && !noAddr && !reduced && jph > 0 && jph < 0.4 ? Math.exp(-jph * 13) * Math.sin(jph * 52) * 0.0035 : 0;   // (09/10 : allégée)
    const cx = camS.cx, cy = camS.cy + jolt * camS.D + SEAL_SHAPE.camDy, D = camS.D * (1 + 0.5 * Math.abs(jolt)) * (window.__camZoom || SEAL_SHAPE.zoom), Hw = 2 * D * TF;   // zoom : essais (vue rapprochée)
    eye = [cx, cy - D * Math.sin(TILT), D * Math.cos(TILT)];
    vp = M4.mul(M4.perspective(FOV, W / H, D * 0.25, D * 3), M4.lookAt(eye, [cx, cy, 0], [0, 1, 0]));

    // lumière : la lampe suit ce qu'on regarde (la feuille, la commande, l'enveloppe)
    envW = uCam;
    const vf = V && !env ? V.focus() : null;
    if (vf) envW = vf.envW;
    stepLight(dt, t);
    if (Number.isFinite(SEAL_SHAPE.lampAz)) { lamp.a = CAM_AZ + Math.PI + SEAL_SHAPE.lampAz; lamp.e = SEAL_SHAPE.lampEl; lamp.va = lamp.ve = 0; }   // réglages : lampe tenue
    let fy = SY + lerp(0, oTop - CARD.h, s), fxT = lerp(0, O_X, s);
    if (inEnv) { fy = lerp(fy, EC.y + 20, uCam); fxT = lerp(fxT, 0, uCam); }
    if (vf) { fy = vf.y; fxT = vf.x; }
    { const w2 = 1.8; for (const [k, v, tg] of [['x', 'vx', fxT], ['y', 'vy', fy]]) { ap[v] += (w2 * w2 * (tg - ap[k]) - 2 * w2 * ap[v]) * dt; ap[k] += ap[v] * dt; } }
    // l'enveloppe : la lampe est à la mesure de l'objet, pas de la vue (09/10 : elle reculait avec la caméra quand la
    // vue montrait l'enveloppe entière — lumière plate, papier délavé, cachet sans relief) ; même force reçue
    const k = inEnv ? lerp(Hw / 235, SEAL_SHAPE.lamp, uCam) : Hw / 235;
    const R = L.lightR0 * 235 * k, Z = L.lightZ * k, D0 = Math.hypot(R, Z), el0 = Math.atan2(Z, R), el = lamp.e;
    const lightPos = [ap.x + Math.cos(lamp.a) * D0 * Math.cos(el), ap.y + Math.sin(lamp.a) * D0 * Math.cos(el), D0 * Math.sin(el)];
    const light = L.light * k * k * Math.sin(el0) / Math.sin(el);
    const spotPos = [ap.x, ap.y + 0.35 * Hw, D * 0.55];
    const sd = [ap.x - spotPos[0], ap.y - spotPos[1], -spotPos[2]], sl = Math.hypot(...sd);
    const P = { ...L, lightPos, light, spotPos, spotDir: sd.map(x => x / sl), spotI: 0,   // pas de projecteur ici : sur une grande surface son cercle se voit (flaque, bannie)
      spotCosOut: Math.cos(Math.atan(0.62 * CARD.w / sl)), spotCosIn: Math.cos(Math.atan(0.4 * CARD.w / sl)) };

    gl.enable(gl.DEPTH_TEST);
    const live = reduced ? 0 : sstep(1.2, 3.5, tu);
    // ---- l'enveloppe : monte du fond sous la feuille ; rabat ; retournement ; postée = elle descend et se fond ----
    let Menv = null;
    // (09/10 : le rabat reste ouvert pendant qu'on écrit l'adresse ; il se ferme après POSTER, horloge de l'envoi)
    const uI = inEnv ? ease(span(E.rise, ev)) : 0, uFlap = inEnv ? ease(span(PO.flap, pp)) : 0, uFlip = inEnv && !VE ? ease(span(E.flip, ev)) : 0;
    const mv = reduced ? 0 : 1;
    const uTurn = inEnv && !VE ? ease(span(PO.turn, pp)) * mv : 0, uTip = inEnv && !VE ? ease(span(PO.tip, pp)) * mv : 0;
    if (inEnv) {
      const wr = sstep(E.write, E.write + 1.5, ev) * (1 - kb) * (1 - sstep(0, 0.6, pp));   // en écrivant : l'enveloppe s'incline et respire
      const G = M4.model(-ts.y * L.cardTilt * 0.5 * wr, ts.x * L.cardTilt * 0.5 * wr, 0);
      // envoyée : elle se retourne (le cachet), puis bascule autour de son axe horizontal jusqu'à ne plus montrer que
      // sa tranche inférieure (le haut part dans l'axe du regard), comme glissée dans une fente
      // le coup : l'enveloppe cède un peu sous le tampon
      // « pam ! » : le tampon frappe d'un coup sec, l'enveloppe s'enfonce et rebondit, amortie
      const ph = pp - PO.hit, hb = STAMPED && ph > 0 && ph < 0.6 ? 0.6 * Math.exp(-ph * 9.5) * Math.cos(ph * 34) * mv : 0;   // (09/10 : allégé)
      // la tranche seule visible : elle avance droit devant, dans l'axe du regard (la fente)
      const kAway = frames.P ? Math.min(0.95, MAIL_W / (ENV.w * H / frames.P.Hw)) : 0.6;
      const far = (frames.P ? frames.P.D : 600) * (1 / kAway - 1) * ease(span(PO.away, pp)) * mv;
      const dir = (v => { const l = Math.hypot(...v) || 1; return v.map(x => x / l); })([EC.x - eye[0], EC.y - eye[1], EC.z - eye[2]]);
      Menv = M4.mul(T(EC.x + dir[0] * far, EC.y - 110 * (1 - uI) + 14 * Math.sin(Math.PI * uTurn) + dir[1] * far,
        EC.z - 50 * (1 - uI) + 70 * Math.sin(Math.PI * uFlip) * mv + 55 * Math.sin(Math.PI * uTurn) - 5 * hb + dir[2] * far),
        M4.mul(G, M4.mul(M4.model(-(Math.PI / 2 - TILT) * uTip, 0, 0), M4.model(0, Math.PI * (uFlip + uTurn), 0))));
      // réglages (?cachet) : l'enveloppe tournée à la main, autour du cachet
      if (SEAL_SHAPE.rotX || SEAL_SHAPE.rotY) { const py = ENV.h / 2 - FLAP_H + 7; Menv = M4.mul(Menv, M4.mul(T(0, py, 0), M4.mul(M4.model(SEAL_SHAPE.rotX, SEAL_SHAPE.rotY, 0), T(0, -py, 0)))); }
      if (VE && VE.M) Menv = VE.M;                            // vitrine : l'enveloppe là où elle la pose
      lastMenv = Menv;
    }
    const envFade = inEnv ? (VE ? VE.fade * (VE.M || VE.rel ? 1 : uI) : uI * (1 - sstep(PO.fade[0], PO.fade[1], pp))) : 0;
    // ---- la feuille : arrive du fond, un peu d'en dessous ; en focus tant qu'on la regarde ; « par la poste » :
    // elle pivote (paysage), descend sous le bord de la poche et s'y glisse ----
    const sIn = reduced ? sstep(SHEET_IN[0], SHEET_IN[0] + 0.8, tu) : ease(span(SHEET_IN, tu));
    const Gs = group(0, SY, 0.7, 1 - sL, 0.45 * live, t);
    let Msheet = M4.mul(T(0, -70 * (1 - sIn), -60 * (1 - sIn)), M4.mul(Gs, T(0, SY, 0)));
    const uR = inEnv ? ease(span(E.rot, ev)) : 0, uS = inEnv ? ease(span(E.slide, ev)) : 0, uD = inEnv ? ease(span(E.drop, ev)) : 0;
    if (inEnv && ev >= E.slide[1]) Msheet = M4.mul(Menv, M4.mul(T(0, -2, 0.6), M4.model(0, 0, Math.PI / 2)));
    else if (uR > 0) {
      // pivote devant le devant de la poche (z + 3), puis, en paysage au-dessus de l'ouverture, passe derrière lui
      const Rm = lerpM(rotOf(Gs), T(0, 0, 0), uR);
      Msheet = M4.mul(M4.mul(T(0, lerp(SY, EC.y - 2, uS), lerp(lerp(0, 3, uR), EC.z + 0.6, uD)), Rm), M4.model(0, 0, Math.PI / 2 * uR));
    }
    const VS = V && !env ? V.sheetState() : null;
    if (VS && VS.M) Msheet = VS.M;
    // vitrine : l'enveloppe posée sur la feuille (repère de la feuille : elle penche avec elle, rien ne la traverse)
    if (VE && VE.rel) { Menv = M4.mul(Msheet, VE.rel); lastMenv = Menv; }
    const sheetFade = VS && VS.fade != null ? VS.fade : 1;
    lastMsheet = Msheet;
    const dimS = 1 - L.unfocusDim * sL;
    const hideInside = (inEnv && ev > E.flip[0] + 0.9) || !!(VS && VS.hide);   // retournée : ce qui est dans la poche est caché
    // ---- la carte ----
    let Mc = null;
    const uC = inEnv ? ease(span(E.cIn, ev)) : 0;
    if (C && C.faceDown) {
      // face cachée : elle glisse du bas sur la feuille une fois les lettres posées ; libérée (improvisation), elle
      // repart par où elle est venue
      const u = reduced ? sstep(FD_IN[0], FD_IN[0] + 0.5, tu) : span(FD_IN, tu), e = ease(u);
      const lv = C.leaveT != null ? (reduced ? 1 : ease(clamp01((t - C.leaveT) / 1.1))) : 0;
      const k = Math.max(1 - e, lv);
      Mc = M4.mul(Msheet, M4.model(0, 0, -0.03 - 0.28 * k, C.v.jx + 24 * k, FD_Y + C.v.jy * 2 - 125 * k, 2.2 + 26 * k));
      C.fade = sstep(0, 0.35, u) * (1 - sstep(0.3, 1, lv));
      C.occ = u > 0.9 && lv < 0.05 && !hideInside ? { m: Mc } : null;
    } else if (C) {
      const rel = { x: lerp(C_POSE.x + C.v.jx, C_IN.x, uC), y: lerp(C_POSE.y + C.v.jy * 2, C_IN.y, uC), z: lerp(2.2, C_IN.z, uC) + 9 * Math.sin(Math.PI * uC), rz: lerp(C_POSE.rz, C_IN.rz, uC) };
      const target2 = M4.mul(Msheet, M4.model(0, 0, rel.rz, rel.x, rel.y, rel.z));
      const u = reduced ? sstep(CARD_MOVE[0], CARD_MOVE[0] + 0.5, tu) : span(CARD_MOVE, tu);
      const e = ease(u), sw = Math.sin(Math.PI * sstep(0.2, 0.8, u));
      // retournement : demi-tour (réponse) dans la partie haute du trajet ; toucher = un demi-tour de plus
      if (C.flipT0 >= 0) { C.flipA = clamp01((t - C.flipT0) / 1.1); if (C.flipA >= 1) { C.flips = C.flipTo; C.flipT0 = -1; } }
      const fl = C.flipT0 >= 0 ? lerp(C.flips, C.flipTo, ease(C.flipA)) : C.flips;
      const phi = lerp(C.phi0, C.phi1, reduced ? (u > 0.5 ? 1 : 0) : sstep(0.22, 0.78, u)) + Math.PI * fl;
      const lift = (reduced ? 0 : (CARD.w / 2 + 10) * sw) + (C.flipT0 >= 0 ? (CARD.w / 2 + 6) * Math.sin(Math.PI * C.flipA) * (reduced ? 0 : 1) : 0);
      // M0 contient déjà le demi-tour de la question (ry = π) : on l'en retire, on interpole, on le remet
      const unflip = M4.mul(C.M0, M4.model(0, -Math.PI, 0));
      Mc = M4.mul(blendM(unflip, target2, e, [0, 0, lift]), M4.model(-0.12 * sw, phi, 0));
      // réponse (09/10) : la face où elle est tapée reste lisse, comme quand on l'écrivait ; le logo, en relief, de
      // l'autre côté — la bascule se fait quand la carte est vue par la tranche, au milieu de son premier retournement
      if (C.ownBack) C.logoK = reduced ? (u > 0.5 ? 1 : 0) : sstep(0.42, 0.58, sstep(0.22, 0.78, u));
      // ombre de la carte sur la feuille
      // (09/10 : l'ombre suit la carte exactement, même soulevée ou inclinée — elle disparaissait d'un coup quand la
      // carte partait vers l'enveloppe ou se retournait)
      C.occ = u > 0.9 && !hideInside ? { m: Mc } : null;
    }
    // ---- dessin : enveloppe (fond), feuille, carte, lettres, puis le dos de l'enveloppe et le rabat (devant) ----
    // pleine : bombée une fois la feuille glissée dedans ; l'ombre du rabat du haut une fois fermé
    const EP = envPieces(VE && VE.bulge != null ? VE.bulge : inEnv ? ease(span(E.slide, ev)) : 0, uFlap);
    if (Menv && envFade > 0.004) {
      const cur = writePhase && (env.writing || !env.f[env.field]) ? { cursor: [ENV.w / 2 - env.cursor.x, ENV.h / 2 - env.cursor.y - 0.8, TYPE.size * 0.92, (0.55 + 0.4 * Math.sin(t * 2.4)) * sstep(E.write, E.write + 0.8, ev)], cursorFace: 1 } : {};
      // l'encre de l'enveloppe : posée SUR le papier, bien lisible (06/10 : on la croyait sous la feuille) — lampe lointaine ici
      card.draw(vp, eye, { ...P, inkAlb: LUM.envInk, inkPaper: 4, inkVar: 0.3 }, { model: Menv, lod: 'env', ...EP.front, ink: env ? env.ink : null, inkRG: true, fade: envFade, shade: 1, ...envV.front, ...cur });
      quads.env = screenQuad(Menv, ENV.w, ENV.h);
    } else quads.env = null;
    // la signature : frappe par frappe (le retour la défait) ; la texture n'est créée qu'au moment de taper
    { const n = sigCount(tu); if (n !== sigN && (sigTex || n > 0)) renderSig(n); }
    if (sIn > 0.004 && !hideInside) card.draw(vp, eye, P, { model: Msheet, lod: 'sheet', fade: sIn * sheetFade, shade: dimS, occ: C?.occ || vOcc || null, ...sheetV,
      ...(sigTex ? { inkBack: sigTex, inkRG: true } : {}),
      warp: sheetV.warp.map(x => x * (1 - uR)),
      // (plus de curseur à côté de l'acrostiche, 06/10 : on croyait devoir écrire)
    });
    if (sIn > 0.004 && !hideInside) for (const [y, x0, u] of rulesOf(tu)) if (u > 0.002) fil.draw(vp, eye, P, rulePath(y, x0, u).map(p => apply(Msheet, p)), FIL_R, { pitch: 1.0, fade: sIn * sheetFade });
    if (C && from.answer && tu < MERGE[1] + 0.05) {
      // la carte réponse se glisse exactement sous la question et s'y fond
      const u = span(MERGE, tu), under = M4.mul(Mc, M4.model(0, 0, 0, 0, 0, 0.9));
      card.draw(vp, eye, P, { model: lerpM(C.A0, under, ease(u)), lod: 'fine', ink: null, fade: 1 - sstep(0.15, 1, u), shade: 1, ...C.av });
    }
    if (C && !hideInside) {
      card.draw(vp, eye, P, { model: Mc, lod: 'fine', ink: C.front, inkBack: C.back, fade: C.fade ?? 1, shade: dimS, ...C.v, logoK: C.logoK || 0, ...(uC > 0 ? { warp: C.v.warp.map(x => x * (1 - uC)) } : {}) });
      quads.C = inEnv ? null : screenQuad(Mc);
    } else quads.C = null;
    // ---- la commande ----
    const envAway = inEnv ? 1 - sstep(E.fade[0], E.fade[1], ev) : 1;
    for (const o of orders) {
      const appear = orderAt < 0 ? 0 : reduced ? sstep(0, 0.6, t - orderAt - o.k * 0.2) : ease(clamp01((t - orderAt - 0.35 - o.k * 0.3) / 1.3));
      const away = backing ? 1 - sstep(0, 0.5, t - backing.t0) : 1;
      let fade = appear * away * envAway;
      if (chosen && chosen.o !== o) fade *= 1 - sstep(0, 0.6, t - chosen.t0) * (direct ? 0.92 : 0.75);
      o.a = fade;
      if (fade < 0.004) { quads[o.id] = null; continue; }
      const p = oPose(o);
      let dz = 0, ry = Math.PI;
      let inkBack = o.anim ? soonInk : null, curD = {}, fadeD = 1;
      if (direct && direct.o === o) {
        const tb = direct.back ? clamp01((t - direct.back) / 1.1) : 0, tf = clamp01((t - direct.t0) / 1.1);
        const u = (1 - tb) * tf;
        ry += Math.PI * sstep(0.12, 0.88, u);
        dz += (CARD.w / 2 + 8) * Math.sin(Math.PI * (direct.back ? tb : tf)) * (reduced ? 0 : 1) + 6 * u;
        inkBack = direct.ink;
        const pu = ease(clamp01(direct.pu));
        fadeD = 1 - sstep(0.3, 1, direct.pu);
        o.postY = -40 * pu;
        if (u > 0.95 && !direct.back && direct.pu < 0.5 && (direct.writing || !direct.contact))
          curD = { cursor: [direct.cursor.x - CARD.w / 2, CARD.h / 2 - direct.cursor.y - 0.8, TYPE.size * 1.15 * 0.92, 0.55 + 0.4 * Math.sin(t * 2.4)], cursorFace: 0 };
        if (direct.back && tb >= 1) closeDirect();
      } else o.postY = 0;
      if (o.anim) {                               // lien d'attente : un demi-tour (« bientôt »), puis retour
        const tf = t - o.anim.t0, u1 = clamp01(tf / 1.3), u2 = clamp01((tf - 1.3 - 2.2) / 1.3);
        ry += Math.PI * (sstep(0.15, 0.85, u1) - sstep(0.15, 0.85, u2));
        dz += (CARD.w / 2 + 8) * (Math.sin(Math.PI * u1) + Math.sin(Math.PI * u2)) * (reduced ? 0 : 1);
        if (tf > 1.3 * 2 + 2.2) o.anim = null;
      }
      // invitation : la première sautille deux ou trois fois, quand rien ne bouge
      const idle = t - Math.max(orderAt + 2.6, lastGesture + 1.5);
      if (!chosen && !reduced && o.k === 0 && idle > 0 && idle < 4.5 * 3) dz += hop(idle % 4.5);
      o.press += ((o === pressO ? 1 : 0) - o.press) * Math.min(1, dt * 14);
      const Go = group(p.x, p.y, o.bph, s, 1, t);
      const M = M4.mul(M4.mul(T(0, -24 * (1 - appear) + o.postY, -30 * (1 - appear)), Go), M4.model(0, ry, p.rz, p.x, p.y, 1 + dz - 0.5 * o.press));
      card.draw(vp, eye, P, { model: M, lod: 'fine', ink: o.ink, inkBack, fade: fade * fadeD, shade: 1 - L.unfocusDim * (1 - s), ...o.v, ...curD });
      if (direct && direct.o === o) direct.M = M;
      quads[o.id] = appear > 0.6 && !backing && !inEnv ? screenQuad(M) : null;
    }

    // ---- les lettres : de leur place en haut jusqu'à leur ligne sur la feuille ----
    const list = [];
    const zL = lerp(1.0, 0.18, uR);                           // dans la poche : presque à plat sur la feuille
    for (const f of flyers) {
      if (hideInside) break;
      const u = reduced ? (tu > f.at ? 1 : 0) : clamp01((tu - f.at) / f.dur);
      const end = M4.mul(Msheet, M4.mul(T(letX(f.ch), baseOf(f.i), SHEET.t / 2 + zL), S(emT)));
      const start = M4.mul(starts[f.i], S(from.em));
      let M;
      if (u <= 0) M = start;
      else if (u >= 1) M = end;
      else {
        // départ doux, arrivée franche ; elle descend à droite de la colonne, puis glisse dans sa ligne par la droite
        // (comme le chariot d'une machine) : elle ne passe jamais sur les lettres déjà posées
        const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2.2) / 2;
        const a = posOf(start), b = posOf(end);
        const c = [b[0] + f.side, b[1], (a[2] + b[2]) / 2];
        const q = [0, 1, 2].map(j => (1 - e) * (1 - e) * a[j] + 2 * (1 - e) * e * c[j] + e * e * b[j]);
        const L0 = lerp(a[0], b[0], e), L1 = lerp(a[1], b[1], e), L2 = lerp(a[2], b[2], e);
        M = blendM(start, end, e, [q[0] - L0, q[1] - L1, q[2] - L2 + f.lift * Math.sin(Math.PI * e)]);
      }
      // clarté : celle qu'elle avait (allumée), qui se calme en route ; à l'arrivée elle s'allume un peu (absorbée),
      // puis la lumière parcourt la colonne de haut en bas
      const land = tu - (f.at + f.dur);
      let g = u < 1 ? lerp(f.g0, 0.3, sstep(0, 1, u)) : 0.3 * Math.exp(-land / 0.5);
      if (land > 0) g += f.k * 0.55 * sstep(0, 0.35, land) * Math.exp(-Math.max(0, land - 0.35) / f.dec);
      const rk = tu - (READ_AT + flyers.indexOf(f) * READ_GAP);
      if (rk > 0) g += 0.5 * sstep(0, 0.5, rk) * Math.exp(-Math.max(0, rk - 0.5) / 1.6);
      // vue « commande » : la colonne passe au second plan
      list.push({ i: f.i, model: M, glow: g * (1 - 0.8 * sL) * sheetFade, alpha: (1 - 0.75 * sL) * sheetFade });
    }
    // avec le test de profondeur : le dos de l'enveloppe, dessiné ensuite, cache les lettres entrées dans la poche
    nameR.drawLetters(vp, eye, P, L, list, t);
    gl.enable(gl.DEPTH_TEST);
    if (Menv && envFade > 0.004) {
      // le cachet posé : son ombre de contact sur ce qu'il recouvre (rabat, dos, rabat du bas ; repère de chacun)
      const uSe0 = P_LOGO ? span(PO.seal, pp) : 0, aoK = SEAL_SHAPE.ao * sstep(0.6, 1, uSe0), sy = ENV.h / 2 - FLAP_H + 7;
      const aoOf = y => aoK > 0 ? [0, y, SEAL_D / 2, aoK] : null, pq = sealPQ();
      card.draw(vp, eye, P, { model: M4.mul(Menv, T(0, -(ENV.h - ENV_BACK_H) / 2, 1.6)), lod: 'envBack', ...EP.back, ...(VE && VE.noBot ? { triB: [0, 0, 0, 0] } : {}), fade: envFade, shade: 1, ...envV.back, ao: aoOf(sy + (ENV.h - ENV_BACK_H) / 2), sealQ: pq.sealQ });
      if (!(VE && VE.noBot)) card.draw(vp, eye, P, { model: M4.mul(Menv, T(0, 0, 1.74)), lod: 'botFlap', ...EP.bot, fade: envFade, shade: 1, ...botV, clip: [1, -ENV.h / 2, ENV.h * 0.58, ENV.w / 2], ao: aoOf(sy), sealQ: pq.sealQ });
      const th = Math.PI * uFlap, hz = (1.9 + (VE ? VE.flapDz : 0)) * uFlap;   // (vitrine : le rabat se ferme sur la carte vierge)
      const Mf = M4.mul(Menv, M4.mul(M4.mul(T(0, ENV.h / 2, hz), M4.model(th, 0, 0)), T(0, FLAP_H / 2, 0)));
      card.draw(vp, eye, P, { model: Mf, lod: 'flap', ...EP.flap, fade: envFade, shade: 1, ...envV.flap, clip: [1, -FLAP_H / 2, FLAP_H, ENV.w / 2], ao: aoOf(FLAP_H / 2 - 7), sealQ: pq.sealQ });
      // le cachet se pose À CHEVAL sur la pointe du rabat fermé (06/10 : il était trop haut), il descend, s'écrase un peu ;
      // 09/10 : après POSTER, une fois l'enveloppe retournée et le rabat fermé (le geste de la personne le scelle)
      const uSe = span(PO.seal, pp);
      if (P_LOGO && uSe > 0) {
        // la pose : la cire coule, le sceau (invisible) appuie, elle refroidit (sealForm) ; mouvement réduit : le cachet fini
        const Fm = sealForm(reduced ? 1 : SEAL_PRESS0 + (1 - SEAL_PRESS0) * uSe, SEAL_LOOK, SEAL_SHAPE);
        const Ms = M4.mul(M4.mul(Mf, T(0, FLAP_H / 2 - 7, -0.19 - EP.sealDz)), M4.model(0, 0, VE && VE.sealRot ? -VE.sealRot : 0));   // (vitrine : l'enveloppe est dressée, le logo reste droit)
        card.draw(vp, eye, { ...P, ...Fm.look }, { model: Ms, lod: sealLod, fade: envFade * sstep(0, reduced ? 0.35 : 0.1, uSe), shade: 1, ...sealV, paperLo: SEAL_SHAPE.marbre, ...pq,
          sealP: [SEAL_SHAPE.hd, SEAL_SHAPE.hc, SEAL_SHAPE.crest, Fm.ring], sealQ: [Fm.pits, Fm.cavWall, SEAL_SHAPE.cavEdge, SEAL_SHAPE.aoW], form: Fm.form,
          sealV4: [SD.wobPhase, SD.crest, SD.tilt, Fm.peau], sealR: [SEAL_SHAPE.film, SEAL_SHAPE.sss, SEAL_SHAPE.offX, SEAL_SHAPE.offY], logoOff: [SEAL_SHAPE.offX, SEAL_SHAPE.offY], blend: true });
      }
    }
    if (VIT && !env && !backing) { const r = VIT.draw(vp, eye, P, Msheet, Menv, t); vOcc = r.occ; } else vOcc = null;
    // « en direct » envoyé : l'événement, une fois la carte partie
    if (direct && direct.postT >= 0 && !direct.sent && t - direct.postT > 1.7) {
      direct.sent = true;
      const c = direct.contact.trim();
      const detail = { name: from.name, kind: from.kind, id: from.id, text: from.text, mode: 'direct', address: [], contact: c, email: emailOk(c) ? c : '', tel: telOk(c) ? c : '' };
      try { if (typeof window.onAddress === 'function') window.onAddress(detail); } catch (e) { console.error(e); }
      window.dispatchEvent(new CustomEvent('singulies:direct', { detail }));
      emit('address', detail);
    }
    // postée : l'événement, une fois partie
    if (env && env.postT >= 0 && !env.sent && pp >= PO.end) {
      env.sent = true;
      // la page demande ensuite l'email ou le numéro (sur le noir), puis envoie (singulies:address)
      const detail = { name: from.name, kind: from.kind, id: from.id, text: from.text, mode: 'poste', ...fieldsOut(env.f), fields: { ...env.f }, ...(noAddr ? { test: true } : {}) };
      emit('address', detail);
    }
  }
  function cursorOn(tu) { return first < 0 ? 0 : sstep(CURSOR_AT, CURSOR_AT + 0.9, tu); }

  function screenQuad(M, w = CARD.w, h = CARD.h, x0 = 0, y0 = 0) {
    const mvp = M4.mul(vp, M);
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
      const x = x0 + sx * w / 2, y = y0 + sy * h / 2;
      const cx = mvp[0] * x + mvp[4] * y + mvp[12], cy = mvp[1] * x + mvp[5] * y + mvp[13], cw = mvp[3] * x + mvp[7] * y + mvp[15];
      return [(cx / cw * 0.5 + 0.5) * W, (0.5 - cy / cw * 0.5) * H];
    });
  }
  const inside = (q, x, y) => {
    if (!q) return false;
    let s = 0;
    for (let i = 0; i < 4; i++) {
      const [ax, ay] = q[i], [bx, by] = q[(i + 1) % 4], c = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
      if (c !== 0) { if (s === 0) s = Math.sign(c); else if (Math.sign(c) !== s) return false; }
    }
    return true;
  };
  const rectOf = q => { const xs = q.map(p => p[0]), ys = q.map(p => p[1]); return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) }; };

  function showOrders(t) {
    if (VIT) VIT.jump(0);
    // plus de commande (08/10) : directement l'enveloppe
    if ((noAddr || !ORDERS_ON) && ENVELOPE) {
      if (!env && !chosen) {
        const o = orders.find(x => x.id === 'poste') || null; chosen = { id: 'poste', o, t0: t };
        const detail = { name: from.name, kind: from.kind, id: from.id, text: from.text, mode: 'poste' };
        try { if (typeof window.onOrder === 'function') window.onOrder(detail); } catch (e) { console.error(e); }
        window.dispatchEvent(new CustomEvent('singulies:order', { detail }));
        emit('order', detail);
        openEnv(t);
      }
      return;
    }
    if (orderAt < 0) orderAt = t; sT = 1;
  }
  let pressO = null;
  function hit(x, y) {
    for (const o of orders) if (inside(quads[o.id], x, y)) return o;
    if (C && inside(quads.C, x, y)) return 'card';
    return null;
  }
  function gesture(t) { lastGesture = t; }
  function tap(x, y, t) {
    gesture(t);
    if (backing) return { type: null };
    if (env) {
      if (!env.back && !isPosting() && envClock(t) >= E.write && inside(quads.env, x, y)) {
        // le champ touché (ou le plus proche)
        let best = null, bd = 1e9;
        for (const d of FIELDS) {
          const r = zoneRect(d.id); if (!r) continue;
          const dx = Math.max(r.left - x, 0, x - r.right), dy = Math.max(r.top - y, 0, y - r.bottom), dd = dx * 0.3 + dy;
          if (dd < bd) { bd = dd; best = d.id; }
        }
        if (best && best !== env.field) { env.field = best; renderAddress(); if (env.writing) emit('write', writeInfo()); }
        return startWriting() ? { type: 'write' } : { type: null };
      }
      return { type: null };
    }
    if (direct) {
      if (!direct.back && direct.pu < 0.5 && direct.M && inside(screenQuad(direct.M), x, y)) return startWriting() ? { type: 'write' } : { type: null };
      return { type: null };
    }
    const h = hit(x, y);
    if (h === 'card') {
      if (C.faceDown || tau(t) < CARD_MOVE[1] || C.flipT0 >= 0) return { type: null };
      C.flipTo = C.flips + 1; C.flipT0 = t; C.flipA = 0;
      return { type: 'flip' };
    }
    if (h && typeof h === 'object') {
      if (h.anim) return { type: null };
      chosen = { id: h.id, o: h, t0: t };
      const detail = { name: from.name, kind: from.kind, id: from.id, text: from.text, mode: h.id };
      try { if (typeof window.onOrder === 'function') window.onOrder(detail); } catch (e) { console.error(e); }
      window.dispatchEvent(new CustomEvent('singulies:order', { detail }));
      emit('order', detail);
      const url = ORDER_LINKS[h.id];
      if (url) { setTimeout(() => { location.href = url; }, 400); return { type: 'order' }; }
      if (h.id === 'poste' && ENVELOPE) { openEnv(t); return { type: 'order' }; }
      if (h.id === 'direct' && ENVELOPE) { openDirect(h, t); return { type: 'order' }; }
      if (!soonInk) soonInk = card.makeInk(makeInkMap('bientôt', 77).canvas);
      h.anim = { t0: t };
      setTimeout(() => { if (chosen && chosen.o === h) chosen = null; }, 4800);
      return { type: 'order' };
    }
    return { type: null };
  }
  function press(x, y) { const h = hit(x, y); pressO = h && typeof h === 'object' ? h : null; }
  function release() { pressO = null; }
  // glisser / molette : d < 0 = descendre vers la commande, d > 0 = remonter vers la feuille
  function scroll(d, t) {
    gesture(t);
    if (backing || HOLD || tau(t) < CURSOR_AT * 0.6) return;
    if (d < 0) showOrders(t); else sT = 0;
  }
  function back(t) {
    if (VIT) VIT.jump(0);
    if (direct) {
      gesture(t);
      if (direct.postT >= 0) { direct.postT = -1; direct.sent = false; return true; }
      if (direct.back) return false;
      direct.writing = false; emit('stopWrite', {}); direct.back = t;
      return true;
    }
    if (env) {
      gesture(t);
      if (env.sent) return false;                                                // la tranche est devenue le champ de l'email
      if (env.postT >= 0) { env.postT = -1; env.sent = false; return true; }     // postée : elle revient
      if (env.back) return false;
      env.writing = false; emit('stopWrite', {});
      env.back = { t0: t, e0: Math.min(envClock(t), E.write) };
      return true;
    }
    if (backing) return false;
    gesture(t);
    backing = { t0: t, tau0: Math.min(tau(t), INTRO_END), fired: false };
    if (C && C.flips % 2) { C.flipTo = C.flips + 1; C.flipT0 = t; C.flipA = 0; }   // la carte revient côté question
    return true;
  }
  // ---- l'enveloppe ----
  function openEnv(t) {
    const f = { ...savedFields };
    if (!f.email && emailOk(savedContact)) f.email = savedContact;
    if (!f.tel && telOk(savedContact)) f.tel = savedContact;
    env = { t0: t, back: null, postT: -1, pp: 0, senderN: 0, writing: false, f, field: FIELDS.find(d => !(f[d.id] || '').trim())?.id || 'nom', ink: null, cursor: { x: ADDR.x, y: ADDR.y }, sent: false };
    const pre = preEnv; preEnv = null;
    if (pre && pre.key === JSON.stringify([f, env.field])) { env.ink = pre.ink; env.cursor = pre.cursor; }
    else { if (pre) card.freeInk(pre.ink); renderAddress(); }
  }
  // l'encre de l'enveloppe (toute la face, 10 px/mm : lourde à taper) se prépare pendant que l'acrostiche se lit,
  // pas au moment où la vue descend vers l'enveloppe (09/10, à-coups sur iPhone X)
  let preEnv = null;
  function prepareEnv() {
    if (preEnv || env || noAddr) return;
    const f = { ...savedFields }, field = FIELDS.find(d => !(f[d.id] || '').trim())?.id || 'nom';
    const m = fieldsInk(f, 991, field, null, 0, HINTS);
    preEnv = { key: JSON.stringify([f, field]), ink: card.makeInk(m.canvas, true), cursor: m.cursor };
    releaseCanvas(m.canvas);
  }
  const newStamp = () => !STAMPED ? { off: true } : ({ mask: card.logoMask(), rot: (rnd() < 0.5 ? -1 : 1) * rnd.range(0.05, 0.5), dx: rnd.range(-2.5, 2.5), dy: rnd.range(-2, 2), seed: (rnd() * 1e9) >>> 0 });
  let savedFields = { prenom: PRENOM }, savedContact = '';           // l'adresse et le contact restent si l'on revient en arrière
  const zoneOf = id => FIELDS.find(d => d.id === id)?.zone || 'addr';
  function closeEnv() {
    if (env?.ink) card.freeInk(env.ink);
    if (env?.stampPre) releaseCanvas(env.stampPre.canvas);
    if (env) { savedFields = { ...env.f }; savedContact = env.f.email || env.f.tel || savedContact; }
    env = null; chosen = null; kb = 0;
    // revenue à la feuille : elle ne repart pas tout de suite (le temps de revenir encore en arrière, aux cartes)
    lastGesture = Math.max(lastGesture, lastT + 2);
  }
  // un champ : une ligne, tapée à la machine (casse et accents gardés), à sa longueur
  const cleanField = (d, v) => v.replace(/[\r\n\t]/g, ' ').replace(/[’‘`´]/g, "'").replace(/\s{2,}/g, ' ').replace(/^\s+/, '').slice(0, d.chars);
  function renderAddress() {
    if (noAddr) { env.ink = null; return; }
    const m = fieldsInk(env.f, 991, env.stamp ? null : env.writing || !env.f[env.field] ? env.field : null, env.stamp, env.senderN, HINTS);
    // même texture remise à jour (08/10 : en créer une neuve à chaque frappe, 7 Mo chacune, faisait beaucoup de mémoire
    // graphique jetée sur iPhone)
    if (env.ink) card.updateInk(env.ink, m.canvas, 0, 0); else env.ink = card.makeInk(m.canvas, true);
    releaseCanvas(m.canvas);
    env.cursor = m.cursor;
  }
  const writeInfo = () => { const d = FIELDS.find(x => x.id === env.field); return { text: env.f[d.id] || '', zone: d.zone, field: d, fields: { ...env.f }, last: d === FIELDS[FIELDS.length - 1] }; };
  const isPosting = () => !!env && (env.postT >= 0 || env.pp > 0);
  // tous les champs à la fois (08/10 : le remplissage automatique du téléphone remplit nom, adresse, ville, code
  // postal d'un coup — chaque champ a son vrai <input>, mount.js les lit tous) ; rend les valeurs nettoyées
  function setFields(vals) {
    if (!env || env.back || isPosting()) return env ? { ...env.f } : vals;
    let ch = false;
    for (const d of FIELDS) {
      if (vals[d.id] == null) continue;
      const c = cleanField(d, vals[d.id]);
      if (c !== (env.f[d.id] || '')) { env.f[d.id] = c; ch = true; }
    }
    if (ch) renderAddress();
    return { ...env.f };
  }
  // un champ choisi (toucher sa ligne, flèches du clavier de l'iPhone) : il devient le champ en cours
  function selectField(id, t) {
    if (!env || env.back || isPosting() || envClock(lastT) < E.write || !FIELDS.some(d => d.id === id)) return false;
    if (t != null) gesture(t);
    if (env.field === id && env.writing) return true;
    env.field = id; env.writing = true; renderAddress(); emit('write', writeInfo());
    return true;
  }
  // « en direct » : la carte se retourne ; on tape son email ou son numéro au dos
  let direct = null;
  function openDirect(o, t) {
    direct = { o, t0: t, back: null, contact: savedContact, ink: null, cursor: { x: 0, y: 0 }, writing: false, postT: -1, pu: 0, sent: false, M: null };
    renderDirect();
  }
  function renderDirect() {
    const m = contactCardInk(direct.contact, 313);
    if (direct.ink) card.freeInk(direct.ink);
    direct.ink = card.makeInk(m.canvas); direct.cursor = m.cursor;
  }
  function closeDirect() {
    if (direct?.ink) card.freeInk(direct.ink);
    if (direct) savedContact = direct.contact;
    direct = null; chosen = null; kb = 0;
  }
  // le texte du champ natif va au champ en cours (de l'enveloppe, ou la carte « en direct »)
  function setAddress(v) {
    if (direct) {
      if (!direct.writing) return direct.contact;
      const c = cleanContact(v);
      if (c !== direct.contact) { direct.contact = c; renderDirect(); }
      return c;
    }
    if (!env || !env.writing) return env ? env.f[env.field] || '' : v;
    const d = FIELDS.find(x => x.id === env.field), c = cleanField(d, v);
    if (c !== (env.f[d.id] || '')) { env.f[d.id] = c; renderAddress(); }
    return c;
  }
  // Entrée : le champ suivant ; après le dernier, terminé
  function enter() {
    if (direct || !env) return 'done';
    const i = FIELDS.findIndex(d => d.id === env.field);
    if (i < 0 || i >= FIELDS.length - 1) return 'done';
    env.field = FIELDS[i + 1].id; renderAddress(); emit('write', writeInfo());
    return 'next';
  }
  function startWriting() {
    if (direct) { if (direct.back || direct.pu > 0.5) return false; direct.writing = true; emit('write', { text: direct.contact, zone: 'contact' }); return true; }
    if (!env || env.back || isPosting()) return false;
    env.writing = true; renderAddress(); emit('write', writeInfo()); return true;
  }
  function stopWriting() { if (env) { env.writing = false; renderAddress(); } if (direct) direct.writing = false; }
  const envReady = () => env && fieldsReady(env.f);
  function post(t) {
    if (direct) {
      if (direct.back || direct.postT >= 0 || !contactOk(direct.contact)) return false;
      gesture(t); direct.writing = false; direct.postT = t; direct.sent = false; return true;
    }
    if (!env || env.back || env.postT >= 0 || !envReady()) return false;
    // le coup de tampon se prépare au toucher (la vue recule ensuite : rien de lourd pendant le mouvement)
    if (!noAddr && !env.stamp) {
      if (env.stampPre) releaseCanvas(env.stampPre.canvas);
      const stamp = newStamp(), m = fieldsInk(env.f, 991, null, stamp, env.senderN, HINTS);
      env.stampPre = { stamp, canvas: m.canvas, cursor: m.cursor };
    }
    gesture(t); env.writing = false; env.postT = t; env.sent = false; return true;
  }
  // rectangle écran d'un champ (sa ligne, sur toute sa longueur)
  function zoneRect(id) {
    if (!env || !lastMenv) return null;
    const d = FIELDS.find(x => x.id === id); if (!d) return null;
    const p = fieldPos(d), w = d.chars * TYPE.pitch + 6, h = ADDR.lead;
    const cxm = p.x - 3 + w / 2, cym = p.y - 1.4 - h / 2 + 1.2;
    return rectOf(screenQuad(M4.mul(lastMenv, M4.model(0, Math.PI, 0)), w, h, cxm - ENV.w / 2, ENV.h / 2 - cym));
  }
  function setKeyboard(px) { kbPx = px; }
  // rectangle écran du bloc d'adresse (face lue : mm depuis le coin haut-gauche)
  // où poser le champ natif (et le signe POSTER / ENVOYER) : la zone en cours
  function addrRect() {
    if (direct) return direct.M && !direct.back && lastT - direct.t0 > 1.1 ? rectOf(screenQuad(direct.M)) : null;
    if (!env || !lastMenv || envClock(lastT) < E.write) return null;
    return zoneRect(env.field);
  }
  function setTilt(x, y) { tilt.x = Math.max(-1, Math.min(1, x)); tilt.y = Math.max(-1, Math.min(1, y)); }
  function free() {
    for (const o of orders) card.freeInk(o.ink);
    if (preEnv) card.freeInk(preEnv.ink);
    if (env?.stampPre) releaseCanvas(env.stampPre.canvas);
    if (sigTex) card.freeInk(sigTex);
    if (env?.ink) card.freeInk(env.ink);
    if (direct?.ink) card.freeInk(direct.ink);
    if (C) { if (C.ownBack) card.freeInk(C.back); if (C.ownFront) card.freeInk(C.front); }
    if (soonInk) card.freeInk(soonInk);
    if (VIT) VIT.free();
    fil.free();
  }
  // rectangle écran de ce que le pointeur incline (la feuille ou la commande) : souris dessus = droit
  function focusRect() {
    if (!vp) return null;
    if (env && quads.env) return rectOf(quads.env);
    if (direct && direct.M) return rectOf(screenQuad(direct.M));
    if (sv > 0.5) { const qs = orders.map(o => quads[o.id]).filter(Boolean); if (qs.length) return rectOf(qs.flat()); }
    const mvp = M4.mul(vp, lastMsheet);
    const c = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
      const x = sx * SHEET.w / 2, y = sy * SHEET.h / 2;
      const cx = mvp[0] * x + mvp[4] * y + mvp[12], cy = mvp[1] * x + mvp[5] * y + mvp[13], cw = mvp[3] * x + mvp[7] * y + mvp[15];
      return [(cx / cw * 0.5 + 0.5) * W, (0.5 - cy / cw * 0.5) * H];
    });
    return rectOf(c);
  }
  return {
    frame, tap, press, release, scroll, back, setTilt, free, focusRect, gesture,
    // (10/10, alt) la vitrine : go(k) avance / recule d'une étape ; jump(k) y va d'un coup ; state()
    vitrine: VIT ? { go: VIT.go, jump: VIT.jump, scrub: VIT.scrub, state: VIT.state } : null,
    // (10/10, alt.html) payé, sans question (improvisation) : la feuille n'attend plus — la carte face cachée repart,
    // puis l'enveloppe, comme d'habitude
    unhold(t, o = {}) { if (VIT) VIT.jump(0); if (!HOLD) return; HOLD = false; if (o.noAddr) noAddr = true; if (C && C.faceDown && C.leaveT == null) C.leaveT = t; lastGesture = t - 1.5; },
    startWriting, stopWriting, setAddress, setText: v => setAddress(v), enter, post, setKeyboard, addrRect, setFields, selectField,
    // où poser chaque champ natif (sa ligne sur l'enveloppe), tant qu'on peut écrire
    // la tranche inférieure de l'enveloppe, à l'écran (px CSS) : elle devient le champ de l'email
    edgeLine: () => {
      if (!env || !lastMenv || !vp || env.pp < PO.tip[0]) return null;
      const m = M4.mul(vp, lastMenv), pr = x => { const y = -ENV.h / 2, cx = m[0] * x + m[4] * y + m[12], cy = m[1] * x + m[5] * y + m[13], cw = m[3] * x + m[7] * y + m[15]; return [(cx / cw * 0.5 + 0.5) * W, (0.5 - cy / cw * 0.5) * H]; };
      const a = pr(-ENV.w / 2), b = pr(ENV.w / 2);
      return { x0: a[0], y0: a[1], x1: b[0], y1: b[1], done: env.pp >= PO.end, gone: env.pp >= PO.fade[1] };   // gone : l'enveloppe s'est fondue, la ligne reste
    },
    // où poser POSTER : sous le bas de l'enveloppe, à l'aplomb de l'adresse, à l'écran (il la suit)
    signAt: () => {
      if (!env || !lastMenv || !vp) return null;
      const m = M4.mul(vp, M4.mul(lastMenv, M4.model(0, Math.PI, 0)));
      const pr = (fx, fy) => { const x = fx - ENV.w / 2, y = ENV.h / 2 - fy, cx = m[0] * x + m[4] * y + m[12], cy = m[1] * x + m[5] * y + m[13], cw = m[3] * x + m[7] * y + m[15]; return [(cx / cw * 0.5 + 0.5) * W, (0.5 - cy / cw * 0.5) * H]; };
      const ax = ADDR.x + 15 * TYPE.pitch, c = pr(ax, ENV.h), e = pr(ax + 10, ENV.h);
      return { x: c[0], y: c[1], pxmm: Math.hypot(e[0] - c[0], e[1] - c[1]) / 10 };
    },
    fieldRects: () => env && lastMenv && !env.back && !isPosting() && envClock(lastT) >= E.write && !noAddr ? Object.fromEntries(FIELDS.map(d => [d.id, zoneRect(d.id)])) : null,
    state: () => ({
      env: env ? { writing: env.writing, text: env.f[env.field] || '', fields: { ...env.f }, field: env.field, zone: zoneOf(env.field), canPost: !isPosting() && !env.back && envClock(lastT) >= E.write && !!envReady(), posted: env.postT >= 0, back: !!env.back, write: !env.back && envClock(lastT) >= E.write, sign: 'POSTER' }
        : direct ? { writing: direct.writing, text: direct.contact, contact: direct.contact, zone: 'contact', canPost: direct.pu < 0.5 && !direct.back && contactOk(direct.contact), posted: direct.postT >= 0, back: !!direct.back, write: !direct.back && lastT - direct.t0 > 1.1, sign: 'ENVOYER' } : null, tau: tau(lastT), view: sv > 0.5 ? 'commande' : 'feuille', orders: orderAt >= 0, backing: !!backing, cursor: cursorOn(tau(lastT)) > 0.5, chosen: chosen ? chosen.id : null }),
    // tests / captures
    showOrders: () => showOrders(lastT), choose: id => { const o = orders.find(x => x.id === id); const q = quads[id]; if (o && q) { const r = rectOf(q); return tap((r.left + r.right) / 2, (r.top + r.bottom) / 2, lastT); } return null; },
    timing: { landAll, CURSOR_AT, INTRO_END }, ready: (early = false) => !backing && tau(lastT) >= (early ? Math.max(landAll, C && C.faceDown ? FD_IN[1] : 0) + 0.2 : CURSOR_AT),   // early (alt) : lettres et carte posées
    sealTune: { look: SEAL_LOOK, shape: SEAL_SHAPE, lamp: () => ({ az: wrapA(lamp.a - CAM_AZ - Math.PI), el: lamp.e }) },
    // zones écran (px CSS) de ce qu'on peut toucher : la carte, les deux cartes de la commande
    rects: () => ({ card: quads.C || null, poste: quads.poste || null, direct: quads.direct || null }),
    tapId(id, t) { const q = id === 'card' ? quads.C : quads[id]; if (!q) return { type: null }; const r = rectOf(q); return tap((r.left + r.right) / 2, (r.top + r.bottom) / 2, t); },
    debug: () => ({ quads, C: C && { flips: C.flips, flipT0: C.flipT0, phi0: C.phi0, phi1: C.phi1 }, SY }),
  };
}
