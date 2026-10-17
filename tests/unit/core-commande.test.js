import { describe, it, expect, vi } from 'vitest';
import { postCommande } from '../../serveur/commandes.js';

// une base D1 factice : garde les INSERT (colonnes et valeurs) et les ALTER TABLE
function baseFausse() {
  const inserts = [], ddl = [];
  return {
    inserts, ddl,
    prepare: sql => ({
      bind: (...a) => ({
        first: async () => undefined,
        run: async () => { if (/INSERT INTO commandes/.test(sql)) inserts.push({ sql, a }); return {}; },
      }),
      run: async () => { ddl.push(sql); return {}; },
    }),
  };
}
const demande = corps => new Request('https://w.example/commande', { method: 'POST', body: JSON.stringify(corps) });
const colonnes = sql => sql.match(/\(([^)]*)\) VALUES/)[1].split(',').map(s => s.trim());

describe('commande : la version et « de la part de »', () => {
  it('la version et celui qui offre sont gardés avec la commande', async () => {
    const DB = baseFausse();
    const r = await postCommande({ DB }, demande({ ref: 'LEA-abc', prenom: 'Léa', mode: 'reservation', version: '3', dela: '  Sami  ' }));
    expect((await r.json()).ok).toBe(true);
    const { sql, a } = DB.inserts[0];
    const cols = colonnes(sql), val = Object.fromEntries(cols.map((c, i) => [c, a[i]]));
    expect(cols).toContain('version'); expect(cols).toContain('de_la_part');
    expect(a).toHaveLength(cols.length);                              // autant de valeurs que de colonnes
    expect(val.version).toBe('3'); expect(val.de_la_part).toBe('Sami'); expect(val.prenom).toBe('LEA');
  });
  it('une version inconnue est ignorée ; le site principal : rien', async () => {
    const DB = baseFausse();
    await postCommande({ DB }, demande({ ref: 'A-1', prenom: 'Lea', version: '9' }));
    await postCommande({ DB }, demande({ ref: 'A-2', prenom: 'Lea' }));
    for (const { sql, a } of DB.inserts) { const cols = colonnes(sql); expect(a[cols.indexOf('version')]).toBe(''); expect(a[cols.indexOf('de_la_part')]).toBe(''); }
  });
  it('les colonnes sont ajoutées à une table qui existe déjà', async () => {
    vi.resetModules();                                                // (le schéma n'est préparé qu'une fois par instance du Worker)
    const { postCommande: neuf } = await import('../../serveur/commandes.js');
    const DB = baseFausse();
    await neuf({ DB }, demande({ ref: 'A-3', prenom: 'Lea' }));
    expect(DB.ddl.some(s => /ADD COLUMN version/.test(s))).toBe(true);
    expect(DB.ddl.some(s => /ADD COLUMN de_la_part/.test(s))).toBe(true);
  });
});
