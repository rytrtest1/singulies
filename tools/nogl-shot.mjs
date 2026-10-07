// Sans WebGL (vieux téléphone, mémoire) : le prénom s'écrit, puis la suite ne peut pas s'afficher → une porte
// (« écris-moi ton prénom : @e.t.ernel ») plutôt qu'un noir sans issue. node tools/nogl-shot.mjs → captures/fin/nogl.png
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const PORT = 5198;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--disable-3d-apis'] });
mkdirSync('captures/fin', { recursive: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
page.on('pageerror', e => console.error('page', e));
await page.goto(`http://localhost:${PORT}/`);
await page.waitForTimeout(3000);
await page.keyboard.type('LEA'); await page.keyboard.press('Enter');
await page.waitForTimeout(500); await page.keyboard.press('Enter');
await page.waitForTimeout(6000);
console.log(await page.evaluate(() => ({ phase: window.__sg.S.phase, msg: document.getElementById('nocards')?.innerText })));
await page.screenshot({ path: 'captures/fin/nogl.png' });
await browser.close(); await server.close();
