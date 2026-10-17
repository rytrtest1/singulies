import { describe, it, expect, vi, afterEach } from 'vitest';
import { prefixe, vk, cheminStats, mentionVersion, choix } from '../../src/core/version.js';

describe('version : préfixes et chemins', () => {
  it('site principal : rien ne change', () => {
    expect(prefixe('')).toBe('');
    expect(vk('singulies.name', '')).toBe('singulies.name');
    expect(cheminStats('etape/prenom', '')).toBe('etape/prenom');
    expect(mentionVersion('')).toBe('');
  });
  it('une version préfixe les clés et les chemins', () => {
    expect(vk('singulies.name', '2')).toBe('v2.singulies.name');
    expect(cheminStats('etape/prenom', '3')).toBe('v3/etape/prenom');
    expect(cheminStats('/etape/prenom', '1')).toBe('v1/etape/prenom');
    expect(mentionVersion('2')).toBe('version 2');
  });
  it('trois versions et le site principal : quatre jeux de clés distincts', () => {
    const cles = ['1', '2', '3', ''].map(v => vk('singulies.email', v));
    expect(new Set(cles).size).toBe(4);
  });
  it('choix selon la version', () => {
    expect(choix({ 1: 'a', 2: 'b', 3: 'c' }, 'z', '2')).toBe('b');
    expect(choix({ 1: 'a' }, 'z', '3')).toBe('z');
    expect(choix({ 1: 'a' }, 'z', '')).toBe('z');
  });
});

describe('version : constante de construction', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
  it('__VERSION__ = 2 donne VERSION 2', async () => {
    vi.stubGlobal('__VERSION__', '2');
    vi.resetModules();
    const m = await import('../../src/core/version.js');
    expect(m.VERSION).toBe('2');
    expect(m.EST_VERSION).toBe(true);
    expect(m.vk('x')).toBe('v2.x');
  });
  it('sans version construite : le site principal', async () => {
    vi.resetModules();
    const m = await import('../../src/core/version.js');
    expect(m.VERSION).toBe('');
  });
});
