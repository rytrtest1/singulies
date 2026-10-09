// Luminosité (09/10, après le test à 5 : « pas assez lumineux ») — ?lum=…
//   boost   : par défaut (choix de Maxence) — tout ce qui est éclairé +45 % (champ, prénom, cartes, papier, encre,
//             ETERNEL, signes), le fond reste noir (6). Fait dans le rendu lui-même (gain du champ, exposition des
//             cartes), pas par un filtre CSS sur la page : un filtre oblige le navigateur à recopier tout l'écran à
//             chaque image (coût sur les anciens téléphones) et éclaircissait aussi le fond.
//   base    : l'ancien réglage
//   lisible : seulement le texte plus clair (prénom, mots du champ, encre), le papier inchangé
// L'adresse garde ses paramètres d'une page à l'autre (showPath) : le choix tient tout le parcours.
const Q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
export const LUM_MODE = ['base', 'lisible'].includes(Q.get('lum')) ? Q.get('lum') : 'boost';
const B = LUM_MODE === 'boost', L = LUM_MODE === 'lisible';
const GAIN = B ? 1.45 : 1;
export const LUM = {
  gain: GAIN,                                  // champ (mots éteints et allumés) et exposition des cartes
  name: B ? 0.68 * GAIN : L ? 0.8 : 0.68,      // prénom (NAME_REST) : 174 → 252 (boost) / 204 (lisible)
  gray: L ? 1.4 : 1,                           // mots éteints du champ (en plus du gain)
  ink: L ? 1.15 : 0.85,                        // encre des cartes (inkAlb)
  envInk: L ? 1.05 : 0.75,                     // encre de l'enveloppe
};
const css = {
  boost: `#portal .pt-sig { color: rgb(252,252,252) !important; }
.sc-sign.on, .sc-pass.on, .jeu-sign.on, .jeu-back.on, .sp-sign.on, .sp-back.on, #back.on, #next.on { opacity: .9 !important; }
.sp-name { color: rgb(252,252,252) !important; } .sp-title { color: rgb(229,229,229) !important; }
.sp-type { color: rgba(255,255,255,.9) !important; } .sp-write, .sp-field, .sp-mail input { color: rgb(250,250,250) !important; }`,
  lisible: `#portal .pt-sig { color: rgb(205,205,205) !important; }
.sc-sign.on, .sc-pass.on, .jeu-sign.on, .jeu-back.on, .sp-sign.on, .sp-back.on, #back.on, #next.on { opacity: .8 !important; }
.sp-name { color: rgb(205,205,205) !important; } .sp-title { color: rgb(190,190,190) !important; }
.sp-type { color: rgba(255,255,255,.82) !important; } .sp-write, .sp-field, .sp-mail input { color: rgb(240,240,240) !important; }`,
}[LUM_MODE];
if (css && typeof document !== 'undefined') {
  const add = () => { const s = document.createElement('style'); s.id = 'lum-style'; s.textContent = css; document.head.appendChild(s); };
  if (document.head) add(); else addEventListener('DOMContentLoaded', add);
}
