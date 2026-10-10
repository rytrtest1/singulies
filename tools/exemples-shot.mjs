// Les poèmes d'exemple de alt.html (src/alt/exemples.js), rendus par le vrai moteur (exemples-rendu.html) :
// public/exemples/<prénom>.jpg — la feuille, le prénom en relief, les vers tapés, la signature, une carte question.
// node tools/exemples-shot.mjs (après tout changement des poèmes ou du rendu)
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
const PORT = 5197;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 900, height: 1240 } });
page.setDefaultTimeout(300000);
page.on('pageerror', e => console.error('page', e));
page.on('console', m => { if (m.type() === 'error') console.error('console', m.text()); });
await page.goto(`http://localhost:${PORT}/exemples-rendu.html`);
await page.waitForFunction(() => window.__exemples && window.__exemples.ready);
mkdirSync('public/exemples', { recursive: true });
for (const { name, id, url } of await page.evaluate(() => window.__exemples.all())) {
  writeFileSync(`public/exemples/${name}.jpg`, Buffer.from(url.split(',')[1], 'base64'));
  console.log(name, 'question', id);
}
await browser.close(); await server.close();
