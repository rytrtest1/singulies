// Glisser la question vers la droite : la précédente revient un peu du bord gauche, avec le doigt (09/10).
// node tools/peek-shot.mjs → captures/peek/*.png
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const PORT = 5187;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
mkdirSync('captures/peek', { recursive: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; page.on('pageerror', e => errs.push(String(e)));
await page.goto(`http://localhost:${PORT}/scene-cartes.html?prenom=LEA&seed=3&envoi=0`);
await page.waitForFunction(() => window.__scene && window.__scene.ready);
await page.waitForTimeout(3500);
await page.evaluate(() => { const m = window.__scene, s = m.scene; s.drag(-220); s.release(-220, 0, m.now()); });
await page.waitForTimeout(3500);
for (const dx of [40, 90, 140]) { await page.evaluate(d => window.__scene.scene.drag(d), dx); await page.waitForTimeout(500); await page.screenshot({ path: `captures/peek/drag-${dx}.png` }); }
await page.evaluate(() => { const m = window.__scene; m.scene.release(200, 0, m.now()); });
await page.waitForTimeout(250); await page.screenshot({ path: 'captures/peek/retour.png' });
await page.waitForTimeout(1500); await page.screenshot({ path: 'captures/peek/revenue.png' });
console.log(JSON.stringify({ errs }));
await browser.close(); await server.close();
