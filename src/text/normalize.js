// Normalisation des prénoms : uniquement A–Z et des espaces simples.
// Forme canonique = MAJUSCULES ; la casse d'affichage est appliquée à part (displayCase).

export const MAX_LEN = 22;

// lettres que NFD ne décompose pas
const SPECIAL = {
  'Æ': 'AE', 'æ': 'AE', 'Œ': 'OE', 'œ': 'OE', 'ß': 'SS', 'ẞ': 'SS',
  'Ø': 'O', 'ø': 'O', 'Ł': 'L', 'ł': 'L', 'Đ': 'D', 'đ': 'D', 'Ð': 'D', 'ð': 'D',
  'Þ': 'TH', 'þ': 'TH', 'ı': 'I', 'ĸ': 'K',
};
// tirets → espace (trait d'union, tirets typographiques, moins, tiret insécable…)
const DASHES = /[-‐‑‒–—―−﹘﹣－]/g;
const SPACES = /[\s  -​  　]/g;

// Translittère librement un fragment (sans gérer les espaces de bord).
export function cleanFragment(s) {
  if (!s) return '';
  let out = '';
  const t = s.replace(DASHES, ' ').replace(SPACES, ' ');
  for (const ch of t) {
    if (ch === ' ') { out += ' '; continue; }
    if (SPECIAL[ch]) { out += SPECIAL[ch]; continue; }
    const base = ch.normalize('NFD').replace(/[̀-ͯ᪰-᫿᷀-᷿⃐-⃿︠-︯]/g, '').toUpperCase();
    for (const b of base) if (b >= 'A' && b <= 'Z') out += b;
  }
  return out;
}

// Forme canonique complète : pas d'espace en tête, espaces fusionnés, ≤ MAX_LEN.
// Un espace final est conservé (on est peut-être en train de taper le second mot).
export function normalizeName(s) {
  return cleanFragment(s).replace(/ {2,}/g, ' ').replace(/^ /, '').slice(0, MAX_LEN);
}

// Forme finale à la validation.
export function finalName(s) {
  return normalizeName(s).trim();
}

// Casse d'affichage : 'upper' (défaut) ou 'lower' (capitale initiale de chaque mot).
export function displayCase(canon, mode) {
  if (mode !== 'lower') return canon;
  return canon.toLowerCase().replace(/(^|[ ])([a-z])/g, (m, a, b) => a + b.toUpperCase());
}
