// Caméra unique : perspective, taille, flou, mouvement, parallaxe dérivent tous de ce modèle.
// Monde : X à droite, Y vers le bas, z = profondeur devant la caméra.
// Écran : x = cx + f·(X − Cx)/z ; y = cy + f·(Y − Cy)/z.

export const FOV = 48 * Math.PI / 180;   // champ vertical
export const VP = [0.5, 0.45];          // point de fuite (fraction d'écran)
export const ZF = 10;                    // plan de netteté, fixe (prototype, sans respiration)
// flou : σ_px = K·f·|1/z − 1/ZF| — exactement la courbe du prototype (σ_em = 0,2·(1 − z/ZF) en deçà,
// 0,03·(z/ZF − 1) au-delà) écrite en continu : K = 0,2·S et 0,03·S (S = 0,356)
export const KB = 0.0712;                // en deçà de ZF (proches : flou fort, fantomatique)
export const KB_FAR = 0.0107;            // au-delà de ZF (lointains)
export const KAPPA = 0.8;                // rotation du mot ψ = κ·atan(|X|/z)
export const PSI_MAX = 0.8;

export function viewOf(w, h) {
  return { w, h, f: (h / 2) / Math.tan(FOV / 2), cx: VP[0] * w, cy: VP[1] * h };
}

export const sigmaPx = (f, z) => (z < ZF ? KB : KB_FAR) * f * Math.abs(1 / z - 1 / ZF);

// rotation signée : l'extrémité extérieure du mot est la plus proche
export function psiOf(Xr, z) {
  const p = Math.min(PSI_MAX, KAPPA * Math.atan(Math.abs(Xr) / z));
  return Xr < 0 ? -p : p;
}
