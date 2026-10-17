import { describe, it, expect, vi, afterEach } from 'vitest';
import { inscrireAttente } from '../../src/core/attente.js';
import { postAttente } from '../../serveur/attente.js';

const memoire = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };

describe('liste d’attente : le site', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('un email invalide ne part pas', async () => {
    const appel = vi.fn();
    const r = await inscrireAttente({ email: 'pas-un-email', liste: 'jeu', appel, url: 'https://w.example' });
    expect(r).toMatchObject({ ok: false, code: 'email' });
    expect(appel).not.toHaveBeenCalled();
  });
  it('une liste inconnue ne part pas', async () => {
    const r = await inscrireAttente({ email: 'a@b.fr', liste: 'autre', appel: vi.fn(), url: 'https://w.example' });
    expect(r).toMatchObject({ ok: false, code: 'liste' });
  });
  it('envoie seulement l’email, la liste et la version vers /attente', async () => {
    vi.stubGlobal('localStorage', memoire());
    const appel = vi.fn(async () => ({ ok: true }));
    const r = await inscrireAttente({ email: ' a@b.fr ', liste: 'jeu', appel, url: 'https://w.example/' });
    expect(r).toEqual({ ok: true });
    const [url, init] = appel.mock.calls[0];
    expect(url).toBe('https://w.example/attente');
    expect(JSON.parse(init.body)).toEqual({ email: 'a@b.fr', liste: 'jeu', version: '', site: '' });
  });
  it('réseau coupé ou refus : un message, pas d’exception', async () => {
    vi.stubGlobal('localStorage', memoire());
    expect(await inscrireAttente({ email: 'a@b.fr', appel: async () => { throw new Error('x'); }, url: 'https://w.example' })).toMatchObject({ ok: false, code: 'reseau' });
    expect(await inscrireAttente({ email: 'a@b.fr', appel: async () => ({ ok: false }), url: 'https://w.example' })).toMatchObject({ ok: false, code: 'refuse' });
  });
});

// une base D1 factice : une table attente (email, liste) en mémoire
function baseFausse() {
  const lignes = new Map();
  return {
    lignes,
    prepare: sql => ({
      bind: (...a) => ({ run: async () => { if (/INSERT OR IGNORE INTO attente/.test(sql)) { const k = a[0] + '|' + a[1]; if (!lignes.has(k)) lignes.set(k, a); } return {}; } }),
      run: async () => ({}),
    }),
  };
}
const demande = corps => new Request('https://w.example/attente', { method: 'POST', body: typeof corps === 'string' ? corps : JSON.stringify(corps) });

describe('liste d’attente : le Worker', () => {
  it('base non reliée : 503', async () => { expect((await postAttente({}, demande({}))).status).toBe(503); });
  it('inscrit un email en minuscules, une seule fois par liste', async () => {
    const DB = baseFausse();
    const ok = await postAttente({ DB }, demande({ email: 'Moi@Exemple.FR', liste: 'jeu', version: '2' }));
    expect(ok.status).toBe(200);
    await postAttente({ DB }, demande({ email: 'moi@exemple.fr', liste: 'jeu', version: '3' }));
    await postAttente({ DB }, demande({ email: 'moi@exemple.fr', liste: 'lettre' }));
    expect(DB.lignes.size).toBe(2);
    expect(DB.lignes.get('moi@exemple.fr|jeu')[3]).toBe('2');
  });
  it('refuse un email invalide, une liste inconnue, un corps illisible ou trop long', async () => {
    const DB = baseFausse();
    expect((await postAttente({ DB }, demande({ email: 'nope', liste: 'jeu' }))).status).toBe(400);
    expect((await postAttente({ DB }, demande({ email: 'a@b.fr', liste: 'x' }))).status).toBe(400);
    expect((await postAttente({ DB }, demande('pas du json'))).status).toBe(400);
    expect((await postAttente({ DB }, demande('x'.repeat(3000)))).status).toBe(413);
    expect(DB.lignes.size).toBe(0);
  });
  it('le piège à robots : réponse « ok » mais rien n’est gardé', async () => {
    const DB = baseFausse();
    const r = await postAttente({ DB }, demande({ email: 'a@b.fr', liste: 'jeu', site: 'http://spam' }));
    expect(r.status).toBe(200);
    expect(DB.lignes.size).toBe(0);
  });
});
