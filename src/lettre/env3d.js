// L'enveloppe d'« un poème par mois », en direct (12/10, Maxence : « l'enveloppe n'est pas la même, elle a un rabat en
// bas ») : le vrai moteur des cartes, la même enveloppe que la vitrine du poème — le dos sans rabat du bas, le rabat du
// haut fermé, le cachet de cire argenté sur sa pointe, le léger bombé de la lettre dedans. Elle respire comme le livre
// (book3d.js : mêmes gestes, même lampe rasante) ; on la prend en main (la face, sans adresse, de l'autre côté).
import { createCardRenderer, M4 } from '../cards/cardRenderer.js';
import { LOOK } from '../cards/scene.js';
import { ENV, ENV_BACK_H, FLAP_H, SEAL_D, SEAL_K, SEAL_IN, SEAL_WOB, SEAL_LOOK0, SEAL_SHAPE0, sealDraw, sealForm, envPieces } from '../sheet/envelope.js';
import { stageLamp } from '../livres/book3d.js';
import { stageView, MM } from '../app/stage.js';

// (12/10, Maxence) une enveloppe A5 (210 × 148 mm), dans le monde commun (à l'échelle de la feuille A4 du poème, sur
// son horizon) ; le cachet à sa taille classique (27 mm) : en proportion plus grand ici que sur l'enveloppe de la feuille
export const ENV_MM = { w: 210, h: 148 };
const EK = ENV_MM.w / ENV.w * MM;                 // la forme de l'enveloppe (229 × 162) ramenée à l'A5, en unités
const SEAL_K2 = MM / EK;                          // le cachet (27 mm réels) dans le repère de l'enveloppe
const T = (x, y, z) => M4.model(0, 0, 0, x, y, z);
const S = k => new Float32Array([k, 0, 0, 0, 0, k, 0, 0, 0, 0, k, 0, 0, 0, 0, 1]);

export async function createEnvelope(gl, base = './') {
  const card = await createCardRenderer(gl, base);
  card.addShape('env', { ...ENV, fine: null });
  card.addShape('envBack', { ...ENV, h: ENV_BACK_H, fine: null });
  card.addShape('flap', { ...ENV, h: FLAP_H, fine: null });
  // le cachet : tiré une fois par visite (chaque cachet est différent), le logo droit
  let sd = (Math.random() * 1e9) >>> 0 || 11; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  rnd.range = (a, b) => a + (b - a) * rnd();
  const SD = sealDraw(rnd), SH = SEAL_SHAPE0, Fm = sealForm(1, SEAL_LOOK0, SH);
  const sealLod = card.addShape('seal-lettre', { w: SEAL_D, h: SEAL_D, r: SEAL_D / 2, t: 0.2, fine: [SEAL_D / 2 + 1, SEAL_D / 2 + 1, 0.2, 0, 0], seg: 48, wobble: SEAL_WOB, wobPhase: SD.wobPhase, alwaysFine: true });
  const EP = envPieces(1, 1);
  const envBase = { seed: 23, paperXf: [0.4, -0.3, 0, 0], warp: [0.1, -0.04, 0], paperTile: 0.6 * 87 / 0.7, paperLo: 0.35, noLogo: true };
  const L = { ...LOOK };

  function frame(W, H, cw, ch, t = 0, tilt = { x: 0, y: 0 }, spin = { x: 0, y: 0 }) {
    const v = stageView(cw, ch);
    const bx = 0.6 * Math.sin(t * 0.53) + 0.4 * Math.sin(t * 1.21), by = 0.6 * Math.sin(t * 0.41) + 0.4 * Math.sin(t * 1.03);
    const rx = 0.03 * bx - 0.3 * tilt.y + spin.x, ry = 0.04 * by + 0.42 * tilt.x + spin.y, rz = 0.006 * Math.sin(t * 0.27);
    const dz = 1.5 * Math.sin(t * 0.29);
    const P = stageLamp(L, v, t, tilt, 1.25, 0.35);
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    const Me = M4.mul(M4.model(rx, ry, rz, 0, 0, -1 + dz), S(EK));
    card.draw(v.vp, v.eye, P, { model: Me, lod: 'env', ...envBase, ...EP.front });
    // le dos, sans rabat du bas (comme la vitrine du poème)
    card.draw(v.vp, v.eye, P, { model: M4.mul(Me, T(0, -(ENV.h - ENV_BACK_H) / 2, 1.6)), lod: 'envBack', ...envBase, seed: 31, ...EP.back, triB: [0, 0, 0, 0] });
    const Mf = M4.mul(Me, M4.mul(M4.mul(T(0, ENV.h / 2, 1.9), M4.model(Math.PI, 0, 0)), T(0, FLAP_H / 2, 0)));
    card.draw(v.vp, v.eye, P, { model: Mf, lod: 'flap', ...envBase, seed: 43, clip: [1, -FLAP_H / 2, FLAP_H, ENV.w / 2], ...EP.flap });
    const Ms = M4.mul(M4.mul(Mf, T(0, FLAP_H / 2 - 7 * SEAL_K2, -0.19 - EP.sealDz)), S(SEAL_K2));
    card.draw(v.vp, v.eye, { ...P, ...Fm.look }, { model: Ms, lod: sealLod, seed: 7, paperXf: [0, 0, 0, 0], paperLo: SH.marbre, logoOff: [SD.offX, SD.offY],
      logoScale: [SEAL_K, -SEAL_K], warp: [0, 0, 0], seal: [1, SEAL_IN, SEAL_D / 2, SEAL_WOB], form: 1,
      sealP: [SH.hd, SH.hc, SH.crest, Fm.ring], sealQ: [Fm.pits, Fm.cavWall, SH.cavEdge, SH.aoW], sealV4: [SD.wobPhase, SD.crest, SD.tilt, Fm.peau],
      sealR: [SH.film, SH.sss, SD.offX, SD.offY], blend: true });
  }
  const hw = ENV.w * EK / 2, hh = ENV.h * EK / 2;
  function rect(cw, ch) { const v = stageView(cw, ch), a = v.project(-hw, hh), c = v.project(hw, -hh); return { l: a[0], t: a[1], r: c[0], b: c[1] }; }
  return { frame, rect, bottom: () => -hh };
}
