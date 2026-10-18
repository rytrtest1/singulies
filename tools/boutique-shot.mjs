// Captures de la version boutique (boutique.html) : accueil, boutique, chaque fiche, questions, à propos, contact, menu.
// node tools/boutique-shot.mjs <dossier> [pc|tel] [vues…]   (par défaut : téléphone 390×844 ; pc = 1440×900)
// Le serveur de développement est lancé ici (port 5206).
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const out = process.argv[2] || 'tmp/boutique';
const pc = process.argv[3] === 'pc';
const only = process.argv.slice(4);
mkdirSync(out, { recursive: true });
const PORT = 5206;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: pc ? { width: 1440, height: 900 } : { width: 390, height: 844 }, deviceScaleFactor: pc ? 1 : 2, hasTouch: !pc, isMobile: !pc });
const page = await ctx.newPage();
page.setDefaultTimeout(30000);
const errs = [];
page.on('pageerror', e => errs.push('page: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
const base = `http://localhost:${PORT}/boutique.html`;
const vues = [
  ['accueil', '#/'], ['boutique', '#/boutique'], ['poeme', '#/produit/poeme'], ['mois', '#/produit/mois'], ['livres', '#/produit/livres'], ['journal', '#/produit/livres?v=journal'],
  ['jeu', '#/produit/jeu'], ['questions', '#/questions'], ['apropos', '#/a-propos'], ['contact', '#/contact'],
].filter(([n]) => !only.length || only.includes(n));
for (const [n, h] of vues) {
  await page.goto(base + h);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${n}.png`, fullPage: true });
  console.log('ok', n);
}
if (!only.length || only.includes('poeme-nom')) {
  await page.goto(base + '#/produit/poeme');
  await page.waitForTimeout(800);
  await page.fill('#prenom', 'Clémence-Rose');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/poeme-nom.png`, fullPage: false });
  console.log('ok poeme-nom');
}
console.log(errs.length ? 'ERREURS:\n' + errs.join('\n') : 'aucune erreur');
await browser.close(); await server.close();
