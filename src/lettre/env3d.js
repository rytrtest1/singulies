// « Un poème par mois », l'objet en direct (12/10) : le vrai moteur des cartes, dans le monde commun (src/app/stage.js),
// la même grammaire que la vitrine du poème — l'objet raconte, étape par étape, ce qu'on reçoit (Maxence 12/10) :
//   0 « reçois une lettre exclusive aux membres » : le paquet des lettres des membres, liées par un fil noir (une croix,
//     un nœud) ; SINGULIES écrit dessous sur son fil (tag → page.js) — le club, les liens
//   1 « un poème inédit au recto, mes pensées de création au verso » : le paquet part, la feuille arrive (ses lignes :
//     le fil noir cousu, comme sur la feuille du poème) et se retourne
//   2 « le tout dans une enveloppe scellée à la cire » : l'enveloppe (C5, le dos sans rabat du bas) arrive de côté, la
//     feuille (A5 couchée) s'y glisse, le rabat se ferme, la cire, le cachet
//   3 « chaque mois une personne tirée au sort reçoit l'original » : d'autres enveloppes montent derrière elle ; elles
//     se mélangent (la nôtre sort d'un côté et passe derrière), puis une, du milieu, sort de l'autre côté et vient devant
// Une horloge à elle (vt, s) : chaque étape se joue à son rythme quand on y va (points, glissé, molette), se rembobine
// quand on revient (plus vite) ; tout est une fonction de vt. Elle respire comme le livre (book3d.js : mêmes gestes,
// même lampe) ; on la prend en main. Le bas de l'objet ne bouge pas à l'écran (la légende reste à sa distance).
import { createCardRenderer, M4, CARD } from '../cards/cardRenderer.js';
import { LOOK } from '../cards/scene.js';
import { createThread } from '../vitrine/thread.js';
import { ENV, ENV_BACK_H, FLAP_H, SEAL_D, SEAL_K, SEAL_IN, SEAL_WOB, SEAL_LOOK0, SEAL_SHAPE0, sealDraw, sealForm, envPieces } from '../sheet/envelope.js';
import { SHEET, LOGO_Y, LOGO_K } from '../sheet/sheet.js';
import { stageLamp } from '../livres/book3d.js';
import { stageView, MM } from '../app/stage.js';

// (12/10, Maxence : « c'est en A5, mais pas en portrait ») la feuille est une A5 couchée (210 × 148 mm), et l'enveloppe
// celle qui la contient, une C5 (229 × 162 mm), toutes deux à leur vraie taille dans le monde commun (à l'échelle de la
// feuille A4 du poème, sur son horizon) ; le cachet à sa taille classique (27 mm)
export const ENV_MM = { w: 229, h: 162 };
const EK = MM;                                    // la forme de l'enveloppe est en mm (229 × 162)
const SEAL_K2 = MM / EK;                          // le cachet (27 mm réels) dans le repère de l'enveloppe
const SK = MM;                                    // la feuille : la forme A5 couchée en mm (210 × 148)
const A5 = { w: 210, h: 148 }, LOGO_A5 = A5.h / 2 - 16;
const SW = A5.w * SK, SHH = A5.h * SK;            // la feuille, en unités (couchée)
const EW = ENV.w * EK, EH = ENV.h * EK;           // l'enveloppe, en unités
const Y_B = -SHEET.h / 2;                         // le bas de l'objet : celui de la feuille du poème (la légende à la même place) — l'enveloppe à sa place y pose son bas
const EY = Y_B + EH / 2;                          // le centre de l'enveloppe à sa place
const T = (x, y, z) => M4.model(0, 0, 0, x, y, z);
const S = k => new Float32Array([k, 0, 0, 0, 0, k, 0, 0, 0, 0, k, 0, 0, 0, 0, 1]);
const clamp01 = u => Math.min(1, Math.max(0, u));
const span = (a, b, x) => clamp01((x - a) / (b - a));
const ease = u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const easeOut = u => 1 - Math.pow(1 - clamp01(u), 3);
const lerp = (a, b, u) => a + (b - a) * u;
const ap = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];

