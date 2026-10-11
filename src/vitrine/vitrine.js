// La vitrine (11/10, alt.html) : ce qu'il y a dans l'envoi, joué EN DIRECT dans la scène de la feuille. Rien ne bouge
// tout seul : l'animation suit le défilement de la page (on descend, elle avance ; on remonte, elle rembobine, tout de
// suite, même au milieu d'une étape) — scrub(p) ; les flèches font défiler jusqu'à l'étape (go(k) sans page). La vue
// reste celle de la feuille ; seul le cachet se regarde de près.
//   0 la feuille
//   1 la carte question arrive du bas de l'écran et se pose en bas, à cheval sur la feuille (face cachée)
//   2 la carte remonte sur la feuille ; l'enveloppe (à sa mesure, sans rabat du bas) arrive de côté, dressée, et avale la
//     feuille ; elle tourne autour de l'endroit du cachet jusqu'à se coucher ; la carte mystère vient se poser sous le
//     rabat ouvert, un fil noir s'enroule autour d'elle, le rabat se referme
//   3 le tout scellé à la cire : la cire, le cachet (de près)
// Tout est une fonction de l'horloge vt (s). sheet.js dessine la feuille, l'enveloppe et le cachet (ses horloges, sans
// retournement ; l'enveloppe dans le repère de la feuille), la vitrine le reste.
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
const S = k => new Float32Array([k, 0, 0, 0, 0, k, 0, 0, 0, 0, k, 0, 0, 0, 0, 1]);
const ap = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];

// les étapes (s) : la carte ; l'enveloppe et la carte mystère ; le cachet
const D = [1.8, 7.0, 2.4];
export const VKEYS = D.reduce((a, d) => (a.push(a[a.length - 1] + d), a), [0]);
const K = VKEYS;
const BACK_SPEED = 2.6;
const ENV_K = 0.95;                       // l'enveloppe à la mesure de la feuille (A5 dedans, 3–4 mm de jeu)

