import { describe, it, expect } from 'vitest';
import { normalizeName, finalName, displayCase } from '../../src/text/normalize.js';

describe('normalize', () => {
  it.each([
    ['Léa', 'LEA'],
    ['Clémence-Rose123!', 'CLEMENCE ROSE'],
    ['jean--pierre', 'JEAN PIERRE'],
    ["d'Artagnan", 'DARTAGNAN'],
    ['Æsa', 'AESA'],
    ['Chloë', 'CHLOE'],
    ['  Léa', 'LEA'],
    ['jean   pierre', 'JEAN PIERRE'],
    ['a–b', 'A B'], ['a—b', 'A B'], ['a‑b', 'A B'],
  ])('%s -> %s', (i, o) => expect(normalizeName(i)).toBe(o));
  it('espace final conservé / supprimé', () => {
    expect(normalizeName('Jean ')).toBe('JEAN ');
    expect(finalName('Jean ')).toBe('JEAN');
  });
  it('26 lettres -> 22', () => {
    expect(normalizeName('ABCDEFGHIJKLMNOPQRSTUVWXYZ')).toBe('ABCDEFGHIJKLMNOPQRSTUV');
  });
  it('displayCase', () => {
    expect(displayCase('CLEMENCE ROSE', 'lower')).toBe('Clemence Rose');
    expect(displayCase('LEA', 'lower')).toBe('Lea');
    expect(displayCase('LEA', 'upper')).toBe('LEA');
  });
});
