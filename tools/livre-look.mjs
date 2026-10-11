// Planche d'essai du livre en direct : repos, deux instants de la respiration, téléphone penché (droite, gauche +
// haut), et en grand (3000 × 3900) pour regarder la tranche de près.
// node tools/livre-look.mjs [dossier]  →  livre-0.jpg, livre-7.jpg, livre-13.jpg, livre-tranche.jpg
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
const OUT = process.argv[2] || '.';
const PORT = 5202;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 1300 } });
page.setDefaultTimeout(300000);
page.on('pageerror', e => console.error('page', e));
page.on('console', m => { if (m.type() === 'error') console.error('console', m.text()); });
await page.goto(`http://localhost:${PORT}/livre-rendu.html`);
await page.waitForFunction(() => window.__livre && window.__livre.ready);
for (const t of [0, 7, 13]) {
  const url = await page.evaluate(t => window.__livre.render(1000, 1300, t), t);
  writeFileSync(`${OUT}/livre-${t}.jpg`, Buffer.from(url.split(',')[1], 'base64'));
}
for (const [n, tl] of [['penche-d', { x: 1, y: 0 }], ['penche-g', { x: -0.8, y: 0.5 }]]) {
  const url = await page.evaluate(([tl]) => window.__livre.render(1000, 1300, 0, tl), [tl]);
  writeFileSync(`${OUT}/livre-${n}.jpg`, Buffer.from(url.split(',')[1], 'base64'));
}
const big = await page.evaluate(() => window.__livre.render(3000, 3900, 0));
writeFileSync(`${OUT}/livre-big.jpg`, Buffer.from(big.split(',')[1], 'base64'));
console.log('ok');
await browser.close(); await server.close();
