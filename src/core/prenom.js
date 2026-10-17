// Le prénom, et ce qu'on en dit à la personne (décision 0, C5 : ne rien perdre en silence).
// La machine ne tape ni accent, ni ponctuation, ni autre alphabet que le latin ; le prénom tient en 22 caractères.
// `analysePrenom` rend le prénom canonique (comme `normalizeName`) ET la liste de ce qui a été changé, retiré ou coupé,
// pour que chaque version le dise à sa manière (V1 une phrase, V2 une ligne tapée, V3 une mention discrète).
import { cleanFragment, normalizeName, MAX_LEN } from '../text/normalize.js';

const ESPACES_TIRETS = /[\s  -​  　\-‐‑‒–—―−﹘﹣－]/;
const ACCENTS = /[̀-ͯ]/;
const LIGATURES = /[ÆæŒœßẞØøŁłĐđÐðÞþıĸ]/;
const ECRITURE = (c) => /\p{L}/u.test(c) && !/\p{Script=Latin}/u.test(c);   // lettre d'un autre alphabet (arabe, cyrillique, hanzi…)

export const PHRASES = {
  accents: 'la machine ne tape pas les accents : tu verras ton prénom en majuscules, sans accents.',
  tronque: n => 'la machine tape 22 caractères au plus : la fin de ton prénom est coupée.',
  retires: c => 'la machine ne tape pas ' + c + ' : ' + (c.includes(' ') ? 'ces signes sont' : 'ce signe est') + ' retiré' + (c.includes(' ') ? 's' : '') + '.',
  nonLatin: 'la machine ne tape que l’alphabet latin : écris ton prénom avec nos lettres (A à Z).',
};

// → { nom, vide, tronque, accents, retires: [signes], nonLatin: [lettres], messages: [{ code, texte }] }
export function analysePrenom(brut) {
  const texte = String(brut ?? '');
  const nom = normalizeName(texte);
  const complet = cleanFragment(texte).replace(/ {2,}/g, ' ').replace(/^ /, '');
  const tronque = complet.trimEnd().length > MAX_LEN;
  let accents = false;
  const retires = [], nonLatin = [];
  for (const c of Array.from(texte)) {
    if (ESPACES_TIRETS.test(c)) continue;
    if (cleanFragment(c) === '') {
      const liste = ECRITURE(c) ? nonLatin : retires;
      if (!liste.includes(c)) liste.push(c);
    } else if (ACCENTS.test(c.normalize('NFD')) || LIGATURES.test(c)) accents = true;
  }
  const messages = [];
  if (nonLatin.length) messages.push({ code: 'non-latin', texte: PHRASES.nonLatin });
  if (retires.length) messages.push({ code: 'retires', texte: PHRASES.retires(retires.join(' ')) });
  if (tronque) messages.push({ code: 'tronque', texte: PHRASES.tronque(MAX_LEN) });
  if (accents) messages.push({ code: 'accents', texte: PHRASES.accents });
  return { nom, vide: nom.trim() === '', tronque, accents, retires, nonLatin, messages };
}
