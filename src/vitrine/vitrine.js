// La vitrine (11/10, alt.html) : ce qu'il y a dans l'envoi, joué EN DIRECT dans la scène de la feuille. Rien ne bouge
// tout seul : l'animation suit le défilement de la page (on descend, elle avance ; on remonte, elle rembobine, tout de
// suite, même au milieu d'une étape) — scrub(p) ; les points font défiler jusqu'à l'étape. La vue reste celle de la
// feuille (12/10 : plus de rapprochement sur le cachet).
//   0 la feuille
//   1 la carte question arrive du bas de l'écran et se pose en bas, à cheval sur la feuille (face cachée)
//   2 « le tout scellé à la cire » : la carte remonte sur la feuille ; l'enveloppe (à la mesure de la feuille, le dos
//     ouvert en V sous le rabat, comme une vraie : on voit la feuille dedans) arrive de côté, dressée, et avale la
//     feuille ; elle tourne en glissant jusqu'au centre et se couche ; le rabat se referme ; la cire, le cachet (la
//     vue ne bouge pas)
//   3 « une carte mystère et un fil… pour rester liés » (11/10, Maxence : le cachet AVANT la carte mystère) : la vue
//     ne bouge plus (12/10) ; la carte mystère arrive du bas et se pose sous le cachet ; un seul fil, à deux bouts : chacun sort de l'enveloppe par un
//     petit trou (percé de l'intérieur), l'un à gauche, l'autre à droite, court sur le dos de l'enveloppe, passe sur la
//     carte, et ils se nouent au centre de la carte
// Tout est une fonction de l'horloge vt (s). sheet.js dessine la feuille, l'enveloppe et le cachet (ses horloges, sans
// retournement ; l'enveloppe dans le repère de la feuille), la vitrine le reste.
import { M4, CARD } from '../cards/cardRenderer.js';
import { ENV, PO, FLAP_H, SEAL_OFF } from '../sheet/envelope.js';
const CARD_S = Math.SQRT1_2, CW = CARD.w * CARD_S, CH = CARD.h * CARD_S;   // (12/10) la feuille est une A4 : la carte à sa taille (sheet.js)
import { createMystery } from './mystery.js';

const clamp01 = u => Math.min(1, Math.max(0, u));
const sstep = (a, b, x) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const ease = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
const easeOut = u => 1 - Math.pow(1 - clamp01(u), 3);
const lerp = (a, b, u) => a + (b - a) * u;
const span = (a, b, x) => clamp01((x - a) / (b - a));
const T = (x, y, z) => M4.model(0, 0, 0, x, y, z);
const S = k => new Float32Array([k, 0, 0, 0, 0, k, 0, 0, 0, 0, k, 0, 0, 0, 0, 1]);
const ap = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];

// les étapes (s) : la carte ; l'enveloppe et le cachet ; la carte mystère et le fil
const D = [1.8, 7.0, 4.0];
export const VKEYS = D.reduce((a, d) => (a.push(a[a.length - 1] + d), a), [0]);
const K = VKEYS;
const BACK_SPEED = 2.6;
const ENV_K = 0.95;                       // l'enveloppe à la mesure de la feuille (A5 dedans, 3–4 mm de jeu)
const V_NOTCH = 50;                       // la profondeur du V du dos (mm, sous le bord haut) — le rabat fermé le couvre

