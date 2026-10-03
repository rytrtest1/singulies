// Caméra unique : perspective, taille, flou, mouvement, parallaxe dérivent tous de ce modèle.
// Monde : X à droite, Y vers le bas, z = profondeur devant la caméra.
// Écran : x = cx + f·(X − Cx)/z ; y = cy + f·(Y − Cy)/z.

export const FOV = 48 * Math.PI / 180;   // champ vertical
export const VP = [0.5, 0.45];          // point de fuite (fraction d'écran)
export const ZF = 14;                    // plan de netteté, fixe
export const KB = 0.034;                 // flou : σ_px = KB·f·|1/z − 1/ZF|
export const KAPPA = 0.8;                // rotation du mot ψ = κ·atan(|X|/z)
export const PSI_MAX = 0.8;

export function viewOf(w, h) {
  return { w, h, f: (h / 2) / Math.tan(FOV / 2), cx: VP[0] * w, cy: VP[1] * h };
}

export const sigmaPx = (f, z) => KB * f * Math.abs(1 / z - 1 / ZF);

// rotation signée : l'extrémité extérieure du mot est la plus proche
export function psiOf(Xr, z) {
  const p = Math.min(PSI_MAX, KAPPA * Math.atan(Math.abs(Xr) / z));
  return Xr < 0 ? -p : p;
}
