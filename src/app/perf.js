// Essais de fluidité (08/10, iPhone X : les scènes 3D un peu lentes, le champ de prénoms fluide).
//   ?fps=1      un petit compteur en haut à droite : images par seconde, pire image des 3 dernières secondes, résolution
//   ?dpr=1.5    plafonne la résolution des scènes 3D (portail, cartes, feuille, enveloppe, jeu) ; défaut 2
//   ?relief=0   coupe l'ombre que le gaufrage projette sur lui-même (10 lectures par pixel, sur toute la carte)
//   ?maille=0.5 pas du maillage sculpté autour du logo (mm ; défaut 0,2 ≈ 100 000 points par carte) ; 2 = plus de relief sculpté
const P = (() => { try { return new URLSearchParams(location.search); } catch { return new URLSearchParams(); } })();
const D = parseFloat(P.get('dpr'));
export const DPR3D = D > 0 ? Math.min(3, D) : 2;
export const RELIEF = P.get('relief') !== '0';
const M = parseFloat(P.get('maille'));
export const MAILLE = M > 0 ? Math.min(2, M) : 0;
export const dpr3d = () => Math.min(DPR3D, devicePixelRatio || 1);

export function fpsMeter() {
  if (P.get('fps') !== '1') return;
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;right:max(8px,env(safe-area-inset-right));top:max(8px,env(safe-area-inset-top));z-index:99;' +
    'font:11px/1.4 ui-monospace,Menlo,monospace;color:rgba(255,255,255,.7);background:rgba(0,0,0,.55);padding:3px 6px;' +
    'pointer-events:none;white-space:pre;text-align:right';
  document.body.appendChild(el);
  const dts = [];                        // [instant, durée] des images des 3 dernières secondes
  let last = 0, shown = 0;
  const tick = now => {
    if (last) dts.push([now, now - last]);
    last = now;
    while (dts.length && now - dts[0][0] > 3000) dts.shift();
    if (now - shown > 500 && dts.length > 1) {
      shown = now;
      const recent = dts.filter(d => now - d[0] < 1000);
      const fps = recent.length / (recent.reduce((s, d) => s + d[1], 0) / 1000 || 1);
      const worst = Math.max(...dts.map(d => d[1]));
      el.textContent = Math.round(fps) + ' i/s\npire ' + Math.round(worst) + ' ms\n×' + dpr3d().toFixed(2).replace(/\.?0+$/, '') +
        (RELIEF ? '' : ' · sans relief') + (MAILLE ? '\nmaille ' + MAILLE : '');
    }
    requestAnimationFrame(tick);
  };
  // onglet caché : on repart de zéro au retour (sinon une « pire image » de plusieurs secondes)
  document.addEventListener('visibilitychange', () => { last = 0; dts.length = 0; });
  requestAnimationFrame(tick);
}
