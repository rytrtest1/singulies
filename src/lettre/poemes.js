// « Un poème par mois » (12/10) : les poèmes que la page montre, un au hasard à chaque visite. Pour l'instant, les
// acrostiches des autres poèmes (src/alt/exemples.js) — Maxence donnera la liste des siens à montrer ici.
// Chaque poème : ses vers, tels qu'ils seront tapés ; PENSEES : la lettre au dos (ses pensées pendant la création) —
// PROVISOIRE, à remplacer par un vrai texte d'Eternel.
import { EXEMPLES } from '../alt/exemples.js';

export const POEMES = EXEMPLES.map(ex => ({ vers: ex.vers.map(v => (v ? v[0] + v.slice(2) : '')) }));

export const PENSEES = [
  'je l’ai commencé un soir,',
  'la fenêtre ouverte sur la rue.',
  '',
  'les premiers vers sont venus',
  'tout seuls, les autres non.',
  'j’ai barré, recommencé,',
  'laissé la feuille sur la machine',
  'jusqu’au matin.',
  '',
  'ce que tu lis, c’est ce qui',
  'est resté quand tout le reste',
  'est tombé.',
  '',
  '- ETERNEL -',
];