// les étapes (s) : le paquet de lettres part, la feuille arrive ; elle se retourne ; l'enveloppe et le cachet ; le tirage
const D = [1.6, 1.6, 6.0, 4.2];
export const LKEYS = D.reduce((a, d) => (a.push(a[a.length - 1] + d), a), [0]);
const K = LKEYS, NE = 5, NB = 5;                  // NE : les enveloppes du tirage ; NB : celles du paquet (étape 0)
// (12/10, Maxence) plus de texte sur la feuille : les lignes sont le fil noir cousu, comme sur la feuille du poème —
// au recto le poème (lignes centrées, longueurs de vers), au verso la lettre (paragraphes, alignés à gauche)
const FIL_R = 0.26;
const RECTO = [0.62, 0.5, 0.66, 0.46, 0.58, 0.64, 0.44, 0.52];
const VERSO = [0.9, 0.84, 0.92, 0.4, null, 0.88, 0.94, 0.86, 0.78, 0.3, null, 0.9, 0.82, 0.6];
export async function createEnvelope(gl, base = './') {
  const card = await createCardRenderer(gl, base);
  card.addShape('env', { ...ENV, fine: null });
  card.addShape('envBack', { ...ENV, h: ENV_BACK_H, fine: null });
  card.addShape('flap', { ...ENV, h: FLAP_H, fine: null });
  card.addShape('sheetA5', { w: A5.w, h: A5.h, r: SHEET.r, t: SHEET.t, fine: [10, 10, 0.25, 0, LOGO_A5] });
  // le cachet : tiré une fois par visite (chaque cachet est différent), le logo droit
  let sd = (Math.random() * 1e9) >>> 0 || 11; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  rnd.range = (a, b) => a + (b - a) * rnd();
  const SD = sealDraw(rnd), SH = SEAL_SHAPE0, F1 = sealForm(1, SEAL_LOOK0, SH);
  const sealLod = card.addShape('seal-lettre', { w: SEAL_D, h: SEAL_D, r: SEAL_D / 2, t: 0.2, fine: [SEAL_D / 2 + 1, SEAL_D / 2 + 1, 0.2, 0, 0], seg: 48, wobble: SEAL_WOB, wobPhase: SD.wobPhase, alwaysFine: true });
  const envBase = { seed: 23, paperXf: [0.4, -0.3, 0, 0], warp: [0.1, -0.04, 0], paperTile: 0.6 * 87 / 0.7, paperLo: 0.35, noLogo: true };
  const sheetV = { seed: 51, paperXf: [1.2, -0.6, 0, 0], warp: [0.3, -0.16, 0.04], logoOff: [0, LOGO_A5], logoScale: [LOGO_K, LOGO_K], paperTile: 0.6 * CARD.w / 0.7, paperLo: 0.35 };
  // les autres enveloppes du tirage : chacune un peu de biais, son papier
  const pile = Array.from({ length: NE }, (_, i) => ({ rz: i ? rnd.range(-0.035, 0.035) : 0, seed: 23 + i * 11, dx: i ? rnd.range(-3, 3) : 0 }));
  const L = { ...LOOK };

  // ---- l'horloge : elle va vers l'étape demandée, à son rythme (en arrière plus vite) ----
  // (mouvement réduit : directement l'étape)
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let vt = 0, lastT = null;
  function clock(pT) {
    const t = performance.now() / 1000, target = K[Math.max(0, Math.min(K.length - 1, Math.round(pT)))], dt = lastT == null ? 0 : Math.min(0.1, Math.max(0, t - lastT)); lastT = t;
    if (reduced) vt = target;
    else if (vt < target) vt = Math.min(target, vt + dt);
    else if (vt > target) vt = Math.max(target, vt - dt * Math.max(2.6, (vt - target) / 1.8));
    return vt !== target;
  }

  // ---- les places (unités du monde, l'objet centré en x) ----
  const fil = createThread(gl);
  // (12/10, Maxence) étape 0 : le paquet de lettres — les enveloppes des membres, l'une sur l'autre, un peu de biais,
  // liées par un fil noir (une croix sur le dessus, un nœud) ; SINGULIES écrit dessous sur son fil (page.js : tag)
  const BY = 6;                                    // le paquet : son centre (au-dessus de SINGULIES)
  const bundle = Array.from({ length: NB }, (_, i) => ({ x: i ? rnd.range(-5, 5) : 0, y: i ? rnd.range(-4, 4) : 0, rz: i ? rnd.range(-0.06, 0.06) : 0.01, seed: 61 + i * 13 }));
  const bundleX = r0 => -280 * ease(span(0.0, 1.0, r0));
  const TOPZ = 1.9 * EK + 0.9 + FIL_R + 0.3;         // le fil passe au-dessus du rabat de l'enveloppe du dessus
  const KX = -EW * 0.26, KY = BY - EH * 0.2;                // la croix du fil, à l'écart du cachet ; le nœud au croisement
  const bundleThread = () => {
    const z0 = -NB * 2.6, zt = TOPZ, hw = EW / 2 + 0.6, hh = EH / 2 + 0.6, P = [];
    // l'horizontal : il sort de dessous le paquet à gauche, court sur le dessus, y redescend à droite
    const H = [[-hw - 0.4, KY, z0], [-hw, KY, zt * 0.5]];
    for (let x = -hw + 1.5; x <= hw - 1.5; x += 3) H.push([x, KY + 0.25 * Math.sin(x * 0.11), zt]);
    H.push([hw, KY, zt * 0.5], [hw + 0.4, KY, z0]);
    const V = [[KX, BY - hh - 0.4, z0], [KX, BY - hh, zt * 0.5]];
    for (let y = BY - hh + 1.5; y <= BY + hh - 1.5; y += 3) V.push([KX + 0.25 * Math.sin(y * 0.13), y, zt + (y > KY ? 0 : 0)]);
    V.push([KX, BY + hh, zt * 0.5], [KX, BY + hh + 0.4, z0]);
    // le nœud : deux boucles et deux bouts qui pendent
    const loop = sg => [[0, 0], [sg * 5.6, 4.8], [sg * 12.6, 4.5], [sg * 14.7, 0.6], [sg * 10.5, -2.2], [sg * 2.8, -1.1], [0, 0]].map(([a, b]) => [KX + a, KY + b, zt + 0.6]);
    const tail = sg => [[0, 0], [sg * 2, -4.9], [sg * 4.5, -12], [sg * 6.4, -18]].map(([a, b]) => [KX + a, KY + b, zt + 0.4]);
    return [H, V, loop(1), loop(-1), tail(1), tail(-1)];
  };
  const BT = bundleThread();
  // l'enveloppe (repère : Me) : face, dos sans rabat du bas, rabat (fl : 0 ouvert → 1 fermé), cachet (us : sa pose)
  function drawEnv(v, P, Me, { seed = 23, ep = envPieces(1, 1), fl = 1, us = 1, F = F1, si = 0, fade = 1 } = {}) {
    const eb = { ...envBase, seed, fade };
    const th = Math.PI * fl, hz = 1.9 * fl;
    const Mf = M4.mul(Me, M4.mul(M4.mul(T(0, ENV.h / 2, hz), M4.model(th, 0, 0)), T(0, FLAP_H / 2, 0)));
    const occ = fl > 0.02 && fl < 0.995 ? { m: Mf, tri: [ENV.w / 2, FLAP_H] } : null;
    card.draw(v.vp, v.eye, P, { model: Me, lod: 'env', ...eb, ...ep.front });
    card.draw(v.vp, v.eye, P, { model: M4.mul(Me, T(0, -(ENV.h - ENV_BACK_H) / 2, 1.6)), lod: 'envBack', ...eb, seed: seed + 8, ...ep.back, triB: [0, 0, 0, 0], occ });
    card.draw(v.vp, v.eye, P, { model: Mf, lod: 'flap', ...eb, seed: seed + 20, clip: [1, -FLAP_H / 2, FLAP_H, ENV.w / 2], ...ep.flap });
    if (us <= 0) return;
    const Ms = M4.mul(M4.mul(Mf, T(0, FLAP_H / 2 - 7 * SEAL_K2, -0.19 - ep.sealDz)), S(SEAL_K2));
    card.draw(v.vp, v.eye, { ...P, ...F.look }, { model: Ms, lod: sealLod, seed: 7 + si, paperXf: [0, 0, 0, 0], paperLo: SH.marbre, logoOff: [SD.offX, SD.offY],
      logoScale: [SEAL_K, -SEAL_K], warp: [0, 0, 0], seal: [1, SEAL_IN, SEAL_D / 2, SEAL_WOB], form: F.form ?? 1, fade: span(0, 0.04, us) * fade,
      sealP: [SH.hd, SH.hc, SH.crest, F.ring], sealQ: [F.pits, F.cavWall, SH.cavEdge, SH.aoW], sealV4: [SD.wobPhase, SD.crest, SD.tilt, F.peau],
      sealR: [SH.film, SH.sss, SD.offX, SD.offY], blend: true });
  }
  // l'enveloppe de l'étape 3 : elle arrive de côté, à sa place (jamais plus bas : elle passerait sur la légende)
  function envPos(r2) {
    const uin = easeOut(span(0, 1.5, r2));
    return [lerp(-260, 0, uin), EY, -6 * (1 - uin)];
  }
  // la feuille (couchée, A5) : elle arrive de droite (le paquet part à gauche), se retourne (la lettre), puis au-dessus
  // de l'enveloppe, et dedans
  function sheetM(r0, r1, r2) {
    const xin = 280 * (1 - easeOut(span(0.5, 1.6, r0)));
    const fl = ease(span(0.05, 1.45, r1)), lift = 7 * Math.sin(Math.PI * fl);
    let M = M4.mul(T(xin, 0, lift), M4.model(0, Math.PI * fl, 0));
    if (r2 > 0) {
      const rot = ease(span(0.3, 1.6, r2)), sl = ease(span(1.8, 3.2, r2));
      const zin = 0.75 * EK, yA = EY + EH / 2 + SHH / 2 + 3, yIn = EY - 2;
      // (devant l'enveloppe tant qu'elle passe au-dessus d'elle ; dans la poche dès qu'elle y entre)
      const y = lerp(lerp(0, yA, rot), yIn, sl);
      const z = lerp((zin + 3) * easeOut(span(0, 0.8, r2)), zin, ease(span(1.8, 2.0, r2)));
      M = M4.mul(T(0, y, z), M4.model(0, Math.PI, 0));
    }
    return M4.mul(M, S(SK));
  }
  // les lignes de fil de la feuille (repère de la feuille, mm de la forme A5) : face +1 (recto) ou −1 (verso)
  const sheetLines = (() => {
    const out = [], W0 = A5.w - 60, zt = SHEET.t / 2 + FIL_R / SK + 0.2;
    const line = (x0, x1, y, side) => {
      const z = side * zt, pts = [[x0 - 0.3, y, -side * 0.1], [x0 + 0.4, y, z * 0.6]];
      for (let x = x0 + 1.4; x < x1 - 0.4; x += 1.4) pts.push([x, y + 0.05 * Math.sin(x * 0.7 + y), z + side * 0.05 * Math.sin(x * 1.3 + y)]);
      pts.push([x1 - 0.4, y, z * 0.6], [x1 + 0.3, y, -side * 0.1]);
      return pts;
    };
    const lead = 9.5, h0 = (RECTO.length - 1) * lead / 2 - 4;
    RECTO.forEach((w, i) => { const L = W0 * w; out.push(line(-L / 2, L / 2, h0 - i * lead, 1)); });
    // (verso : vu retourné, la gauche de la lettre est à droite du repère)
    const lv = 7.6, v0 = (VERSO.length - 1) * lv / 2 - 2;
    VERSO.forEach((w, i) => { if (w == null) return; const L = W0 * w; out.push(line(W0 / 2 - L, W0 / 2, v0 - i * lv, -1)); });
    return out;
  })();

  // le tirage : les autres montent derrière la nôtre (une pile, chacune un cran plus haut et plus loin) ; la nôtre
  // sort à gauche et passe derrière ; celle du milieu sort à droite et vient devant
  const slotY = s => 8.5 * s, slotZ = s => -3.6 * s;
  function pilePos(i, r3) {
    if (i === 0) {
      const u = ease(span(1.5, 2.8, r3)), s = 4 * u;
      return [-200 * Math.sin(Math.PI * u), slotY(s), slotZ(s) - 2 * Math.sin(Math.PI * u), 0];
    }
    const ui = easeOut(span(0.1 + 0.16 * i, 1.25 + 0.16 * i, r3));
    const sh = ease(span(1.5, 2.8, r3));
    let s = i - sh, x = pile[i].dx, y = slotY(s) - (1 - ui) * (250 + 18 * i), z = slotZ(s) - 4 * (1 - ui), rz = pile[i].rz;
    if (i === 3) {   // l'élue (au milieu de la pile une fois mélangée)
      const u = ease(span(2.8, 4.1, r3));
      x = lerp(x, 0, u) + 200 * Math.sin(Math.PI * Math.min(1, u * 1.05));
      y = lerp(y, 0, u); z = lerp(z, 5, u) + 4 * Math.sin(Math.PI * u); rz = lerp(rz, 0, u);
    }
    return [x, y, z, rz];
  }

  // W, H : px du canvas ; cw, ch : px CSS ; t (s) ; tilt ; spin (en main) ; p : l'étape (glissée) ; pT : l'étape voulue
  function frame(W, H, cw, ch, t = 0, tilt = { x: 0, y: 0 }, spin = { x: 0, y: 0 }, p = 0, pT = p) {
    const moving = clock(pT);
    const v = stageView(cw, ch);
    const bx = 0.6 * Math.sin(t * 0.53) + 0.4 * Math.sin(t * 1.21), by = 0.6 * Math.sin(t * 0.41) + 0.4 * Math.sin(t * 1.03);
    const rx = 0.03 * bx - 0.3 * tilt.y + spin.x, ry = 0.04 * by + 0.42 * tilt.x + spin.y, rz = 0.006 * Math.sin(t * 0.27);
    const dz = 1.5 * Math.sin(t * 0.29);
    const P = stageLamp(L, v, t, tilt, 2.2, 0.35, true);
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    // la prise en main tourne tout l'objet autour du bas de l'objet relevé de la moitié de l'enveloppe
    const R = M4.mul(M4.mul(T(0, EY, -1 + dz), M4.model(rx, ry, rz)), T(0, -EY, 0));
    const r0 = Math.min(vt, K[1]), r1 = Math.max(0, Math.min(vt, K[2]) - K[1]), r2 = vt - K[2], r3 = vt - K[3];
    // ---- 0 le paquet de lettres, lié ----
    if (r0 < 1.0) {
      const Mb = M4.mul(R, T(bundleX(r0), 0, 0));
      for (let i = NB - 1; i >= 0; i--) {
        const b = bundle[i];
        drawEnv(v, P, M4.mul(Mb, M4.mul(M4.mul(T(b.x, BY + b.y, -i * 2.6), M4.model(0, 0, b.rz)), S(EK))), { seed: b.seed, si: i + 10 });
      }
      for (const pts of BT) fil.draw(v.vp, v.eye, P, pts.map(q => ap(Mb, q)), 0.4, { pitch: 1.3 });   // (le fil du paquet, un peu plus gros : il lie)
    }
    // ---- 1–2 la feuille ; elle entre dans l'enveloppe (jusqu'à ce que le rabat soit fermé : ensuite on ne la voit plus) ----
    if (r0 > 0.45 && r2 < 4.8) {
      const Ms = M4.mul(R, sheetM(r0, r1, r2));
      card.draw(v.vp, v.eye, P, { model: Ms, lod: 'sheetA5', ...sheetV });
      if (r2 < 3.0) for (const pts of sheetLines) fil.draw(v.vp, v.eye, P, pts.map(q => ap(Ms, q)), FIL_R, { pitch: 1.0 });
    }
    // ---- 3 l'enveloppe, le cachet ; 4 le tirage ----
    if (r2 > 0) {
      const uFlap = ease(span(3.6, 4.7, r2)), bulge = ease(span(2.4, 3.4, r2)), uSe = span(4.7, 5.9, r2);
      const EP = envPieces(bulge, uFlap);
      const Fm = uSe < 1 ? sealForm(uSe, SEAL_LOOK0, SH) : F1;
      for (let i = 0; i < NE; i++) {
        if (i > 0 && r3 <= 0.05) continue;
        let Me;
        if (r3 > 0) { const [x, y, z, a] = pilePos(i, r3); Me = M4.mul(R, M4.mul(M4.mul(T(x, EY + y, z), M4.model(0, 0, a)), S(EK))); }
        else { const [x, y, z] = envPos(r2); Me = M4.mul(R, M4.mul(T(x, y, z), S(EK))); }
        drawEnv(v, P, Me, i ? { seed: pile[i].seed, si: i } : { seed: pile[0].seed, ep: EP, fl: uFlap, us: uSe, F: Fm });
      }
    }
    return moving;
  }
  // SINGULIES, écrit sous le paquet sur son fil (page.js le place) : où et combien on le voit
  function tag(cw, ch) {
    const v = stageView(cw, ch), q = v.project(bundleX(Math.min(vt, K[1])), BY - EH / 2 - 14);
    return { x: q[0], y: q[1], o: 1 - span(0, 0.6, vt) };
  }
  // la prise (px CSS) : la feuille debout, ou l'enveloppe ; le bas : toujours le même
  function rect(cw, ch, p) {
    const v = stageView(cw, ch), [hw, y0, y1] = vt < 0.8 ? [EW / 2, BY - EH / 2, BY + EH / 2] : vt < K[2] + 1.5 ? [SW / 2, -SHH / 2, SHH / 2] : [EW / 2, Y_B, Y_B + EH];
    const a = v.project(-hw, y1), c = v.project(hw, y0);
    return { l: a[0], t: a[1], r: c[0], b: c[1] };
  }
  return { frame, rect, tag, bottom: () => Y_B, keys: LKEYS, state: () => ({ vt }), seek: x => { vt = x; } };   // (essais)
}
