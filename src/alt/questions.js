// « tes questions » (17/10) : ce qu'on se demande avant de commander, une section de la page du poème. Toucher une
// question l'ouvre (une seule à la fois). Réponses vraies seulement — même chose que conditions.html.
import { PRIX, DELAI, RESERVATION } from './config.js';

export const QUESTIONS = [
  ['quand est-ce que je le reçois ?', `${DELAI}, par la poste, en lettre. compte ensuite quelques jours d’acheminement.`],
  ['c’est vraiment toi qui l’écris ?', 'oui. je lis ta réponse, j’écris le poème, puis je le tape une seule fois à la machine à écrire. personne d’autre ne l’écrit, aucun programme non plus.'],
  ['je peux l’offrir ?', 'oui : écris son prénom à la place du tien, réponds à la question en pensant à elle ou à lui, et mets son adresse sur l’enveloppe.'],
  ['pour une date précise ?', 'écris-moi la date (ETERNEL, tout en bas) : je fais en sorte qu’il arrive à temps. commande au moins dix jours avant.'],
  ['un prénom composé, deux prénoms ?', 'oui : une lettre par vers, et une ligne blanche entre les deux. jusqu’à 22 lettres.'],
  ['hors de france ?', 'pas encore : seulement en france pour l’instant.'],
  ['et le paiement ?', RESERVATION
    ? `${PRIX}, envoi compris. rien n’est débité sur le site : je t’écris ensuite pour le paiement, par paypal.`
    : `${PRIX}, envoi compris, par carte, apple pay ou google pay.`],
  ['et s’il ne me plaît pas ?', 'il est écrit pour toi, je ne peux pas le reprendre. mais écris-moi, on en parle. et si l’enveloppe se perd ou arrive abîmée, je le refais.'],
];

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function questionsHtml() {
  return `<div class="qs">${QUESTIONS.map(([q, a]) => `<details class="qs-i"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>`;
}

// une seule ouverte à la fois
export function wireQuestions(root) {
  const items = [...root.querySelectorAll('.qs-i')];
  for (const d of items) d.addEventListener('toggle', () => { if (d.open) for (const o of items) if (o !== d) o.open = false; });
}
