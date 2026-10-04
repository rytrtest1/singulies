import { describe, it, expect } from 'vitest';
import { createLight } from '../../src/field/light.js';

const lp = { d: 0.05, att: 0.2, dec: 1.5, inten: 0.8, f1: 0.5, p1: 0, f2: 1.2, p2: 0, off: 0.4, seed: 1 };
const lvl = (L, t, z = 30) => L.level('A', lp, 0.5, z, t, 0, 0);

describe('lumière : effacement pendant l\'allumage', () => {
  it('rembobine depuis le niveau atteint, sans jamais le dépasser', () => {
    const L = createLight();
    L.update('A', 0);
    let tr = 0.1; while (lvl(L, tr) <= 0.01) tr += 0.01;          // l'allumage vient de commencer au fond
    const tRem = tr + 0.15, before = lvl(L, tRem - 1e-3);
    L.update('', tRem);
    let max = 0;
    for (let t = tRem; t < tRem + 3; t += 0.01) max = Math.max(max, lvl(L, t));
    expect(before).toBeGreaterThan(0);
    expect(max).toBeLessThanOrEqual(before * 1.02 + 1e-6);
    expect(lvl(L, tRem + 3)).toBe(0);
  });
  it('une lettre pas encore atteinte reste éteinte', () => {
    const L = createLight();
    L.update('A', 0); L.update('', 0.05);
    for (let t = 0.05; t < 4; t += 0.05) expect(lvl(L, t, 3)).toBe(0);   // premier plan : pas encore atteint
  });
});
