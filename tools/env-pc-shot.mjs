// Enveloppe sur ordinateur : le cachet de près (rabat fermé), le dos retourné, l'adresse tamponnée.
// node tools/env-pc-shot.mjs → captures/enveloppe/pc-*.png
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const PORT = 5195, SPEED = 1.45, dir = 'captures/enveloppe';
mkdirSync(dir, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
let pt = 0;
const pc = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
pc.on('pageerror', e => console.error('page', e));
await pc.goto(`http://localhost:${PORT}/scene-cartes.html?prenom=LEA&seed=5&reponse=bonjour%20toi&envoi=0`);
await pc.waitForFunction(() => window.__scene && window.__scene.ready, null, { timeout: 120000 });
await sleep(800);
await pc.evaluate(async () => { await window.__toSheet(); window.__at(30); window.__scene.sheet.showOrders(); });
let e2 = 0;
for (const e of [6.5, 9]) { await pc.evaluate(d => window.__scene.advance(d), (e - e2) / SPEED); e2 = e; await pc.screenshot({ path: `${dir}/pc-env-${e}.png` }); }
await pc.evaluate(() => { const sh = window.__scene.sheet; sh.setFields({ nom: 'Léa Martin', rue: '3 rue Haute', ville: 'Paris', cp: '75011' }); window.__scene.advance(0.3); sh.post(window.__scene.now()); });
pt = 0;
for (const p of [1.2, 2.5, 3.3]) { await pc.evaluate(d => window.__scene.advance(d), p - pt); pt = p; await pc.screenshot({ path: `${dir}/pc-post-${p}.png` }); }
await browser.close(); await server.close();
