// Portail → jeu : la carte du dessus se retourne sur la première question, sans fondu ; retour : le portail se
// rembobine (jamais le champ de prénoms). node tools/jeu-relais.mjs → captures/jeu-relais/ (planche.png)
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const PORT = 5184;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
mkdirSync('captures/jeu-relais', { recursive: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; page.on('pageerror', e => errs.push(String(e)));
await page.goto(`http://localhost:${PORT}/?envoi=0`);
await page.waitForFunction(() => window.__sg?.portal?.readyFired, null, { timeout: 120000 });
await page.waitForTimeout(9000);
await page.evaluate(() => window.__sg.portal.choose('jeu'));
const shots = [];
const t0 = Date.now();
for (const ms of [100, 300, 500, 700, 900, 1200, 2400]) { await page.waitForTimeout(Math.max(0, ms - (Date.now() - t0))); const f = `aller-${ms}.png`; await page.screenshot({ path: 'captures/jeu-relais/' + f }); shots.push(f); }
await page.waitForTimeout(5000);
const share = await page.evaluate(() => { const b = document.querySelector('#jeu .jeu-share'); return b && { on: b.classList.contains('on'), top: b.style.top }; });
await page.click('#jeu .jeu-back');
const t1 = Date.now();
for (const ms of [100, 300, 600, 900, 1300, 2200]) { await page.waitForTimeout(Math.max(0, ms - (Date.now() - t1))); const f = `retour-${ms}.png`; await page.screenshot({ path: 'captures/jeu-relais/' + f }); shots.push(f); }
console.log(JSON.stringify({ share, state: await page.evaluate(() => window.__sg.portal.state()), errs }));
await browser.close(); await server.close();