export function createVitrine(o) {
  const { gl, card, rnd, SY, SHEET, reduced } = o;
  const thread = createThread(gl);
  const variant = () => ({ seed: rnd() * 100, paperXf: [rnd.range(-2.5, 2.5), rnd.range(-1.5, 1.5), rnd() < 0.5 ? 0 : Math.PI, 0],
    logoOff: [rnd.range(-0.15, 0.15), rnd.range(-0.15, 0.15)], warp: [rnd.range(0.05, 0.3), rnd.range(-0.18, 0.04), rnd.range(-0.1, 0.1)],
    jx: rnd.range(-0.6, 0.6), jy: rnd.range(-0.5, 0.5), jr: rnd.range(-0.015, 0.015) });
  const vQ = o.top || variant(), vM = variant();

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
  // la carte question : à cheval sur le bas de la feuille, sous la signature ; puis elle remonte dessus (avant l'enveloppe)
  const QY = Math.min(BOT + 8, (o.sigY ?? -60) - 6 - CARD.h / 2);
  const QIN = BOT + CARD.h / 2 + 7;
  function questionRel() {
    const u = easeOut(span(0, 1.7, vt)), up = ease(span(0, 0.7, r2()));
    const y = lerp(lerp(BOT - 230, QY, u), QIN, up), x = lerp(vQ.jx * 2, 0, up);
    return M4.model(0, 0, lerp(-0.025 + vQ.jr, -0.01, up), x, y, 0.45 + 3 * (1 - u));
  }
  // l'enveloppe : dressée, elle arrive de la gauche et avale la feuille ; puis elle tourne autour de l'endroit du cachet
  // (qui reste au même point) jusqu'à se coucher
  const ENV_Z = -0.2, SEAL_L = (ENV.h / 2 - FLAP_H + 7) * ENV_K, PIV = [SEAL_L, 0];
  const rzOf = () => -Math.PI / 2 * (1 - ease(span(1.9, 3.1, r2())));
  // (11/10, Maxence : « tout doit être bien centré ») : pendant qu'elle tourne, elle glisse aussi jusqu'au centre — couchée,
  // elle est au milieu de la vue (le cachet n'est plus un point fixe, il se déplace un peu avec elle)
  const landU = () => ease(span(1.9, 3.1, r2()));
  function envCenter() {
    const rz = rzOf(), us = ease(span(0.6, 1.8, r2())), u = landU();
    const cx = PIV[0] + SEAL_L * Math.sin(rz) - u * SEAL_L, cy = PIV[1] - SEAL_L * Math.cos(rz) + u * SEAL_L;   // centre = pivot − R(rz)·(0, SEAL_L), recentré
    return [cx - (ENV.h * ENV_K + 40) * (1 - us), cy];
  }
  function envRel() {
    const [cx, cy] = envCenter();
    return M4.mul(M4.mul(T(cx, cy, ENV_Z), M4.model(0, 0, rzOf())), S(ENV_K));
  }
  // le cachet, là où il est (repère de la feuille) : centre + R(rz)·(0, SEAL_L)
  function sealAt() { const [cx, cy] = envCenter(), rz = rzOf(); return [cx - SEAL_L * Math.sin(rz), cy + SEAL_L * Math.cos(rz)]; }
  // le rabat se referme (fin de l'étape 2), puis la cire et le cachet (étape 3)
  // (11/10) la cire n'arrive qu'à l'étape 3 (« le tout scellé à la cire ») : l'étape 2 s'arrête rabat fermé, cire absente ;
  // à l'étape 3, la vue s'approche, puis la cire et le cachet à leur allure réelle
  const ppOf = () => {
    if (vt <= K[2]) return Math.min(PO.seal[0] - 0.02, PO.flap[0] - 0.05 + Math.max(0, r2() - 6.0) * (PO.flap[1] - PO.flap[0] + 0.05) / 0.95);
    return Math.min(PO.seal[1] + 0.3, PO.seal[0] - 0.02 + Math.max(0, r3() - 0.55));
  };
  // la carte mystère : couchée, logo gaufré vers nous, sur le dos de l'enveloppe, sous le rabat (repère de l'enveloppe)
  const M_LOC = [0, -12, 3.7];
  function mysteryLocal() {
    const u = easeOut(span(3.1, 4.2, r2()));
    return M4.model(0, 0, -0.015, M_LOC[0], lerp(150, M_LOC[1], u), M_LOC[2] + 6 * (1 - u));
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
      for (let j = 1; j <= 10; j++) { const u = j / 10; pts.push([a - 3 + 6 * u, h2 - 2 * h2 * u, zf]); }
      edge(a + 3, -h2, 0, Math.PI);
      for (let j = 1; j <= 10; j++) { const u = j / 10; pts.push([a + 3 + (b - 3 - a - 3) * u, -h2 + 2 * h2 * u, -zf]); }
      edge(b - 3, h2, Math.PI, 2 * Math.PI);
    }
    const e = pts[pts.length - 1];
    pts.push([e[0] + 2, e[1] + 0.8, zf + 0.5], [e[0] + 3.4, e[1] - 0.6, zf + 0.7], [e[0] + 2.2, e[1] - 1.8, zf + 0.6], [e[0] + 3.6, e[1] - 6, zf + 0.5], [e[0] + 5, e[1] - 12, zf + 0.6], [e[0] + 5.6, e[1] - 17, zf + 0.8]);
    return pts;
  })();
  const WRAP_L = pathLen(WRAP);

  // ---- ce que sheet.js reprend : l'enveloppe (dans le repère de la feuille), la feuille, la caméra ----
  function envState() {
    if (!on() || vt <= K[1] + 0.6) return null;
    return { ev: 0, pp: ppOf(), fade: 1, rel: envRel(), bulge: sstep(1.4, 1.8, r2()), flapDz: 2.9, sealRot: -rzOf(), noBot: true };
  }
  // (la feuille et la carte question, une fois l'enveloppe posée dessus : cachées — elles sont dedans)
  const sheetState = () => (on() && vt > K[1] + 1.85 ? { hide: true } : null);
  // la vue : celle de la feuille, toujours ; le cachet de près (étape 3)
  function camera(f, frameFor, W, H) {
    if (!on()) return null;
    const lg = c => ({ cx: c.cx, cy: c.cy, lD: Math.log(c.D) });
    const mixC = (a, b, u) => ({ cx: lerp(a.cx, b.cx, u), cy: lerp(a.cy, b.cy, u), lD: lerp(a.lD, b.lD, u) });
    let c = lg(f.A);
    // couchée, l'enveloppe (217 mm) est plus large que la feuille : la vue recule juste assez pour qu'elle tienne (92 %
    // de la largeur), en gardant son centre à la même place à l'écran
    const need = ENV.w * ENV_K / 0.92 * H / W, kz = Math.max(1, need / (f.A.Hw || need)), u = vt > K[1] ? landU() : 0;
    if (kz > 1 && u > 0) { const kk = 1 + (kz - 1) * u; c = { cx: c.cx, cy: SY + (f.A.cy - SY) * kk, lD: c.lD + Math.log(kk) }; }
    if (vt > K[2]) { const [sx, sy] = sealAt(); c = mixC(c, lg(frameFor(SY + sy - 44, SY + sy + 44, sx - 48, sx + 48, 96, W, H)), ease(span(0, 1.1, r3()))); }
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
    if (vt < K[1] + 1.9) {                                                   // la carte question
      const Mq = M4.mul(Msheet, questionRel());
      card.draw(vp, eye, P, { model: Mq, lod: 'fine', ...vQ });
      if (vt > 1.5) occ = { m: Mq };
    }
    if (Menv && r2() > 3.05) {                                               // la carte mystère, et le fil qui l'enroule
      const Mf = M4.mul(Menv, mysteryLocal());
      card.draw(vp, eye, P, { model: M4.mul(Mf, M4.model(0, Math.PI, 0)), lod: 'fine', ...vM, logoK: 1 });
      const u = span(4.2, 5.9, r2());
      if (u > 0) thread.draw(vp, eye, P, WRAP.map(p => ap(Mf, p)), 0.4 / ENV_K, { upTo: WRAP_L * (u * (2 - u)), taper: true, pitch: 1.5 / ENV_K });
    }
    return { occ };
  }

  function free() { thread.free(); }
  return { on, update, go, jump, scrub, state: () => ({ vt, target, k, arrived: Math.abs(vt - target) < 1e-3, keys: VKEYS }), envState, sheetState, camera, focus, draw, free };
}
