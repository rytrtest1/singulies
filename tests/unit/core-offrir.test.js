// « Pour offrir » (V2, décision 4) : la date, la signature, le mot ; rien de tout cela ne fait partie de l'adresse.
import { describe, it, expect } from 'vitest';
import { analyserDate, nettoyer, MOT_MAX, DELA_MAX } from '../../src/core/offrir.js';

const AUJ = new Date(2026, 9, 18);   // 18/10/2026

describe('analyserDate', () => {
  it('vide : facultatif', () => { expect(analyserDate('', AUJ)).toMatchObject({ ok: true, vide: true, urgent: false }); });
  it('une date ISO lointaine est acceptée', () => {
    const r = analyserDate('2026-12-24', AUJ);
    expect(r).toMatchObject({ ok: true, iso: '2026-12-24', jours: 67, urgent: false });
  });
  it('jj/mm/aaaa est lu', () => { expect(analyserDate('24/12/2026', AUJ).iso).toBe('2026-12-24'); });
  it('moins de 10 jours : urgent (l’auteur doit être prévenu)', () => {
    expect(analyserDate('2026-10-25', AUJ)).toMatchObject({ ok: true, urgent: true, jours: 7 });
    expect(analyserDate('2026-10-28', AUJ).urgent).toBe(false);   // 10 jours pile
  });
  it('une date passée ou inexistante est refusée, avec une phrase', () => {
    expect(analyserDate('2026-10-10', AUJ)).toMatchObject({ ok: false });
    expect(analyserDate('2026-02-30', AUJ)).toMatchObject({ ok: false });
    expect(analyserDate('bientôt', AUJ).message).toMatch(/jour/);
  });
});

describe('nettoyer', () => {
  it('coupe le mot à 300 caractères et la signature à 80', () => {
    const n = nettoyer({ offrir: true, mot: 'a'.repeat(500), dela: 'b'.repeat(200) });
    expect(n.mot.length).toBe(MOT_MAX); expect(n.dela.length).toBe(DELA_MAX);
  });
  it('ignore une date mal formée et les espaces en trop', () => {
    expect(nettoyer({ quand: '24/12' }).quand).toBe('');
    expect(nettoyer({ dela: '  Sami   Ben  ' }).dela).toBe('Sami Ben');
  });
  it('par défaut : pas offert', () => { expect(nettoyer({})).toEqual({ offrir: false, quand: '', dela: '', mot: '' }); });
});
