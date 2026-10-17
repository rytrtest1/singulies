import { describe, it, expect, vi, afterEach } from 'vitest';

describe('statistiques : l’entonnoir commun', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
  // count.js lit location / navigator / window en important : on les fournit (rien ne part : ?envoi=0)
  const importer = async (version = '') => {
    vi.stubGlobal('location', { search: '?envoi=0' });
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('window', {});
    vi.stubGlobal('__VERSION__', version);
    vi.resetModules();
    return import('../../src/core/stats.js');
  };
  it('les étapes sont uniques et recevoir est un clic distinct de demande-envoyee et paye', async () => {
    const { ETAPES } = await importer();
    expect(new Set(ETAPES).size).toBe(ETAPES.length);
    for (const e of ['recevoir', 'demande-envoyee', 'paye', 'paiement-passe-test']) expect(ETAPES).toContain(e);
  });
  it('une étape inconnue est refusée (une faute de frappe ne crée pas une statistique fantôme)', async () => {
    const { etape } = await importer();
    expect(() => etape('prenom-valide')).not.toThrow();
    expect(() => etape('prenom-valid')).toThrow(/inconnue/);
  });
});
