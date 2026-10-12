// L'enveloppe d'« un poème par mois », en direct (12/10, Maxence : « l'enveloppe n'est pas la même, elle a un rabat en
// bas ») : le vrai moteur des cartes, la même enveloppe que la vitrine du poème — le dos sans rabat du bas, le rabat du
// haut fermé, le cachet de cire argenté sur sa pointe, le léger bombé de la lettre dedans. Elle respire comme le livre
// (book3d.js : mêmes gestes, même lampe rasante) ; on la prend en main (la face, sans adresse, de l'autre côté).
import { createCardRenderer, M4 } from '../cards/cardRenderer.js';
import { LOOK } from '../cards/scene.js';
import { ENV, ENV_BACK_H, FLAP_H, SEAL_D, SEAL_K, SEAL_IN, SEAL_WOB, SEAL_LOOK0, SEAL_SHAPE0, sealDraw, sealForm, envPieces } from '../sheet/envelope.js';
import { mountLive } from '../livres/book3d.js';

export const ENV_ASPECT = 1000 / 760;
const FOV = 26 * Math.PI / 180, TF = Math.tan(FOV / 2);
const CAM_AZ = -Math.PI / 2;
const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
const T = (x, y, z) => M4.model(0, 0, 0, x, y, z);

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

  function frame(W, H, t = 0, tilt = { x: 0, y: 0 }, spin = { x: 0, y: 0 }) {
    const bx = 0.6 * Math.sin(t * 0.53) + 0.4 * Math.sin(t * 1.21), by = 0.6 * Math.sin(t * 0.41) + 0.4 * Math.sin(t * 1.03);
    const rx = 0.03 * bx - 0.3 * tilt.y + spin.x, ry = 0.04 * by + 0.42 * tilt.x + spin.y, rz = 0.006 * Math.sin(t * 0.27);
    const dz = 2 * Math.sin(t * 0.29);
    // cadrage : l'enveloppe entière, avec la marge qu'il lui faut pour tourner sans sortir
    const Hw = Math.max((ENV.h + 30) * 1.1, (ENV.w + 30) * 1.08 * H / W), D = Hw / (2 * TF);
    const eye = [0, 0, D];
    const vp = M4.mul(M4.perspective(FOV, W / H, D * 0.25, D * 3), M4.lookAt(eye, [0, 0, 0], [0, 1, 0]));
    // la lampe des cartes, à la mesure de l'objet : rasante, de côté (en haut à gauche), elle tourne et respire
    const kf = 2.2, k = Hw / 235, R = L.lightR0 * Hw * kf, Z = L.lightZ * k * kf, D0 = Math.hypot(R, Z), el0 = Math.atan2(Z, R);
    const back = CAM_AZ + Math.PI, lim = Math.PI - L.lampGap;
    let rel = wrapA(L.lightAz + 0.35 + L.breathAz * (0.72 * Math.sin(t * 0.33) + 0.28 * Math.sin(t * 0.69)) + 0.5 * tilt.x - back);
    rel = lim * Math.tanh(rel / lim);
    const az = back + rel, mid = (L.elMin + L.elMax) / 2, half = (L.elMax - L.elMin) / 2;
    const el = mid + half * Math.tanh((L.elBase + L.breathEl * (0.7 * Math.sin(t * 0.27) + 0.3 * Math.sin(t * 0.61)) + 0.2 * tilt.y - mid) / half);
    const P = { ...L, lightPos: [Math.cos(az) * D0 * Math.cos(el), Math.sin(az) * D0 * Math.cos(el), D0 * Math.sin(el)],
      light: L.light * k * k * kf * kf * Math.sin(el0) / Math.sin(el), spotI: 0 };
    gl.viewport(0, 0, W, H);
    gl.clearColor(6 / 255, 6 / 255, 6 / 255, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    const Me = M4.model(rx, ry, rz, 0, 0, -1 + dz);
    card.draw(vp, eye, P, { model: Me, lod: 'env', ...envBase, ...EP.front });
    // le dos, sans rabat du bas (comme la vitrine du poème)
    card.draw(vp, eye, P, { model: M4.mul(Me, T(0, -(ENV.h - ENV_BACK_H) / 2, 1.6)), lod: 'envBack', ...envBase, seed: 31, ...EP.back, triB: [0, 0, 0, 0] });
    const Mf = M4.mul(Me, M4.mul(M4.mul(T(0, ENV.h / 2, 1.9), M4.model(Math.PI, 0, 0)), T(0, FLAP_H / 2, 0)));
    card.draw(vp, eye, P, { model: Mf, lod: 'flap', ...envBase, seed: 43, clip: [1, -FLAP_H / 2, FLAP_H, ENV.w / 2], ...EP.flap });
    const Ms = M4.mul(Mf, T(0, FLAP_H / 2 - 7, -0.19 - EP.sealDz));
    card.draw(vp, eye, { ...P, ...Fm.look }, { model: Ms, lod: sealLod, seed: 7, paperXf: [0, 0, 0, 0], paperLo: SH.marbre, logoOff: [SD.offX, SD.offY],
      logoScale: [SEAL_K, -SEAL_K], warp: [0, 0, 0], seal: [1, SEAL_IN, SEAL_D / 2, SEAL_WOB], form: 1,
      sealP: [SH.hd, SH.hc, SH.crest, Fm.ring], sealQ: [Fm.pits, Fm.cavWall, SH.cavEdge, SH.aoW], sealV4: [SD.wobPhase, SD.crest, SD.tilt, Fm.peau],
      sealR: [SH.film, SH.sss, SD.offX, SD.offY], blend: true });
  }
  return { frame };
}

export function mountEnvelope(box, base = './', o = {}) { return mountLive(box, gl => createEnvelope(gl, base), ENV_ASPECT, o); }
