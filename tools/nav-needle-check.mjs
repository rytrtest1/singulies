// Les aiguilles du bandeau (12/10) — version figée. alt.html : bandeau et SINGULIES cachés pendant les prénoms ; sur la
// feuille, la démonstration (l'aiguille de droite pique, tire, relâche ; puis la gauche) ; captures du haut de l'écran
// toutes les 0,5 s (2×), puis → (la page suivante) et ← (retour). node tools/nav-needle-check.mjs <dossier> [pc]
import { build, preview } from 'vite';
import { chromium } from 'playwright';
const SP = process.argv[2] || '.', PC = process.argv[3] === 'pc', OUT = 'C:/Users/maxen/AppData/Local/Temp/claude/nav-needle-dist', PORT = 5209;
await build({ logLevel: 'error', build: { outDir: OUT, emptyOutDir: true } });
const server = await preview({ build: { outDir: OUT }, preview: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const tag = PC ? 'pc' : 'tel', W = PC ? 1280 : 390;
const page = await browser.newPage(PC ? { viewport: { width: 1280, height: 800 } } : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(`http://localhost:${PORT}/alt.html?envoi=0&paiement=faux&seed=3`);
await page.waitForTimeout(6000);
console.log('prénoms : bandeau', await page.evaluate(() => document.querySelector('.nv').classList.contains('on')), 'SINGULIES', await page.evaluate(() => document.querySelector('.nv-foot').classList.contains('on')));
await page.mouse.click(W / 2, 400); await page.keyboard.type('LEA', { delay: 100 }); await page.keyboard.press('Enter');
await page.waitForFunction(() => document.querySelector('#offre.bar-on'), null, { timeout: 40000 });
const t0 = Date.now();
await page.mouse.move(W / 2, 600);
for (let i = 0; i < 24; i++) {
  await page.waitForTimeout(Math.max(0, t0 + 2000 + i * 500 - Date.now()));
  await page.screenshot({ path: `${SP}/nd-${tag}-${String(i).padStart(2, '0')}.png`, clip: { x: 0, y: 0, width: W, height: 50 } });
}
console.log('feuille : bandeau', await page.evaluate(() => document.querySelector('.nv').classList.contains('on')), 'SINGULIES', await page.evaluate(() => document.querySelector('.nv-foot').classList.contains('on')));
await page.click('.nv-nd.r'); await page.waitForTimeout(1500);
console.log('→', await page.evaluate(() => location.pathname));
await page.click('.nv-nd.l'); await page.waitForTimeout(1500);
console.log('←', await page.evaluate(() => location.pathname));
console.log('erreurs', errs.slice(0, 5));
await browser.close(); server.httpServer.close();
