import { describe, it, expect } from 'vitest';
import { analysePrenom } from '../../src/core/prenom.js';

const codes = r => r.messages.map(m => m.code);

describe('analysePrenom', () => {
  it('un prénom simple : rien à dire', () => {
    const r = analysePrenom('Lea');
    expect(r.nom).toBe('LEA');
    expect(r.messages).toEqual([]);
    expect(r.tronque).toBe(false);
  });
  it('les accents sont dits', () => {
    const r = analysePrenom('Léa');
    expect(r.nom).toBe('LEA');
    expect(codes(r)).toEqual(['accents']);
    expect(r.accents).toBe(true);
  });
  it('ß et œ sont transcrits, et dits', () => {
    expect(codes(analysePrenom('Weiß'))).toEqual(['accents']);
    expect(analysePrenom('Chloë').nom).toBe('CHLOE');
  });
  it('le tiret devient une espace, sans message', () => {
    const r = analysePrenom('Jean-Pierre');
    expect(r.nom).toBe('JEAN PIERRE');
    expect(r.messages).toEqual([]);
  });
  it('apostrophe, chiffres, ponctuation : retirés ET dits', () => {
    const r = analysePrenom('Clémence-Rose123!');
    expect(r.nom).toBe('CLEMENCE ROSE');
    expect(r.retires).toEqual(['1', '2', '3', '!']);
    expect(codes(r)).toContain('retires');
    expect(codes(r)).toContain('accents');
    expect(analysePrenom("d'Artagnan").retires).toEqual(["'"]);
  });
  it('un autre alphabet est refusé AVEC un message', () => {
    const r = analysePrenom('Анна');
    expect(r.nom).toBe('');
    expect(r.vide).toBe(true);
    expect(r.nonLatin.length).toBeGreaterThan(0);
    expect(codes(r)).toEqual(['non-latin']);
    expect(codes(analysePrenom('Léa 李'))).toEqual(['non-latin', 'accents']);
  });
  it('22 caractères : au-delà, coupé ET dit', () => {
    const r = analysePrenom('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    expect(r.nom).toBe('ABCDEFGHIJKLMNOPQRSTUV');
    expect(r.tronque).toBe(true);
    expect(codes(r)).toEqual(['tronque']);
    expect(analysePrenom('ABCDEFGHIJKLMNOPQRSTUV').tronque).toBe(false);
  });
  it('vide, null, espaces', () => {
    for (const v of ['', null, undefined, '   ']) {
      const r = analysePrenom(v);
      expect(r.vide).toBe(true);
      expect(r.messages).toEqual([]);
    }
  });
});
