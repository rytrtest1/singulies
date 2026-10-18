// De la fiche du poème à la cérémonie : boutique.html → prénom → COMMANDER → index.html (le prénom se tape, les lettres
// volent, la feuille, RECEVOIR part tout seul) → la carte « pour moi / pour offrir » (réservation).
// node tools/boutique-commande-check.mjs [dossier]      (téléphone 390×844, rendu GPU ; SWIFT=1 : rendu logiciel)
import { build, preview } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const out = process.argv[2] || 'tmp/boutique-commande';
mkdirSync(out, { recursive: true });
const PORT = 5210;
// une version figée (le serveur de développement recharge la page quand un fichier change : une autre session en modifie)
const DIST = process.env.OUTDIR || 'C:/Users/maxen/AppData/Local/Temp/claude/boutique-dist';
await build({ logLevel: 'error', build: { outDir: DIST, emptyOutDir: true } });
const server = await preview({ build: { outDir: DIST }, preview: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
const args = process.env.SWIFT ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'];
const browser = await chromium.launch({ headless: true, args });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
if (process.env.SWIFT) await page.addInitScript(() => { window.__dtMax = 0.4; });
page.setDefaultTimeout(240000);
const t0 = Date.now(), at = () => ((Date.now() - t0) / 1000).toFixed(1) + ' s';
const errs = [];
page.on('console', m => { if (/vite|reload|offre|cartes|why|WebGL/i.test(m.text())) console.log('  [page]', m.text().slice(0, 200)); });
page.on('framenavigated', f => { if (f === page.mainFrame()) console.log('  [nav]', ((Date.now() - t0) / 1000).toFixed(1), f.url()); });
page.on('pageerror', e => errs.push(String(e)));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
await page.goto(`http://localhost:${PORT}/boutique.html?envoi=0#/produit/poeme`);
await page.waitForSelector('#prenom');
await page.fill('#prenom', 'Léa');
await page.waitForTimeout(800);
await page.click('#cta');
await page.waitForURL(/index\.html/);
console.log('index.html', at(), page.url());
await page.waitForSelector('#offre.bar-on', { timeout: 240000 });
console.log('la feuille et le bandeau', at(), await page.evaluate(() => document.querySelector('#offre').className + ' | cards=' + (window.__sg && typeof window.__sg.cards)));
await page.screenshot({ path: `${out}/1-offre.png` });
// RECEVOIR part tout seul : l'offre s'efface, la cérémonie (carte, réponse, feuille…) commence
await page.waitForFunction(() => !document.querySelector('#offre') || !document.querySelector('#offre.bar-on'), null, { timeout: 120000 });
console.log("l'offre s'est effacée : RECEVOIR est parti tout seul", at());
await page.waitForTimeout(12000);
await page.screenshot({ path: `${out}/2-ceremonie.png` });
console.log(await page.evaluate(() => JSON.stringify({ url: location.pathname, offre: !!document.querySelector('#offre'), mc: [...document.querySelectorAll('.mc')].map(e => e.className + ':' + e.textContent.slice(0, 60)), order: localStorage.getItem('singulies.order') && 'oui' })));
console.log(errs.length ? 'ERREURS:\n' + errs.join('\n') : 'aucune erreur');
await browser.close(); await new Promise(r => server.httpServer.close(r));
