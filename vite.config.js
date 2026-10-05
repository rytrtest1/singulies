import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  server: { port: 5190, strictPort: true, host: true },
  preview: { port: 5191, strictPort: true },
  test: { include: ['tests/unit/**/*.test.js'] },
  // pages publiées : l'accueil, et la scène des cartes en essai (scene-cartes.html, pas de lien depuis l'accueil)
  build: { rollupOptions: { input: { main: 'index.html', cartes: 'scene-cartes.html', jeu: 'scene-jeu.html', confidentialite: 'confidentialite.html', demande: 'demande.html' } } },
});
