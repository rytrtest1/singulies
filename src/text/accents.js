// Le prénom tel qu'on l'écrit à la main (09/10) : le site ne garde que A–Z (LEA) ; pour une invitation tapée sur
// l'enveloppe (« Léa nom »), on lui rend ses accents quand le prénom est courant, sinon une capitale initiale.
// Une table plutôt qu'une règle : « Lea » existe aussi, mais Léa est de loin la plus fréquente en France.
const ACC = {
  ADELE: 'Adèle', AGNES: 'Agnès', AMELIE: 'Amélie', ANAELLE: 'Anaëlle', ANAIS: 'Anaïs', ANDRE: 'André', ANDREA: 'Andréa',
  ARSENE: 'Arsène', AURELIE: 'Aurélie', AURELIEN: 'Aurélien', BEATRICE: 'Béatrice', BENEDICTE: 'Bénédicte',
  BERENICE: 'Bérénice', CECILE: 'Cécile', CEDRIC: 'Cédric', CELESTE: 'Céleste', CELIA: 'Célia', CELINE: 'Céline',
  CHLOE: 'Chloé', CLELIA: 'Clélia', CLEMENCE: 'Clémence', CLEMENT: 'Clément', CLEMENTINE: 'Clémentine', CLEO: 'Cléo',
  DANIELE: 'Danièle', EDOUARD: 'Édouard', ELEONORE: 'Éléonore', ELISE: 'Élise', ELODIE: 'Élodie', ELOISE: 'Éloïse',
  EMILE: 'Émile', EMILIE: 'Émilie', EMILIEN: 'Émilien', ETIENNE: 'Étienne', EVE: 'Ève', FELIX: 'Félix',
  FREDERIC: 'Frédéric', GAEL: 'Gaël', GAELLE: 'Gaëlle', GENEVIEVE: 'Geneviève', GERARD: 'Gérard', HELENE: 'Hélène',
  HELOISE: 'Héloïse', INES: 'Inès', IRENE: 'Irène', JEREMY: 'Jérémy', JEROME: 'Jérôme', JOEL: 'Joël', JOELLE: 'Joëlle',
  JOSE: 'José', LEA: 'Léa', LEANDRE: 'Léandre', LENA: 'Léna', LEO: 'Léo', LEON: 'Léon', LEONARD: 'Léonard',
  LEONIE: 'Léonie', LOIC: 'Loïc', MAEL: 'Maël', MAELLE: 'Maëlle', MAELYS: 'Maëlys', MAITE: 'Maïté', MATHEO: 'Mathéo',
  MELANIE: 'Mélanie', MELISSA: 'Mélissa', MELODIE: 'Mélodie', MICHAEL: 'Michaël', MICKAEL: 'Mickaël', NAEL: 'Naël',
  NOE: 'Noé', NOELLE: 'Noëlle', NOEMIE: 'Noémie', OCEANE: 'Océane', PENELOPE: 'Pénélope', RAPHAEL: 'Raphaël',
  RAPHAELLE: 'Raphaëlle', REGIS: 'Régis', REMI: 'Rémi', RENE: 'René', ROMEO: 'Roméo', SEBASTIEN: 'Sébastien',
  SEGOLENE: 'Ségolène', SEVERINE: 'Séverine', SOLENE: 'Solène', STEPHANE: 'Stéphane', STEPHANIE: 'Stéphanie',
  THAIS: 'Thaïs', THEO: 'Théo', THERESE: 'Thérèse', TIMEO: 'Timéo', VALERIE: 'Valérie', VERONIQUE: 'Véronique',
  ZELIE: 'Zélie', ZOE: 'Zoé',
};
// « CLEMENCE ROSE » → « Clémence Rose »
export function handName(name) {
  return String(name || '').trim().split(/\s+/).filter(Boolean)
    .map(w => ACC[w.toUpperCase()] || w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}
