import { describe, it, expect } from 'vitest';
import { layoutName } from '../../src/name/layout.js';

const M = { adv: () => 0.7, capHeight: 0.65 };
const vp = (w, h) => ({ w, h, cx: w / 2, cy: h * 0.45 });

describe('layoutName', () => {
  it('vide : curseur centré', () => {
    const L = layoutName('', M, vp(1672, 941));
    expect(L.glyphs.length).toBe(0);
    expect(L.cursor.x).toBeCloseTo(836, 3);
  });
  it('LEA 1672x941 : 1 ligne, fs >= 28', () => {
    const L = layoutName('LEA', M, vp(1672, 941));
    expect(L.lines.length).toBe(1); expect(L.fs).toBeGreaterThanOrEqual(28);
  });
  it('CLEMENCE ROSE 390x844 : 2 lignes, coupure à l\'espace, dans l\'écran', () => {
    const L = layoutName('CLEMENCE ROSE', M, vp(390, 844));
    expect(L.lines.map((l) => l.text)).toEqual(['CLEMENCE', 'ROSE']);
    for (const g of L.glyphs) { expect(g.x).toBeGreaterThanOrEqual(0); expect(g.x + 0.7 * g.fs).toBeLessThanOrEqual(390); }
  });
  it('22 lettres sans espace 390x844 : rien hors écran', () => {
    const L = layoutName('MARIECHARLOTTEELOISEAB', M, vp(390, 844));
    console.log('fs 22 lettres 390x844 =', L.fs.toFixed(2), 'lignes', L.lines.length);
    expect(L.glyphs.length).toBe(22);
    for (const g of L.glyphs) { expect(g.x).toBeGreaterThanOrEqual(0); expect(g.x + 0.7 * g.fs).toBeLessThanOrEqual(390); }
  });
});
