// Les trois versions partagent l'origine singulies.com : aucune clé du navigateur ne doit être écrite sans le
// préfixe de version (vk). Ce test lit les sources et cherche toute clé « singulies.… » ou « sg.… » donnée en clair.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const racine = join(__dirname, '..', '..', 'src');
const fichiers = (d) => readdirSync(d).flatMap(n => { const p = join(d, n); return statSync(p).isDirectory() ? fichiers(p) : p.endsWith('.js') ? [p] : []; });
// hors du champ : la page d'administration (singulies.com/commandes.html, jamais dans une version), les essais anciens
const EXCLUS = [join('src', 'admin'), join('src', 'basique'), join('src', 'portal'), join('src', 'epure'), join('src', 'core')];

describe('clés du stockage', () => {
  it('toute clé « singulies.* » ou « sg.* » passe par vk()', () => {
    const fautes = [];
    for (const f of fichiers(racine)) {
      const rel = f.slice(f.indexOf('src'));
      if (EXCLUS.some(e => rel.startsWith(e))) continue;
      readFileSync(f, 'utf8').split('\n').forEach((ligne, i) => {
        if (/^\s*\/\//.test(ligne)) return;
        for (const m of ligne.matchAll(/['"`]((?:singulies|sg)\.[A-Za-z.]+)['"`]/g)) {
          if (!ligne.slice(0, m.index).endsWith('vk(')) fautes.push(rel + ':' + (i + 1) + '  ' + m[1]);
        }
      });
    }
    expect(fautes).toEqual([]);
  });
});
