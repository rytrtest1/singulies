// Versions de luminosité à comparer (09/10, après le test à 5 : « pas assez lumineux ») — ?lum=…
//   base    : le site tel quel (par défaut)
//   boost   : tout plus lumineux d'un bloc (filtre sur la page entière, fond compris)
//   lisible : réglé pour lire — encre des cartes et de l'enveloppe, mots du champ, prénom, ETERNEL, signes ;
//             le fond reste noir (le contraste vient du texte, pas d'un voile gris)
// L'adresse garde ses paramètres d'une page à l'autre (showPath) : le choix tient tout le parcours.
const Q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
export const LUM_MODE = ['boost', 'lisible'].includes(Q.get('lum')) ? Q.get('lum') : 'base';
const L = LUM_MODE === 'lisible';
export const LUM = {
  name: L ? 0.8 : 0.68,          // prénom (NAME_REST) : 174 → ≈ 205
  gray: L ? 1.4 : 1,             // mots éteints du champ de prénoms (×)
  ink: L ? 1.15 : 0.85,          // encre des cartes (inkAlb)
  envInk: L ? 1.05 : 0.75,       // encre de l'enveloppe
};
if (LUM_MODE !== 'base' && typeof document !== 'undefined') {
  const css = LUM_MODE === 'boost'
    ? 'html { filter: brightness(1.45); }'
    : `#portal .pt-sig { color: rgb(205,205,205) !important; }
.sc-sign.on, .sc-pass.on, .jeu-sign.on, .jeu-back.on, .sp-sign.on, .sp-back.on, #back.on, #next.on { opacity: .8 !important; }
.sp-name { color: rgb(205,205,205) !important; } .sp-title { color: rgb(190,190,190) !important; }
.sp-type { color: rgba(255,255,255,.82) !important; } .sp-write, .sp-field, .sp-mail input { color: rgb(240,240,240) !important; }`;
  const add = () => { const s = document.createElement('style'); s.id = 'lum-style'; s.textContent = css; document.head.appendChild(s); };
  if (document.head) add(); else addEventListener('DOMContentLoaded', add);
}
