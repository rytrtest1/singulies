// Le livre d'Eternel en 3D, rendu par le vrai moteur (livre-rendu.html) → public/livres/livre.jpg
// node tools/livre-shot.mjs (après tout changement de la couverture ou du rendu)
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
const PORT = 5201;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 1300 } });
page.setDefaultTimeout(300000);
page.on('pageerror', e => console.error('page', e));
page.on('console', m => { if (m.type() === 'error') console.error('console', m.text()); });
await page.goto(`http://localhost:${PORT}/livre-rendu.html`);
await page.waitForFunction(() => window.__livre && window.__livre.ready);
const url = await page.evaluate(() => window.__livre.render());
writeFileSync('public/livres/livre.jpg', Buffer.from(url.split(',')[1], 'base64'));
console.log('ok public/livres/livre.jpg');
await browser.close(); await server.close();
