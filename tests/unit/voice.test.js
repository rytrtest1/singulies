import { describe, it, expect } from 'vitest';
import { cleanSpoken } from '../../src/input/voice.js';
import { normalizeName } from '../../src/text/normalize.js';

const said = (t) => normalizeName(cleanSpoken(t));
describe('voix : prénom dit', () => {
  it('prénom seul', () => expect(said('Léa')).toBe('LEA'));
  it('je m’appelle …', () => expect(said("je m'appelle Clémence-Rose")).toBe('CLEMENCE ROSE'));
  it('moi c’est …', () => expect(said("moi c'est Noé")).toBe('NOE'));
  it('mon prénom est …', () => expect(said('mon prénom est Inès')).toBe('INES'));
  it('3 mots au plus', () => expect(said('Marie Charlotte Éloïse Anne')).toBe('CHARLOTTE ELOISE ANNE'));
});
