// « Un poème par mois », l'objet en direct (12/10) : le vrai moteur des cartes, dans le monde commun (src/app/stage.js),
// la même grammaire que la vitrine du poème — l'objet raconte, étape par étape, ce qu'on reçoit (Maxence 12/10) :
//   0 « reçois un poème exclusif aux membres » : la feuille, le poème tapé (un poème au hasard : poemes.js)
//   1 « accompagné de mes pensées pendant la création » : la feuille se retourne — au dos, la lettre
//   2 « le tout dans une enveloppe scellée à la cire » : l'enveloppe (C5, le dos sans rabat du bas) monte du bas, la
//     feuille (A5 couchée) s'y glisse, l'enveloppe remonte à sa place, le rabat se ferme, la cire, le cachet
//   3 « une personne tirée au sort reçoit l'original » : d'autres enveloppes montent derrière elle (les membres) ; elles
//     se mélangent (la nôtre sort d'un côté et passe derrière), puis une, du milieu, sort de l'autre côté et vient devant
// Une horloge à elle (vt, s) : chaque étape se joue à son rythme quand on y va (points, glissé, molette), se rembobine
// quand on revient (plus vite) ; tout est une fonction de vt. Elle respire comme le livre (book3d.js : mêmes gestes,
// même lampe) ; on la prend en main. Le bas de l'objet ne bouge pas à l'écran (la légende reste à sa distance).
import { createCardRenderer, M4, CARD } from '../cards/cardRenderer.js';
import { LOOK } from '../cards/scene.js';
import { loadTypeFont, TYPE } from '../cards/ink.js';
import { typeLines } from '../sheet/typewriter.js';
import { ENV, ENV_BACK_H, FLAP_H, SEAL_D, SEAL_K, SEAL_IN, SEAL_WOB, SEAL_LOOK0, SEAL_SHAPE0, sealDraw, sealForm, envPieces } from '../sheet/envelope.js';
import { SHEET, LOGO_Y, LOGO_K } from '../sheet/sheet.js';
import { stageLamp } from '../livres/book3d.js';
import { stageView, MM } from '../app/stage.js';
import { POEMES, PENSEES } from './poemes.js';

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
const PX = 8;                                     // px par unité de l'encre de la feuille
const T = (x, y, z) => M4.model(0, 0, 0, x, y, z);
const S = k => new Float32Array([k, 0, 0, 0, 0, k, 0, 0, 0, 0, k, 0, 0, 0, 0, 1]);
const clamp01 = u => Math.min(1, Math.max(0, u));
const span = (a, b, x) => clamp01((x - a) / (b - a));
const ease = u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const easeOut = u => 1 - Math.pow(1 - clamp01(u), 3);
const lerp = (a, b, u) => a + (b - a) * u;

// les étapes (s) : retourner la feuille ; l'enveloppe et le cachet ; le tirage
const D = [1.6, 6.0, 4.2];
export const LKEYS = D.reduce((a, d) => (a.push(a[a.length - 1] + d), a), [0]);
const K = LKEYS, NE = 5;                          // NE : les enveloppes du tirage (la nôtre comprise)

// l'encre d'une face de la feuille : des lignes tapées, le bloc centré (largeur, hauteur), à partir de yTop (unités)
function inkFace(lines, seed, { lead = 9, top = null } = {}) {
  const cv = new OffscreenCanvas(Math.round(A5.w * PX), Math.round(A5.h * PX)), cx = cv.getContext('2d');
  cx.fillStyle = '#000'; cx.fillRect(0, 0, cv.width, cv.height);
  const long = Math.max(...lines.map(l => l.length)) * TYPE.pitch, k = Math.min(1, (A5.w - 44) / long);
  const h = (lines.length - 1) * lead * k, y0 = top != null ? top : A5.h / 2 - h / 2 + 6, x0 = (A5.w - long * k) / 2;
  typeLines(cx, PX * k, lines, x0 / k, y0 / k, lead, seed, 1, '#fff');
  return cv;
}

