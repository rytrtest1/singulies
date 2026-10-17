import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { lignePaiement, LIGNES_PAIEMENT, etatPaiement, stripeTestVisible, MODE_PAIEMENT } from '../../src/core/paiement.js';

const memoire = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };

describe('la ligne sur le paiement', () => {
  it('PayPal : rien n’est débité, sans délai affiché', () => {
    expect(lignePaiement('paypal')).toBe('rien n’est débité maintenant : je t’envoie le lien de paiement par email');
    expect(lignePaiement('paypal')).not.toMatch(/jour|heure|semaine/);
  });
  it('Stripe réel : carte, Apple Pay, Google Pay, après l’adresse', () => {
    expect(lignePaiement('stripe')).toMatch(/carte, Apple Pay ou Google Pay, après l’adresse/);
  });
  it('mode inconnu : PayPal', () => { expect(lignePaiement('x')).toBe(LIGNES_PAIEMENT.paypal); });
  it('aujourd’hui le mode construit est PayPal', () => { expect(MODE_PAIEMENT).toBe('paypal'); });
});

describe('état du paiement', () => {
  it('PayPal, pas en test : aucun panneau Stripe', () => {
    expect(etatPaiement({ mode: 'paypal', test: false })).toMatchObject({ mode: 'paypal', panneauStripe: false, passable: false });
  });
  it('PayPal en test : le panneau Stripe de test, qu’on peut passer', () => {
    expect(etatPaiement({ mode: 'paypal', test: true })).toMatchObject({ mode: 'stripe-test', panneauStripe: true, passable: true });
  });
  it('Stripe réel : le panneau, jamais passable, même avec ?test=1', () => {
    for (const test of [false, true]) expect(etatPaiement({ mode: 'stripe', test })).toMatchObject({ mode: 'stripe', panneauStripe: true, passable: false });
  });
  it('la ligne suit le mode réel, pas le test', () => {
    expect(etatPaiement({ mode: 'paypal', test: true }).ligne).toBe(LIGNES_PAIEMENT.paypal);
    expect(etatPaiement({ mode: 'stripe', test: false }).ligne).toBe(LIGNES_PAIEMENT.stripe);
  });
});

describe('?test=1', () => {
  beforeEach(() => { vi.stubGlobal('sessionStorage', memoire()); });
  afterEach(() => vi.unstubAllGlobals());
  it('invisible par défaut', () => { expect(stripeTestVisible('', false)).toBe(false); });
  it('?test=1 l’active et la visite le retient', () => {
    expect(stripeTestVisible('?test=1', false)).toBe(true);
    expect(stripeTestVisible('', false)).toBe(true);
  });
  it('?test=0 l’éteint', () => {
    stripeTestVisible('?test=1', false);
    expect(stripeTestVisible('?test=0', false)).toBe(false);
    expect(stripeTestVisible('', false)).toBe(false);
  });
  it('un déploiement marqué test le montre toujours', () => { expect(stripeTestVisible('', true)).toBe(true); });
  it('sans sessionStorage utilisable, aucune erreur', () => {
    const bloque = () => { throw new Error('bloqué'); };
    vi.stubGlobal('sessionStorage', { getItem: bloque, setItem: bloque, removeItem: bloque });
    expect(() => stripeTestVisible('?test=1', false)).not.toThrow();
  });
});