export function createVitrine(o) {
  const { gl, card, rnd, SY, SHEET, reduced } = o;
  const variant = () => ({ seed: rnd() * 100, paperXf: [rnd.range(-2.5, 2.5), rnd.range(-1.5, 1.5), rnd() < 0.5 ? 0 : Math.PI, 0],
    logoOff: [rnd.range(-0.15, 0.15), rnd.range(-0.15, 0.15)], warp: [rnd.range(0.05, 0.3), rnd.range(-0.18, 0.04), rnd.range(-0.1, 0.1)],
    jx: rnd.range(-0.6, 0.6), jy: rnd.range(-0.5, 0.5), jr: rnd.range(-0.015, 0.015) });
  const vQ = o.top || variant();

  // ---- l'horloge : go(k) va à l'étape à son rythme ; scrub(p) suit le défilement (p : 0 → 3, en étapes ; la page donne
  //      à chaque étape une longueur proportionnelle à sa durée : le défilement est le temps) ----
  let vt = 0, target = 0, k = 0, scrubbing = false;
  const go = i => { scrubbing = false; k = Math.max(0, Math.min(VKEYS.length - 1, i)); target = VKEYS[k]; if (reduced) vt = target; };
  const jump = i => { go(i); vt = target; };
  function scrub(p) {
    p = Math.max(0, Math.min(VKEYS.length - 1, p));
    const i = Math.min(VKEYS.length - 2, Math.floor(p)), f = p - i;
    scrubbing = true; k = Math.round(p); target = VKEYS[i] + (VKEYS[i + 1] - VKEYS[i]) * f;
    if (reduced) vt = VKEYS[k];
  }
  // (11/10, Maxence : « réactif, mais aucune partie en accéléré ») : l'histoire suit le défilement, sans jamais aller
  // plus vite que 2,2 × son allure réelle (3 × en rembobinant)
  const MAX_F = 2.2, MAX_B = 3;
  function update(dt) {
    if (scrubbing) {
      const d = target - vt, mv = d * (1 - Math.exp(-dt * 8)), cap = (d > 0 ? MAX_F : MAX_B) * dt;
      vt += Math.sign(mv) * Math.min(Math.abs(mv), cap);
      if (Math.abs(target - vt) < 1e-3) vt = target;
      return;
    }
    if (vt < target) vt = Math.min(target, vt + dt);
    else if (vt > target) vt = Math.max(target, vt - dt * BACK_SPEED);
  }
  const on = () => vt > 0.0005 || target > 0;
  const r2 = () => vt - K[1], r3 = () => vt - K[2];

  // ---- les places (repère de la feuille : son centre, mm) ----
  const BOT = -SHEET.h / 2;
  // la carte question : (12/10, Maxence) posée entière sur le bas de la feuille — elle n'en dépasse jamais
  const QY = BOT + CH / 2 + 9;
  const QIN = QY;
  function questionRel() {
    const u = easeOut(span(0, 1.7, vt)), up = ease(span(0, 0.7, r2()));
    const y = lerp(lerp(BOT - 230, QY, u), QIN, up), x = lerp(vQ.jx * 2, 0, up);
    return M4.model(0, 0, lerp(-0.025 + vQ.jr, -0.01, up), x, y, 0.45 + 3 * (1 - u));
  }
  // l'enveloppe : dressée, elle arrive de la gauche et avale la feuille ; puis elle tourne (autour de l'endroit du
  // cachet) en glissant jusqu'au centre, et se couche
  const ENV_Z = -0.2, SEAL_L = (ENV.h / 2 - FLAP_H + SEAL_OFF) * ENV_K, PIV = [SEAL_L, 0];
  // (12/10, Maxence : le bas de l'objet toujours à la même distance de la description) couchée, l'enveloppe a son bas
  // sur celui de la feuille
  const ENV_DY = BOT + ENV.h * ENV_K / 2;
  const landU = () => ease(span(1.9, 3.1, r2()));
  const rzOf = () => -Math.PI / 2 * (1 - landU());
  function envCenter() {
    const rz = rzOf(), us = ease(span(0.6, 1.8, r2())), u = landU();
    const cx = PIV[0] + SEAL_L * Math.sin(rz) - u * SEAL_L, cy = PIV[1] - SEAL_L * Math.cos(rz) + u * SEAL_L;   // centre = pivot − R(rz)·(0, SEAL_L), recentré
    return [cx - (ENV.h * ENV_K + 40) * (1 - us), cy + ENV_DY * u];
  }
  function envRel() {
    const [cx, cy] = envCenter();
    return M4.mul(M4.mul(T(cx, cy, ENV_Z), M4.model(0, 0, rzOf())), S(ENV_K));
  }
  // le cachet, là où il est (repère de la feuille) : centre + R(rz)·(0, SEAL_L)
  function sealAt() { const [cx, cy] = envCenter(), rz = rzOf(); return [cx - SEAL_L * Math.sin(rz), cy + SEAL_L * Math.cos(rz)]; }
  // le rabat se referme, puis la cire et le cachet, à leur allure réelle — tout dans l'étape 2
  const FLAP_AT = 3.3, SEAL_AT = 4.7;
  const ppOf = () => {
    if (vt > K[2]) return PO.seal[1] + 0.3;
    const r = r2();
    if (r < SEAL_AT) return Math.min(PO.seal[0] - 0.02, PO.flap[0] - 0.05 + Math.max(0, r - FLAP_AT) * (PO.flap[1] - PO.flap[0] + 0.05) / 0.95);
    return Math.min(PO.seal[1] + 0.3, PO.seal[0] - 0.02 + (r - SEAL_AT));
  };

  // ---- étape 3 : la carte mystère, sous le cachet, et le fil (mystery.js : la même pose sur l'enveloppe envoyée) ----
  const myst = createMystery(gl, card, variant);
  // ---- ce que sheet.js reprend : l'enveloppe (dans le repère de la feuille), la feuille, la caméra ----
  function envState() {
    if (!on() || vt <= K[1] + 0.6) return null;
    return { ev: 0, pp: ppOf(), fade: 1, rel: envRel(), bulge: sstep(1.4, 1.8, r2()), flapDz: 0.35, sealRot: -rzOf(), noBot: true, vNotch: V_NOTCH };
  }
  // la feuille, une fois dans l'enveloppe : elle tourne avec elle (on la voit dans le V du dos, rabat ouvert)
  function sheetState() {
    if (!on() || vt <= K[1] + 1.85) return null;
    const [cx, cy] = envCenter();
    return { rel: M4.mul(M4.mul(T(cx, cy, ENV_Z + 0.2), M4.model(0, 0, rzOf())), M4.model(0, 0, Math.PI / 2)) };
  }
  // la vue : celle de la feuille ; l'enveloppe couchée tient dans la largeur (la vue recule juste assez)
  function camera(f, frameFor, W, H) {
    if (!on()) return null;
    const lg = c => ({ cx: c.cx, cy: c.cy, lD: Math.log(c.D) });
    let c = lg(f.A), Hw = f.A.Hw;
    const need = ENV.w * ENV_K / 0.92 * H / W, kz = Math.max(1, need / (Hw || need)), u = vt > K[1] ? landU() : 0;
    // (12/10) la vue recule autour du bas de la feuille (le bas de l'enveloppe) : il reste à sa place à l'écran
    const YB = SY + BOT;
    if (kz > 1 && u > 0) { const kk = 1 + (kz - 1) * u; c = { cx: c.cx, cy: YB + (f.A.cy - YB) * kk, lD: c.lD + Math.log(kk) }; Hw *= kk; }
    // (12/10, Maxence : « ne zoom pas du tout au moment de la cire ») la vue ne s'approche plus du cachet
    return Number.isFinite(c.cx + c.cy + c.lD) ? c : null;
  }
  function focus() {
    if (!on() || vt <= K[1] + 0.6) return null;
    const [sx, sy] = sealAt();
    return { x: sx, y: SY + sy, envW: sstep(0.6, 2.0, r2()) };
  }

  // ---- dessin de ce qui est propre à la vitrine ----
  function draw(vp, eye, P, Msheet, Menv) {
    if (!on()) return { occ: null };
    let occ = null;
    // la carte question (elle suit la feuille, jusque dans l'enveloppe)
    // (après le paiement, o.noCard : la carte est celle de la personne, posée face visible — sheet.js la dessine)
    if (!o.noCard) {
      const Mq = M4.mul(M4.mul(Msheet, questionRel()), S(CARD_S));
      card.draw(vp, eye, P, { model: Mq, lod: 'fine', ...vQ });
      if (vt > 1.5 && vt < K[1] + 1.85) occ = { m: Mq, k: true };
    }
    // (le repère de l'enveloppe sans son échelle : les mesures en mm)
    if (Menv && vt > K[2] + 0.2) myst.draw(vp, eye, P, M4.mul(Menv, S(1 / ENV_K)), r3());
    return { occ };
  }

  function free() { myst.free(); }
  const seek = v => { scrubbing = false; vt = target = Math.max(0, Math.min(VKEYS[VKEYS.length - 1], v)); };   // (essais : un instant précis)
  return { on, update, go, jump, scrub, seek, state: () => ({ vt, target, k, arrived: Math.abs(vt - target) < 1e-3, keys: VKEYS }), envState, sheetState, camera, focus, draw, free };
}
