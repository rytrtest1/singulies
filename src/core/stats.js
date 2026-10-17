// Les statistiques, un entonnoir commun aux trois versions (plan, §4). Le transport est src/app/count.js (GoatCounter,
// aucun cookie, aucun texte saisi : jamais un prénom, une réponse ou une adresse) ; chaque chemin y est préfixé par la
// version (« v2/etape/… »), donc un seul tableau de bord, trois jeux de chiffres séparés.
// Règle (décision 0) : `recevoir` est un clic ; `demande-envoyee` et `paye` ne partent que lorsque c'est vrai
// (la demande est réellement partie / le paiement est réellement confirmé).
import { count } from '../app/count.js';

export { count };

export const ETAPES = [
  'arrivee',            // la page est ouverte (déjà compté par installCount : arrivee/<page>)
  'prenom-commence',    // une première lettre
  'prenom-valide',      // le prénom est confirmé
  'apercu-vu',          // l'aperçu (feuille, prix, ce qu'on reçoit) est à l'écran
  'recevoir',           // clic sur RECEVOIR / « commander »
  'question-tiree',     // une carte du jeu est tirée
  'reponse-donnee',     // la réponse (ou le thème) est écrite
  'passer-theme',       // PASSER : choisir son thème
  'passer-improvise',   // PASSER : laisser Eternel improviser
  'adresse-commencee',
  'adresse-valide',
  'email-donne',
  'paiement-ouvert',
  'paiement-passe-test', // panneau Stripe de test passé (jamais en réel)
  'demande-envoyee',    // la demande est réellement partie
  'paye',               // le paiement est réellement confirmé
  'confirmation-vue',
];

// À côté de l'entonnoir : question-retiree, offrir-choisi, date-demandee, retour-arriere/<étape>, erreur/<type>,
// attente-jeu, aide/<question> — passent par count('…') avec ces noms.
const SET = new Set(ETAPES);
export function etape(nom, options) {
  if (!SET.has(nom)) throw new Error('étape inconnue : ' + nom);
  count('etape/' + nom, options);
}
export const erreur = type => count('erreur/' + String(type).replace(/[^a-z0-9-]/g, '').slice(0, 30));
export const retour = depuis => count('retour-arriere/' + String(depuis).replace(/[^a-z0-9-]/g, '').slice(0, 30), { once: false });
