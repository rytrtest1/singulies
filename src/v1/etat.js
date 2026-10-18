// L'état de la commande en cours (V1) : gardé le temps de la visite (sessionStorage, clé préfixée par version), pour que le
// retour du navigateur ne perde rien et qu'on puisse « reprendre ta commande ». Rien ne part tant qu'on ne commande pas.
import { vk } from '../core/version.js';
import QUESTIONS from '../cards/questions.json';

const K = vk('singulies.commande');
export const ROUTES_FLUX = ['', 'apercu', 'question', 'adresse', 'paiement', 'confirmation'];
export const ETAPES = [['prénom', ['', 'apercu']], ['question', ['question']], ['adresse', ['adresse']], ['paiement', ['paiement']]];

const VIDE = () => ({
  prenom: '', brut: '', kind: 'reponse', qid: null, deja: [], texte: '', theme: '',
  adr: { prenom: '', nom: '', rue: '', cplt: '', cp: '', ville: '' }, email: '', ref: '', loin: 0, fait: false, mode: '',
});
let E = VIDE();
try { const s = JSON.parse(sessionStorage.getItem(K) || 'null'); if (s && typeof s === 'object') E = { ...VIDE(), ...s, adr: { ...VIDE().adr, ...(s.adr || {}) } }; } catch { /* */ }

export const etat = () => E;
export function maj(p) { Object.assign(E, p); sauver(); return E; }
export function majAdr(p) { Object.assign(E.adr, p); sauver(); return E; }
function sauver() { try { sessionStorage.setItem(K, JSON.stringify(E)); } catch { /* */ } }
export function recommencer() { E = VIDE(); try { sessionStorage.removeItem(K); } catch { /* */ } return E; }
// l'étape la plus avancée atteinte (0 : le prénom … 4 : le paiement) : la reprise y revient
export function avance(route) { const i = ROUTES_FLUX.indexOf(route); if (i > E.loin && i < ROUTES_FLUX.length - 1) maj({ loin: i }); }

// ——— les questions du jeu : une à la fois, sans limite (décision 5) ———
export const questions = QUESTIONS;
export const questionDe = id => QUESTIONS.find(q => q.id === id) || null;
export function tirerQuestion(sauf = null) {
  const libres = QUESTIONS.filter(q => q.id !== sauf && !E.deja.includes(q.id));
  const liste = libres.length ? libres : QUESTIONS.filter(q => q.id !== sauf);   // toutes vues : on repart du début
  if (!libres.length) E.deja = [];
  const q = liste[Math.floor(Math.random() * liste.length)];
  E.qid = q.id; E.deja = [...E.deja, q.id].slice(-QUESTIONS.length);
  sauver();
  return q;
}

// une commande a été faite pendant cette visite : les autres offres (un poème par mois, livres, jeu) peuvent alors paraître (décision 10)
const K_FAIT = vk('singulies.acommande');
export const aCommande = () => { try { return sessionStorage.getItem(K_FAIT) === '1'; } catch { return false; } };
export const noterCommande = () => { try { sessionStorage.setItem(K_FAIT, '1'); } catch { /* */ } };
export const titreCase = s => String(s || '').toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase());
export const refDe = nom => (String(nom).replace(/[^A-Z ]/g, '').trim().replace(/ +/g, '_') || 'X') + '-' + Math.random().toString(36).slice(2, 8);
