// L'aide de chaque étape (V2, décision 9) : un « ? » qui ouvre la question de FAQ qui correspond à l'endroit où l'on est.
// Réponses vraies seulement (mêmes sources que src/alt/questions.js et conditions.html).
import { QUESTIONS } from '../alt/questions.js';

const Q = i => QUESTIONS[i];
export const NOMS = ['prénom', 'question', 'adresse', 'paiement'];

// étape (1 à 4) → [question, réponse][]
export function aideDe(etape) {
  return {
    1: [Q(1), Q(0), Q(4)],
    2: [['à quoi sert la question ?', 'ta réponse inspire le poème : plus elle est vraie, plus il te ressemble. tu peux tirer une autre carte, choisir ton propre thème, ou me laisser improviser à partir du prénom.'], Q(2)],
    3: [Q(3), Q(5), Q(2)],
    4: [Q(6), Q(7), Q(0)],
  }[etape] || [];
}
