// Caméra unique : perspective, taille, flou, mouvement, parallaxe dérivent tous de ce modèle.
// Monde : X à droite, Y vers le bas, z = profondeur devant la caméra.
// Écran : x = cx + f·(X − Cx)/z ; y = cy + f·(Y − Cy)/z.

export const FOV = 48 * Math.PI / 180;   // champ vertical
export const VP = [0.5, 0.5];           // point de fuite au centre de l'écran (le prénom aussi)
// flou : une seule règle, la caméra fait la mise au point au fond du champ (ZF = 34) :
// plus un mot est proche, plus il est flou, progressivement. σ_px = KB·f·|1/z − 1/ZF|
export const ZF = 34;
export const KB = 0.055;
export const KB_FAR = 0.055;             // (au-delà du plan net : naissance uniquement)
export const KAPPA = 0.8;                // rotation du mot ψ = κ·atan(|X|/z)
export const PSI_MAX = 0.8;

export function viewOf(w, h, fov = FOV, vpy = VP[1]) {
  return { w, h, f: (h / 2) / Math.tan(fov / 2), cx: VP[0] * w, cy: vpy * h };
}

export const sigmaPx = (f, z) => (z < ZF ? KB : KB_FAR) * f * Math.abs(1 / z - 1 / ZF);

// rotation signée : l'extrémité extérieure du mot est la plus proche
export function psiOf(Xr, z) {
  const p = Math.min(PSI_MAX, KAPPA * Math.atan(Math.abs(Xr) / z));
  return Xr < 0 ? -p : p;
}
