// Lecteur d'écran (09/10) : le champ de réponse porte la question tirée, et ce qui est annoncé. node tools/sr-check.mjs
import { createServer } from 'vite';
import { chromium } from 'playwright';
const PORT = 5193;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on('pageerror', e => console.error('page', e));
await page.goto(`http://localhost:${PORT}/scene-cartes.html?prenom=LEA&seed=3&envoi=0`);
await page.waitForFunction(() => window.__scene && window.__scene.ready);
await page.waitForTimeout(4000);
console.log(await page.evaluate(() => ({ label: document.querySelector('.sc-answer').getAttribute('aria-label'), dit: document.querySelector('.sc-sr').textContent })));
await browser.close(); await server.close();
