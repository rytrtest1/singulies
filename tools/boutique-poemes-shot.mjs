// Les poèmes d'exemple de la boutique : la feuille seule, sans carte, le poème centré, vue presque de face
// (exemples-rendu.html, mode solo) → public/boutique/poeme-<prénom>.jpg      node tools/boutique-poemes-shot.mjs
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
const PORT = 5211;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1350, height: 1860 } });
page.setDefaultTimeout(300000);
page.on('pageerror', e => console.error('page', e));
page.on('console', m => { if (m.type() === 'error') console.error('console', m.text()); });
await page.goto(`http://localhost:${PORT}/exemples-rendu.html`);
await page.waitForFunction(() => window.__exemples && window.__exemples.ready);
mkdirSync('public/boutique', { recursive: true });
for (const { name, url } of await page.evaluate(() => window.__exemples.solo())) {
  writeFileSync(`public/boutique/poeme-${name}.jpg`, Buffer.from(url.split(',')[1], 'base64'));
  console.log('ok', name);
}
await browser.close(); await server.close();
