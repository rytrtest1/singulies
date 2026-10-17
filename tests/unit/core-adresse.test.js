import { describe, it, expect } from 'vitest';
import { validerCodePostal, lireSuggestions, urlSuggestions, creerRecherche, toucheListe, BAN_URL } from '../../src/core/adresse.js';

describe('code postal', () => {
  it.each(['75002', '01000', '20000', '95000', '97400', '75 002'])('%s est valable', cp => expect(validerCodePostal(cp).ok).toBe(true));
  it.each([['ABC', 'format'], ['', 'vide'], ['7500', 'format'], ['750022', 'format'], ['00000', 'hors-france'], ['96000', 'hors-france'], ['98000', 'hors-france'], ['99999', 'hors-france']])('%s refusé (%s)', (cp, code) => {
    const r = validerCodePostal(cp);
    expect(r.ok).toBe(false);
    expect(r.code).toBe(code);
    expect(r.message).not.toBe('');
  });
  it('métropole et outre-mer', () => {
    expect(validerCodePostal('75002').zone).toBe('metropole');
    expect(validerCodePostal('97400').zone).toBe('outre-mer');
  });
});

// une réponse réelle de la Géoplateforme (data.geopf.fr/geocodage/search, 17/10/2026), raccourcie
const REPONSE = { type: 'FeatureCollection', features: [
  { type: 'Feature', properties: { label: '8 Rue de la Paix 75002 Paris', housenumber: '8', id: '75102_6998_00008', banId: '36188683', name: '8 Rue de la Paix', postcode: '75002', city: 'Paris', street: 'Rue de la Paix', type: 'housenumber' } },
  { type: 'Feature', properties: { label: '8 Rue de la Paix 95240 Cormeilles-en-Parisis', name: '8 Rue de la Paix', postcode: '95240', city: 'Cormeilles-en-Parisis', id: '95176_x' } },
  { type: 'Feature', properties: { label: 'incomplète', name: 'Rue X' } },
] };

describe('suggestions', () => {
  it('une proposition remplit rue, code postal, ville', () => {
    const l = lireSuggestions(REPONSE);
    expect(l).toHaveLength(2);
    expect(l[0]).toEqual({ label: '8 Rue de la Paix 75002 Paris', rue: '8 Rue de la Paix', cp: '75002', ville: 'Paris', id: '75102_6998_00008' });
  });
  it('réponse vide ou illisible : rien', () => {
    expect(lireSuggestions(null)).toEqual([]);
    expect(lireSuggestions({})).toEqual([]);
    expect(lireSuggestions({ features: 3 })).toEqual([]);
  });
  it('adresse du service : la Géoplateforme', () => {
    expect(BAN_URL).toBe('https://data.geopf.fr/geocodage/search/');
    const u = new URL(urlSuggestions('8 rue de la pa'));
    expect(u.origin + u.pathname).toBe(BAN_URL);
    expect(u.searchParams.get('q')).toBe('8 rue de la pa');
    expect(u.searchParams.get('autocomplete')).toBe('1');
  });
});

describe('recherche', () => {
  const faux = (json, ok = true) => { const appels = []; return { appels, appel: async (u) => { appels.push(u); return { ok, json: async () => json }; } }; };
  const vite = () => Promise.resolve();
  it('trop court : aucun appel', async () => {
    const f = faux(REPONSE);
    const c = creerRecherche({ appel: f.appel, attendre: vite });
    expect(await c('8 ')).toEqual([]);
    expect(f.appels).toHaveLength(0);
  });
  it('une saisie suffisante donne des propositions', async () => {
    const f = faux(REPONSE);
    const c = creerRecherche({ appel: f.appel, attendre: vite });
    expect(await c('8 rue de la pa')).toHaveLength(2);
    expect(f.appels).toHaveLength(1);
  });
  it('une frappe plus récente annule la précédente', async () => {
    const f = faux(REPONSE);
    let libere;
    const pause = new Promise(r => { libere = r; });
    let n = 0;
    const attendre = () => (++n === 1 ? pause : Promise.resolve());
    const c = creerRecherche({ appel: f.appel, attendre });
    const a = c('8 rue de la');
    const b = c('8 rue de la pa');
    libere();
    expect(await a).toEqual([]);
    expect(await b).toHaveLength(2);
    expect(f.appels).toHaveLength(1);
  });
  it('service en erreur ou réseau coupé : liste vide, la saisie libre continue', async () => {
    expect(await creerRecherche({ appel: faux({}, false).appel, attendre: vite })('8 rue de la')).toEqual([]);
    expect(await creerRecherche({ appel: async () => { throw new Error('hors ligne'); }, attendre: vite })('8 rue de la')).toEqual([]);
  });
});

describe('clavier dans la liste', () => {
  const etat = (index, taille = 3, ouvert = true) => ({ index, taille, ouvert });
  it('flèches en boucle', () => {
    expect(toucheListe(etat(-1), 'ArrowDown').index).toBe(0);
    expect(toucheListe(etat(2), 'ArrowDown').index).toBe(0);
    expect(toucheListe(etat(0), 'ArrowUp').index).toBe(2);
    expect(toucheListe(etat(-1), 'ArrowUp').index).toBe(2);
  });
  it('Entrée valide l’élément actif, sinon laisse la saisie libre', () => {
    expect(toucheListe(etat(1), 'Enter')).toMatchObject({ valider: true, index: 1 });
    expect(toucheListe(etat(-1), 'Enter')).toMatchObject({ valider: false, ouvert: true });
  });
  it('Échap ferme ; liste vide ou fermée : rien', () => {
    expect(toucheListe(etat(1), 'Escape')).toEqual({ index: -1, ouvert: false, valider: false });
    expect(toucheListe(etat(0, 0), 'ArrowDown').ouvert).toBe(false);
    expect(toucheListe(etat(0, 3, false), 'ArrowDown').ouvert).toBe(false);
  });
});
