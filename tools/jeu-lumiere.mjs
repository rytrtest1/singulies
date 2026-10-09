// Relais portail → jeu : la lumière ne doit pas sauter. Image juste avant le toucher, puis la page du jeu figée au
// tout début du relais (son horloge arrêtée), même zone : écart de clarté. node tools/jeu-lumiere.mjs
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const PORT = 5186;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
mkdirSync('captures/jeu-relais', { recursive: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; page.on('pageerror', e => errs.push(String(e)));
await page.goto(`http://localhost:${PORT}/?envoi=0`);
await page.waitForFunction(() => window.__sg?.portal?.readyFired, null, { timeout: 120000 });
await page.waitForTimeout(9000);
await page.screenshot({ path: 'captures/jeu-relais/lum-avant.png' });
// la page du jeu : horloge figée juste après le départ
await page.evaluate(() => window.__sg.portal.choose('jeu'));
await page.waitForFunction(() => window.__jeu && window.__jeu.scene.relaying());
for (const k of [1, 2, 3]) { await page.screenshot({ path: `captures/jeu-relais/lum-apres${k}.png` }); }
console.log('relais', await page.evaluate(() => window.__jeu.scene.relaying()));
console.log(JSON.stringify({ errs }));
await browser.close(); await server.close();
