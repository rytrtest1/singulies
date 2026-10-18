import { defineConfig } from 'vite';
import { rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Les trois versions du site (cahier des charges, 17/10/2026) : SG_VERSION=1|2|3 construit une version dans
// dist/v1, dist/v2 ou dist/v3 ; sans SG_VERSION, c'est le site principal (dist/). `npm run build` enchaîne les quatre
// (tools/build-all.mjs). La version est une constante de la construction (__VERSION__) : elle ne se choisit jamais par
// un paramètre d'adresse, et une page n'embarque que ce dont sa version a besoin.
const VERSION = (process.env.SG_VERSION || '').replace(/[^123]/g, '').slice(0, 1);

// pages publiées du site principal (les pages de rendu et bancs d'essai — banc-carte, email-assets, exemples-rendu,
// livre-rendu — ne servent qu'en développement, aux outils de tools/)
const SITE = {
  // le site
  alt: 'alt.html', main: 'index.html', poeme: 'poeme.html', jeuPage: 'jeu.html', lettre: 'lettre.html', livres: 'livres.html',
  merci: 'merci.html', pour: 'pour.html', confidentialite: 'confidentialite.html', mentions: 'mentions.html', conditions: 'conditions.html', demande: 'demande.html',
  // le suivi des commandes (Eternel seul, mot de passe)
  commandes: 'commandes.html',
  // scènes seules (essais, liens directs)
  cartes: 'scene-cartes.html', cachet: 'cachet.html',
  // la machine à écrire en direct (essai du 18/10)
  machine: 'machine.html',
  // versions basiques (essai du 09/10)
  bBoutique: 'basique-boutique.html', bArtiste: 'basique-artiste.html', bFormulaire: 'basique-formulaire.html', bFeuille: 'basique-feuille.html',
  // version épurée (17/10) : une boutique d'une page
  epure: 'epure.html',
  // version boutique (18/10) : la navigation d'une boutique classique, avec les rendus du site
  boutique: 'boutique.html',
};
// V2 et V3 : le moteur actuel, seulement les pages du parcours (ni suivi des commandes, ni essais, ni anciennes versions)
const MOTEUR = ['main', 'poeme', 'jeuPage', 'lettre', 'livres', 'merci', 'pour', 'confidentialite', 'mentions', 'conditions', 'demande'];

// Une version est invisible des moteurs : balise noindex dans chaque page, pas de canonical ni d'og:url vers le site
// principal, et pas de robots.txt / sitemap / _headers / _redirects dans son dossier (ils n'ont d'effet qu'à la racine du
// domaine : public/robots.txt, public/_headers et public/_redirects y couvrent /v1/, /v2/ et /v3/).
function versionPlugin() {
  return {
    name: 'sg-version',
    transformIndexHtml(html) {
      return html
        .replace(/<link rel="canonical"[^>]*>\s*/g, '')
        .replace(/<meta property="og:url"[^>]*>\s*/g, '')
        .replace(/<html\b/i, '<html data-version="' + VERSION + '"')   // (la page de confidentialité montre les phrases des versions)
        .replace(/<meta charset="utf-8">/i, m => m + '\n<meta name="robots" content="noindex,nofollow">');
    },
    closeBundle() {
      const out = resolve('dist', 'v' + VERSION);
      for (const f of ['robots.txt', 'sitemap.xml', '_headers', '_redirects', '404.html']) {
        const p = resolve(out, f);
        if (existsSync(p)) rmSync(p);
      }
    },
  };
}

export default defineConfig(() => {
  const commun = {
    base: './',
    define: { __VERSION__: JSON.stringify(VERSION) },
    server: { port: 5190, strictPort: true, host: true },
    preview: { port: 5191, strictPort: true },
    test: { include: ['tests/unit/**/*.test.js'] },
  };
  if (!VERSION) {
    return { ...commun, build: { rollupOptions: { input: SITE } } };
  }
  if (VERSION === '1') {
    // V1 : une application DOM à part (src/v1), sans le moteur 3D ; les fichiers communs (polices, images) viennent de public/
    return {
      ...commun,
      root: resolve('src/v1'),
      publicDir: resolve('public'),
      plugins: [versionPlugin()],
      build: { outDir: resolve('dist/v1'), emptyOutDir: true },
    };
  }
  const input = Object.fromEntries(MOTEUR.map(k => [k, SITE[k]]));
  return { ...commun, plugins: [versionPlugin()], build: { outDir: 'dist/v' + VERSION, emptyOutDir: true, rollupOptions: { input } } };
});
