// Le livre tourné à la main (12/10) : une planche de rotations (on y voit la tranche, le dos, la lumière qui glisse).
// node tools/livre-spin.mjs <dossier> [p]  →  spin-<angle>.jpg
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
const OUT = process.argv[2] || '.', P = +(process.argv[3] || 0);
const PORT = 5203;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 400, height: 860 } });
page.setDefaultTimeout(300000);
page.on('pageerror', e => console.error('page', e));
await page.goto(`http://localhost:${PORT}/livre-rendu.html`);
await page.waitForFunction(() => window.__livre && window.__livre.ready);
const list = (process.env.SPINS || '0,0.5,1,1.4,1.7,2.2,3.1,-0.6,-1.3').split(',').map(Number);
for (const a of list) for (const t of (process.env.TS || '0').split(',').map(Number)) {
  const url = await page.evaluate(([a, t, P, x]) => window.__livre.render(390, 844, t, { x: 0, y: 0 }, P, { x, y: a }), [a, t, P, +(process.env.SX || 0)]);
  writeFileSync(`${OUT}/spin-${a}-${t}.jpg`, Buffer.from(url.split(',')[1], 'base64'));
}
console.log('ok');
await browser.close(); await server.close();
