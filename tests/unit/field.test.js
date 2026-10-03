import { describe, it, expect } from 'vitest';
import { createField, TIERS, STRIDE, wordCount } from '../../src/field/field.js';
import { NAMES } from '../../src/field/names.js';
import { createRng } from '../../src/field/rng.js';

const glyphs = {};
for (const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz') {
  glyphs[c] = { adv: 0.6, u0: 0, v0: 0, u1: 1, v1: 1, x0: -0.4, y0: -1, x1: 1, y1: 0.4 };
}
const mk = (w = 1672, h = 941, caseMode = 'upper') => {
  const f = createField({ rng: createRng(42), caseMode, glyphs, capHeight: 0.65 });
  f.resize(w, h);
  return f;
};
const perTier = (f) => TIERS.map((_, t) => f.words.filter((w) => w.tier === t).length);
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
function sample(f, n = 60) {
  const out = [];
  for (let i = 0; i < n; i++) { f.step(1); out.push(f.stats()); }
  return out;
}

describe('NAMES', () => {
  it('A-Z, >= 190, sans doublons', () => {
    expect(NAMES.length).toBeGreaterThanOrEqual(190);
    for (const n of NAMES) expect(n).toMatch(/^[A-Z]+$/);
    expect(new Set(NAMES).size).toBe(NAMES.length);
  });
});

describe('field', () => {
  it('nombre de mots et répartition', () => {
    expect(wordCount(1672)).toBe(78);
    const f = mk();
    expect(f.words.length).toBe(78);
    expect(perTier(f)).toEqual([6, 33, 39]);
    const g = mk(390, 844);
    expect(g.words.length).toBe(34);
  });

  it('z dans la tranche à t0 et après 30 min', () => {
    const f = mk();
    const chk = () => { for (const w of f.words) { const T = TIERS[w.tier]; expect(w.z).toBeGreaterThanOrEqual(T.z0 - 1e-9); expect(w.z).toBeLessThanOrEqual(T.z1 + 1e-9); } };
    chk(); f.advance(1800); chk();
  });

  it('stationnarité à 30 min', () => {
    const f = mk();
    const a = sample(f);
    f.advance(1800);
    const b = sample(f);
    const ma = mean(a.map((s) => s.visible)), mb = mean(b.map((s) => s.visible));
    expect(Math.abs(ma - mb) / ma).toBeLessThan(0.1);
    for (const k of ['proche', 'moyen', 'lointain']) {
      const x = mean(a.map((s) => s[k])), y = mean(b.map((s) => s[k]));
      if (k === 'proche') expect(Math.abs(x - y)).toBeLessThanOrEqual(2);
      else expect(Math.abs(x - y) / x).toBeLessThan(0.1);
    }
  });

  it('aucune apparition brusque', () => {
    const f = mk();
    const lim = (1 / 60) / 4 * 1.6 + 0.02;
    const prev = new Map(f.words.map((w) => [w, [w.name, w.alpha]]));
    let worst = 0;
    for (let i = 0; i < 300; i++) {
      f.step(1 / 60);
      for (const w of f.words) {
        const p = prev.get(w);
        if (p && p[0] === w.name) worst = Math.max(worst, Math.abs(w.alpha - p[1]));
        prev.set(w, [w.name, w.alpha]);
      }
    }
    expect(worst).toBeLessThanOrEqual(lim);
  });

  it('emit : count et tri z décroissant', () => {
    const f = mk();
    f.step(1 / 60);
    const { data, count } = f.emit();
    const view = f.view;
    const off = (b) => b[2] < 0 || b[0] > view.w || b[3] < 0 || b[1] > view.h;
    const exp = f.words.filter((w) => w.alpha >= 0.004 && !off(w.box)).reduce((s, w) => s + w.chars.length, 0);
    expect(count).toBe(exp);
    expect(count).toBeGreaterThan(0);
    for (let i = 1; i < count; i++) expect(data[i * STRIDE + 2]).toBeLessThanOrEqual(data[(i - 1) * STRIDE + 2] + 1e-6);
  });

  it('caseMode lower', () => {
    const f = mk(1672, 941, 'lower');
    for (const w of f.words) expect(w.text).toBe(w.name[0] + w.name.slice(1).toLowerCase());
  });

  it('mouvement réduit : z, X, Y inchangés', () => {
    const f = mk();
    const s = f.words.map((w) => [w, w.z, w.X, w.Y]);
    for (let i = 0; i < 120; i++) f.step(1 / 60, false);
    for (const [w, z, X, Y] of s) { expect(w.z).toBe(z); expect(w.X).toBe(X); expect(w.Y).toBe(Y); }
  });
});
