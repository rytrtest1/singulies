// Les cartes du portail (leurs intitulés, leurs liens) : partagées par le portail en 3D et sa version simple.
// liens de sortie : null = lien d'attente (« bientôt »)
// (11/10) la carte « un poème par mois » mène à sa page (lettre.html : la liste d'attente, en attendant le SIRET)
export const LINKS = { lettre: './lettre', livres: 'https://www.amazon.fr/dp/B0DS8RF83H', jeu: null };
export const ITEMS = [
  { id: 'poeme', label: 'un prénom, un poème, par la poste', lines: ['un prénom, un poème', 'par la poste'] },
  { id: 'lettre', label: 'un poème par mois, par la poste', lines: ['un poème par mois', 'par la poste'] },
  { id: 'livres', label: 'mes livres' },
  // le paquet : son dos (logo en relief), « SINGULIES / le jeu » tapé dessus, centré (09/10)
  { id: 'jeu', label: 'SINGULIES, le jeu', lines: ['SINGULIES', 'le jeu'], back: true, center: true },
];
// page d'achat du jeu (null = « bientôt ») : la carte « commander » de la page du jeu
export const JEU_LINK = null;
