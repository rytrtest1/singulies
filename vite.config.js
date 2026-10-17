import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  server: { port: 5190, strictPort: true, host: true },
  preview: { port: 5191, strictPort: true },
  test: { include: ['tests/unit/**/*.test.js'] },
  // pages publiées (les pages de rendu et bancs d'essai — banc-carte, email-assets, exemples-rendu, livre-rendu — ne
  // servent qu'en développement, aux outils de tools/)
  build: { rollupOptions: { input: {
    // le site
    alt: 'alt.html', main: 'index.html', poeme: 'poeme.html', jeuPage: 'jeu.html', lettre: 'lettre.html', livres: 'livres.html',
    merci: 'merci.html', pour: 'pour.html', confidentialite: 'confidentialite.html', mentions: 'mentions.html', conditions: 'conditions.html', demande: 'demande.html',
    // le suivi des commandes (Eternel seul, mot de passe)
    commandes: 'commandes.html',
    // scènes seules (essais, liens directs)
    cartes: 'scene-cartes.html', cachet: 'cachet.html',
    // versions basiques (essai du 09/10)
    bBoutique: 'basique-boutique.html', bArtiste: 'basique-artiste.html', bFormulaire: 'basique-formulaire.html', bFeuille: 'basique-feuille.html',
  } } },
});
