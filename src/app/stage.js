// Le même monde pour toutes les pages (12/10, Maxence : « toutes les pages vivant dans le même environnement ») :
// la feuille du poème donne l'échelle et l'horizon. Même caméra que la scène de la feuille (sheet.js : FOV, TILT,
// frameAbove), même réserve en haut (le bandeau des pages) et en bas (la légende, le bandeau du signe) : un objet posé
// au centre du monde (0, 0) est exactement là où est le centre de la feuille, à la même échelle (unités de la feuille :
// une A4 = 148 × 210 ; 1 mm = MM unité). Le livre, l'enveloppe d'un poème par mois, la feuille : sur la même ligne.
import { M4 } from '../cards/cardRenderer.js';
import { SHEET_INSET } from '../alt/config.js';

export const FOV = 26 * Math.PI / 180, TILT = 0.22, TF = Math.tan(FOV / 2);
export const SH = { w: 148, h: 210 };                 // la feuille (A4), en unités
export const MM = Math.SQRT1_2;                       // unités par millimètre réel
export const NAV_TOP = 46;
export const stageZoom = (W, H) => (W < H ? 0.8 : 0.86);

let sb = null, st = null;
const probe = side => { const d = document.createElement('div'); d.style.cssText = `position:fixed;${side}:0;width:1px;height:env(safe-area-inset-${side});visibility:hidden`; document.body.appendChild(d); const v = d.offsetHeight || 0; d.remove(); return v; };
export const safeBottom = () => (sb ??= probe('bottom'));
export const safeTop = () => (st ??= probe('top'));
export const insetTop = () => NAV_TOP + safeTop();
export const insetBottom = () => SHEET_INSET + safeBottom();

// la vue (W, H : px CSS) — identique à frameAbove de la feuille, la feuille centrée sur (0, 0)
export function stageView(W, H) {
  const ins = Math.min(H * 0.45, insetBottom()), top = Math.min(H * 0.2, insetTop()), z = stageZoom(W, H);
  const He = H - ins - top, y0 = -SH.h / 2 - 8, y1 = SH.h / 2 + 4;
  const Hwf = Math.max((y1 - y0) * 1.1, Math.max(SH.w * 1.1, SH.w * 1.08) * He / W), Hw = Hwf / z * H / He;
  const cx = 0, cy = (y0 + y1) / 2 + (top + He / 2 - H / 2) * Hw / H, D = Hw / (2 * TF);
  const eye = [cx, cy - D * Math.sin(TILT), D * Math.cos(TILT)];
  const vp = M4.mul(M4.perspective(FOV, W / H, D * 0.25, D * 3), M4.lookAt(eye, [cx, cy, 0], [0, 1, 0]));
  const project = (x, y, z = 0) => {
    const w = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
    return [((vp[0] * x + vp[4] * y + vp[8] * z + vp[12]) / w * 0.5 + 0.5) * W, (0.5 - (vp[1] * x + vp[5] * y + vp[9] * z + vp[13]) / w * 0.5) * H];
  };
  return { cx, cy, D, Hw, eye, vp, project, top, ins };
}

// l'écart entre le bas de la feuille et le haut de la légende (la réserve du bas commence là) : le même pour tous les
// objets — rend le décalage (px) à donner à la légende d'un objet dont le bas est à yb (unités)
export function captionShift(W, H, yb) {
  const v = stageView(W, H);
  return v.project(0, yb)[1] - v.project(0, -SH.h / 2)[1];
}
