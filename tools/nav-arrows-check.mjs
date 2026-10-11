// Les flèches des pages (12/10) — version figée. alt.html : après l'intro, la flèche de droite paraît et le bandeau
// montre la droite, puis la gauche ; captures en chemin ; puis → (la page suivante) et ← (retour).
// node tools/nav-arrows-check.mjs <dossier de sortie> [pc]
import { build, preview } from 'vite';
import { chromium } from 'playwright';
const SP = process.argv[2] || '.', PC = process.argv[3] === 'pc', OUT = 'C:/Users/maxen/AppData/Local/Temp/claude/nav-arrows-dist', PORT = 5208;
await build({ logLevel: 'error', build: { outDir: OUT, emptyOutDir: true } });
const server = await preview({ build: { outDir: OUT }, preview: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const tag = PC ? 'pc' : 'tel';
const page = await browser.newPage(PC ? { viewport: { width: 1280, height: 800 } } : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(`http://localhost:${PORT}/alt.html?envoi=0`);
const state = () => page.evaluate(() => ({ l: document.querySelector('.nv-ar.l')?.className, r: document.querySelector('.nv-ar.r')?.className, x: document.querySelector('.nv-track')?.style.transform }));
for (const t of [3, 5, 6.5, 8, 9.5, 11, 13]) {
  await page.waitForTimeout(t === 3 ? 3000 : 1500 * (t === 13 ? 4 / 3 : 1));
  await page.screenshot({ path: `${SP}/ar-${tag}-${t}.png`, clip: { x: 0, y: 0, width: PC ? 1280 : 390, height: 60 } });
  console.log(t, JSON.stringify(await state()));
}
await page.click('.nv-ar.r'); await page.waitForTimeout(1500);
console.log('→', await page.evaluate(() => location.pathname), await page.evaluate(() => document.querySelector('.nv-l.cur')?.textContent));
await page.click('.nv-ar.l'); await page.waitForTimeout(1500);
console.log('←', await page.evaluate(() => location.pathname), await page.evaluate(() => document.querySelector('.nv-l.cur')?.textContent));
console.log('erreurs', errs.slice(0, 5));
await browser.close(); server.httpServer.close();
