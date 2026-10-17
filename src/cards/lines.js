// Les lignes d'une réponse écrite sur une carte : coupées aux mots, un mot trop long coupé ; un retour à la ligne tapé
// (maj + Entrée, V3) commence la ligne suivante. Pur : aucun dessin, testable seul.
const MAX_CHARS = 24;   // = CTYPE.maxChars (ink.js) : jamais plus de 24 caractères par ligne sur une carte

export function answerLines(text, max = MAX_CHARS) {
  const lines = [''];
  for (const word of text.split(/(\s+)/)) {
    if (!word) continue;
    // (18/10, V3) un retour à la ligne tapé (maj + Entrée) : la ligne suivante, une ligne vide par retour de plus
    if (/^\s+$/.test(word)) { const nl = (word.match(/\n/g) || []).length; if (nl) { for (let i = 0; i < nl; i++) lines.push(''); } else lines[lines.length - 1] += ' '; continue; }
    let w = word;
    while (w.length) {
      const cur = lines[lines.length - 1];
      if (cur.length + w.length <= max) { lines[lines.length - 1] = cur + w; w = ''; }
      else if (cur.trim().length === 0 && w.length > max) { lines[lines.length - 1] = cur + w.slice(0, max - cur.length); w = w.slice(max - cur.length); lines.push(''); }
      else lines.push('');
    }
    if (lines[lines.length - 1].length > max) lines.push('');
  }
  return lines.map(l => l.replace(/^ +/, ''));
}
