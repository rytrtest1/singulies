// « Un poème par mois », l'objet en direct (12/10) : le vrai moteur des cartes, dans le monde commun (src/app/stage.js),
// la même grammaire que la vitrine du poème — l'objet raconte, étape par étape, ce qu'on reçoit (Maxence 12/10) :
//   0 « une lettre mensuelle exclusive aux membres » : les lettres des membres, cachetées, dérivent lentement de gauche
//     à droite, liées par un même fil noir ; derrière, le logo SINGULIES en très grand, à peine visible (mark → page.js)
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
import { objLamp } from '../livres/book3d.js';
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
const D = [3.3, 6.0, 4.2];
export const LKEYS = D.reduce((a, d) => (a.push(a[a.length - 1] + d), a), [0]);
const K = LKEYS, NE = 5;                          // NE : les enveloppes du tirage
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
  const envBase = { seed: 23, paperXf: [0.4, -0.3, 0, 0], warp: [0.1, -0.04, 0], paperTile: 0.6 * 87 / 0.7, paperLo: 0.6, noLogo: true };
  const sheetV = { seed: 51, paperXf: [1.2, -0.6, 0, 0], warp: [0.3, -0.16, 0.04], logoOff: [0, LOGO_A5], logoScale: [LOGO_K, LOGO_K], paperTile: 0.6 * CARD.w / 0.7, paperLo: 0.6 };
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
  // (13/10, Maxence : « pas à la chaîne… plutôt les enveloppes qui défilent lentement de gauche à droite, reliées par
  // le fil, de façon belle, organique ») étape 0 : les lettres des membres, cachetées, dérivent lentement de gauche à
  // droite, chacune à sa profondeur, son balancement, son inclinaison (deux sinus lents non synchronisés, tirés par
  // enveloppe) ; un même fil noir passe sur chacune (sous le cachet) et s'affaisse de l'une à l'autre, avec une onde lente
  // — les membres, liés. Derrière, le logo SINGULIES en très grand, à peine visible (page.js : mark). Plus de tampon.
  const NG = 8, G_SP = EW * 1.14, G_V = 6.5, G_Z = -125;          // nombre, écart (unités), allure (unités / s), profondeur
  const gar = Array.from({ length: NG }, (_, i) => ({ ph: rnd() * 6.283, ph2: rnd() * 6.283, seed: 23 + i * 13, dz: rnd.range(-16, 16), dy: rnd.range(-7, 7) }));
  const THR_Y = -ENV.h * 0.3, THR_Z = 3.2;                         // le fil sur le dos (mm, repère de l'enveloppe)
  function garM(i, t, out) {
    const g = gar[i], L = NG * G_SP, mv = reduced ? 0 : 1;
    let x = ((i * G_SP + G_V * t * mv) % L + L) % L - L / 2;
    x *= 1 + 0.5 * out;                                            // (en partant : elles s'écartent)
    const y = g.dy + mv * (5 * Math.sin(t * 0.21 + g.ph) + 2.5 * Math.sin(t * 0.37 + g.ph2));
    const z = G_Z + g.dz + mv * 9 * Math.sin(t * 0.13 + g.ph) - 40 * out;
    const rz = mv * (0.045 * Math.sin(t * 0.17 + g.ph2) + 0.02 * Math.sin(t * 0.31 + g.ph));
    const ry = mv * 0.14 * Math.sin(t * 0.11 + g.ph) - x * 0.0009, rx = mv * 0.05 * Math.sin(t * 0.19 + g.ph2);
    // (plus loin, plus haut : sur la ligne du regard, au milieu de la place de l'objet)
    return { x, M: M4.mul(M4.model(rx, ry, rz, x, y - z * Math.tan(0.22) + 6, z), S(EK)) };
  }
  const paperOf = k => ({ ...sheetV, seed: 51 + (((k % 7) + 7) % 7) * 9 });
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
  function sheetM(r0, r2, x0 = 0) {
    const fl = ease(span(1.5, 3.1, r0)), lift = 7 * Math.sin(Math.PI * fl);
    let M = M4.mul(T(x0, 0, lift), M4.model(0, Math.PI * fl, 0));
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
      return { side, pts };
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
    const rx = 0.03 * bx - 0.2 * tilt.y + spin.x, ry = 0.04 * by + 0.2 * tilt.x + spin.y, rz = 0.006 * Math.sin(t * 0.27);
    const dz = 1.5 * Math.sin(t * 0.29);
    const P = objLamp(L, EW, t, tilt, 0.35);                     // (13/10) la lampe de la carte, à la mesure de l'enveloppe
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    // la prise en main tourne tout l'objet autour du bas de l'objet relevé de la moitié de l'enveloppe
    const R = M4.mul(M4.mul(T(0, EY, -1 + dz), M4.model(rx, ry, rz)), T(0, -EY, 0));
    const r0 = Math.min(vt, K[1]), r2 = vt - K[1], r3 = vt - K[2];
    // ---- 0 les lettres des membres qui dérivent, liées par le fil ; 1 la feuille arrive et se retourne ; 2 elle entre
    // dans l'enveloppe ----
    const out = ease(span(0.1, 1.1, r0)), others = 1 - span(0.1, 0.9, r0);
    const fl = ease(span(1.5, 3.1, r0));
    if (others > 0.01) {
      const v0 = stageView(cw, ch), half = v0.Hw * cw / ch * 0.5;
      const gs = gar.map((g, i) => ({ i, ...garM(i, t, out) })).sort((a, b) => a.x - b.x);
      const pts = [];
      const W2 = (m, x, y, z) => ap(M4.mul(R, m), [x, y, z]);
      let prev = null;
      for (const g of gs) {
        const Mw = M4.mul(R, g.M);
        // (seulement celles qu'on peut voir : leur fil, lui, court de l'une à l'autre)
        if (Math.abs(g.x) < half * 2.2 + EW) drawEnv(v, P, Mw, { seed: gar[g.i].seed, si: g.i, fade: others });
        const a = W2(g.M, -ENV.w / 2, THR_Y, THR_Z), b = W2(g.M, ENV.w / 2, THR_Y, THR_Z);
        if (prev) {
          const n = 16, len = Math.hypot(a[0] - prev[0], a[1] - prev[1]);
          for (let k = 1; k < n; k++) { const u = k / n, sg = Math.sin(Math.PI * u);
            pts.push([lerp(prev[0], a[0], u), lerp(prev[1], a[1], u) - sg * (len * 0.18 + 2 * Math.sin(t * 0.4 + g.i)), lerp(prev[2], a[2], u) + sg * 4 * Math.sin(t * 0.23 + g.i * 1.3)]); }
        } else pts.push([a[0] - 220, a[1] - 30, a[2] - 20]);
        for (let k = 0; k <= 20; k++) pts.push(W2(g.M, lerp(-ENV.w / 2, ENV.w / 2, k / 20), THR_Y + 0.6 * Math.sin(k * 1.1 + g.i), THR_Z));
        prev = b;
      }
      if (prev) pts.push([prev[0] + 220, prev[1] - 30, prev[2] - 20]);
      fil.draw(v.vp, v.eye, P, pts, FIL_R * 1.6, { pitch: 1.0, fade: others });
    }
    if (r2 < 4.8 && r0 > 0.05) {
      // la feuille : elle monte au centre pendant que les lettres s'éloignent, puis se retourne (étape 1)
      const uin = easeOut(span(0.3, 1.4, r0)), fade = r2 > 0 ? 1 : span(0.3, 1.0, r0);
      const Ms = M4.mul(R, M4.mul(T(0, -36 * (1 - uin), -20 * (1 - uin)), sheetM(r0, r2)));
      card.draw(v.vp, v.eye, P, { model: Ms, lod: 'sheetA5', ...paperOf(0), fade });
      // les lignes du poème au recto ; celles de la lettre au verso, seulement retournée (jamais au travers)
      const flk = r2 > 0 ? 1 : fl;
      if (r2 < 3.0) for (const L of sheetLines) if ((L.side > 0 && flk < 0.55) || (L.side < 0 && flk > 0.45)) fil.draw(v.vp, v.eye, P, L.pts.map(q => ap(Ms, q)), FIL_R, { pitch: 1.0, fade });
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
    return moving || (others > 0.01 && !reduced);   // (les lettres dérivent : on dessine toujours)
  }
  // le logo SINGULIES en très grand derrière les lettres de l'étape 0 (page.js le dessine) : où, quelle taille, combien
  function mark(cw, ch) {
    const v = stageView(cw, ch), q = v.project(0, 0), a = v.project(0, SHEET.h / 2), b = v.project(0, -SHEET.h / 2);
    return { x: q[0], y: q[1], s: Math.min(cw * 1.05, (b[1] - a[1]) * 1.15), o: 0.075 * (1 - span(0, 0.8, vt)) };
  }
  // la prise (px CSS) : la feuille debout, ou l'enveloppe ; le bas : toujours le même
  function rect(cw, ch, p) {
    const v = stageView(cw, ch), [hw, y0, y1] = vt < K[1] + 1.5 ? [SW / 2, -SHH / 2, SHH / 2] : [EW / 2, Y_B, Y_B + EH];
    const a = v.project(-hw, y1), c = v.project(hw, y0);
    return { l: a[0], t: a[1], r: c[0], b: c[1] };
  }
  return { frame, rect, mark, bottom: () => Y_B, keys: LKEYS, state: () => ({ vt }), seek: x => { vt = x; } };   // (essais)
}