export async function createEnvelope(gl, base = './') {
  const card = await createCardRenderer(gl, base);
  await loadTypeFont(base);
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
  // la feuille : le poème (une face), la lettre (l'autre) — un poème au hasard à chaque visite
  const poem = POEMES[Math.floor(Math.random() * POEMES.length)] || { vers: [''] };
  const front = card.makeInk(inkFace(poem.vers.map(v => v.replace(/œ/g, 'oe').replace(/Œ/g, 'OE')), 5), false);
  const back = card.makeInk(inkFace(PENSEES, 9, { lead: 7.4 }), false);
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
  // l'enveloppe : elle monte du bas (un peu plus bas que sa place, la feuille s'y glisse), puis remonte
  // (12/10) elle arrive de côté, à sa place (jamais plus bas : elle passerait sur la légende) ; la feuille monte au-dessus
  // d'elle et s'y glisse
  function envPos(r2) {
    const uin = easeOut(span(0, 1.5, r2));
    return [lerp(-260, 0, uin), EY, -6 * (1 - uin)];
  }
  // la feuille (couchée, A5) : le poème, retournée (la lettre), puis au-dessus de l'enveloppe, et dedans
  function sheetM(r1, r2) {
    const fl = ease(span(0.05, 1.45, r1)), lift = 7 * Math.sin(Math.PI * fl);
    let M = M4.mul(T(0, 0, lift), M4.model(0, Math.PI * fl, 0));
    if (r2 > 0) {
      const rot = ease(span(0.3, 1.6, r2)), sl = ease(span(1.8, 3.2, r2));
      const zin = 0.75 * EK, yA = EY + EH / 2 + SHH / 2 + 3, yIn = EY - 2;
      // (devant l'enveloppe tant qu'elle passe au-dessus d'elle ; dans la poche dès qu'elle y entre)
      const x = 0, y = lerp(lerp(0, yA, rot), yIn, sl);
      const z = lerp((zin + 3) * easeOut(span(0, 0.8, r2)), zin, ease(span(1.8, 2.0, r2)));
      M = M4.mul(T(x, y, z), M4.model(0, Math.PI, 0));
    }
    return M4.mul(M, S(SK));
  }
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
    const r1 = Math.min(vt, K[1]), r2 = vt - K[1], r3 = vt - K[2];
    // la feuille (jusqu'à ce que le rabat soit fermé : ensuite elle est dans l'enveloppe, invisible)
    if (r2 < 4.8) card.draw(v.vp, v.eye, { ...P, inkWear: 0.5, inkThr: 0.28, inkVar: 0.22 }, { model: M4.mul(R, sheetM(r1, r2)), lod: 'sheetA5', inkBack: front, ink: back, ...sheetV });
    if (r2 > 0) {
      const uFlap = ease(span(3.6, 4.7, r2)), bulge = ease(span(2.4, 3.4, r2)), uSe = span(4.7, 5.9, r2);
      const EP = envPieces(bulge, uFlap);
      const Fm = uSe < 1 ? sealForm(uSe, SEAL_LOOK0, SH) : F1;
      for (let i = 0; i < NE; i++) {
        if (i > 0 && r3 <= 0.05) continue;
        let Me;
        if (r3 > 0) { const [x, y, z, a] = pilePos(i, r3); Me = M4.mul(R, M4.mul(M4.mul(T(x, EY + y, z), M4.model(0, 0, a)), S(EK))); }
        else { const [x, y, z] = envPos(r2); Me = M4.mul(R, M4.mul(T(x, y, z), S(EK))); }
        const ep = i ? envPieces(1, 1) : EP, fl = i ? 1 : uFlap, eb = { ...envBase, seed: pile[i].seed };
        const th = Math.PI * fl, hz = 1.9 * fl;
        const Mf = M4.mul(Me, M4.mul(M4.mul(T(0, ENV.h / 2, hz), M4.model(th, 0, 0)), T(0, FLAP_H / 2, 0)));
        const occ = fl > 0.02 && fl < 0.995 ? { m: Mf, tri: [ENV.w / 2, FLAP_H] } : null;
        card.draw(v.vp, v.eye, P, { model: Me, lod: 'env', ...eb, ...ep.front });
        // le dos, sans rabat du bas (comme la vitrine du poème)
        card.draw(v.vp, v.eye, P, { model: M4.mul(Me, T(0, -(ENV.h - ENV_BACK_H) / 2, 1.6)), lod: 'envBack', ...eb, seed: pile[i].seed + 8, ...ep.back, triB: [0, 0, 0, 0], occ });
        card.draw(v.vp, v.eye, P, { model: Mf, lod: 'flap', ...eb, seed: pile[i].seed + 20, clip: [1, -FLAP_H / 2, FLAP_H, ENV.w / 2], ...ep.flap });
        const us = i ? 1 : uSe;
        if (us <= 0) continue;
        const F = i ? F1 : Fm;
        const Ms = M4.mul(M4.mul(Mf, T(0, FLAP_H / 2 - 7 * SEAL_K2, -0.19 - ep.sealDz)), S(SEAL_K2));
        card.draw(v.vp, v.eye, { ...P, ...F.look }, { model: Ms, lod: sealLod, seed: 7 + i, paperXf: [0, 0, 0, 0], paperLo: SH.marbre, logoOff: [SD.offX, SD.offY],
          logoScale: [SEAL_K, -SEAL_K], warp: [0, 0, 0], seal: [1, SEAL_IN, SEAL_D / 2, SEAL_WOB], form: F.form ?? 1, fade: span(0, 0.04, us),
          sealP: [SH.hd, SH.hc, SH.crest, F.ring], sealQ: [F.pits, F.cavWall, SH.cavEdge, SH.aoW], sealV4: [SD.wobPhase, SD.crest, SD.tilt, F.peau],
          sealR: [SH.film, SH.sss, SD.offX, SD.offY], blend: true });
      }
    }
    return moving;
  }
  // la prise (px CSS) : la feuille debout, ou l'enveloppe ; le bas : toujours le même
  function rect(cw, ch, p) {
    const v = stageView(cw, ch), [hw, y0, y1] = vt < K[1] + 1.5 ? [SW / 2, Y_B, Y_B + SHH] : [EW / 2, Y_B, Y_B + EH];
    const a = v.project(-hw, y1), c = v.project(hw, y0);
    return { l: a[0], t: a[1], r: c[0], b: c[1] };
  }
  return { frame, rect, bottom: () => Y_B, keys: LKEYS, state: () => ({ vt }), seek: x => { vt = x; } };   // (essais)
}
