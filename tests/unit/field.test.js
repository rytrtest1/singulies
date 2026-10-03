import { describe, it, expect } from 'vitest';
import { createField, STRIDE, wordCount, Z_BIRTH, Z_END } from '../../src/field/field.js';
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
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
// tolérance : la boîte précédente peut être à quelques px du seuil de sortie
const offByStep = (b, W, H) => b[2] < 0 || b[0] > W || b[3] < 0 || b[1] > H;
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
  it('nombre de mots : 78 à 1672, portrait = champ 2,2× plus large que l’écran (70)', () => {
    expect(wordCount(1672)).toBe(78);
    expect(wordCount(390)).toBe(40);
    expect(mk().words.length).toBe(78);
    expect(mk(390, 844).words.length).toBe(70);
  });

  it('z dans [Z_END[0], Z_BIRTH[1]] à t0 et après 30 min', () => {
    const f = mk();
    const chk = () => { for (const w of f.words) { expect(w.z).toBeGreaterThanOrEqual(Z_END[0] - 1e-9); expect(w.z).toBeLessThanOrEqual(Z_BIRTH[1] + 1e-9); } };
    chk(); f.advance(1800); chk();
  });

  it('renaissances : au fond, alpha < 0.05 ; jamais de disparition de mot visible', () => {
    const f = mk();
    const { w: W, h: H } = f.view;
    const out = (b) => b[2] < -24 || b[0] > W + 24 || b[3] < -24 || b[1] > H + 24;
    const prev = new Map(f.words.map((w) => [w, { age: w.age, name: w.name, alpha: w.alpha, box: w.box.slice() }]));
    let births = 0;
    for (let i = 0; i < 600; i++) {
      f.step(0.1);
      for (const w of f.words) {
        const p = prev.get(w);
        if (w.age < p.age) {
          births++;
          expect(w.z).toBeGreaterThanOrEqual(Z_BIRTH[0] - 1e-9);
          expect(w.z).toBeLessThanOrEqual(Z_BIRTH[1] + 1e-9);
          expect(w.alpha).toBeLessThan(0.05);
          // pas de disparition visible : hors écran (marge 24 px + déplacement d'un pas) ou invisible
          expect(out(p.box) || offByStep(p.box, W, H) || p.alpha < 0.05).toBe(true);
        }
        prev.set(w, { age: w.age, name: w.name, alpha: w.alpha, box: w.box.slice() });
      }
    }
    console.log('naissances observées :', births);
  });

  it('stationnarité à 30 min (visible moyen, fenêtres de 5 min)', () => {
    const f = mk();
    const a = sample(f, 300);
    f.advance(1800);
    const b = sample(f, 300);
    const ma = mean(a.map((s) => s.visible)), mb = mean(b.map((s) => s.visible));
    expect(Math.abs(ma - mb) / ma).toBeLessThan(0.12);
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
