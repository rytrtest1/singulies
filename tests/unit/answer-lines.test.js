import { describe, it, expect } from 'vitest';
import { answerLines } from '../../src/cards/lines.js';


// (18/10, V3) la réponse peut tenir sur plusieurs lignes : un retour à la ligne tapé (maj + Entrée) commence la ligne suivante
describe('answerLines', () => {
  it('sans retour à la ligne : le texte est coupé aux mots, comme avant', () => {
    expect(answerLines('la mer en hiver', 24)).toEqual(['la mer en hiver']);
    expect(answerLines('un deux trois quatre', 10).map(l => l.trimEnd())).toEqual(['un deux', 'trois', 'quatre']);   // (l'espace de fin de ligne reste : les mots ne bougent jamais une fois tapés)
  });
  it('un retour à la ligne commence la ligne suivante', () => {
    expect(answerLines('la mer\nen hiver', 24)).toEqual(['la mer', 'en hiver']);
  });
  it('deux retours : une ligne vide entre les deux', () => {
    expect(answerLines('la mer\n\nen hiver', 24)).toEqual(['la mer', '', 'en hiver']);
  });
  it('un retour en fin de texte : le curseur est déjà sur la ligne suivante', () => {
    expect(answerLines('la mer\n', 24)).toEqual(['la mer', '']);
  });
  it('un long mot est coupé, un retour reste respecté', () => {
    const l = answerLines('abcdefghijkl\nxy', 5);
    expect(l[l.length - 1]).toBe('xy');
    expect(l.slice(0, -1).every(x => x.length <= 5)).toBe(true);
  });
});
