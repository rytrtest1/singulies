// Images de la version simple (09/10 : le site sans WebGL chez le visiteur), rendues une fois par le vrai moteur
// (email-assets.html → simple()) : public/simple/*.jpg. node tools/simple-assets.mjs
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
const PORT = 5197;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1100, height: 1200 } });
page.setDefaultTimeout(600000);
page.on('pageerror', e => console.error('page', e));
page.on('console', m => { if (m.type() === 'error') console.error('console', m.text()); });
await page.goto(`http://localhost:${PORT}/email-assets.html`);
await page.waitForFunction(() => window.__assets && window.__assets.ready);
mkdirSync('public/simple', { recursive: true });
const out = await page.evaluate(() => window.__assets.simple());
for (const [name, url] of out) writeFileSync('public/simple/' + name, Buffer.from(url.split(',')[1], 'base64'));
console.log(out.map(o => o[0]).join(' '));
await browser.close(); await server.close();
