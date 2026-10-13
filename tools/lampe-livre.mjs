// Lumière du livre (13/10) : variantes de lampe (window.__lamp = { kf, calm, az }) à t = 0, 6, 12, 18 s.
// V='{"nom":{"kf":1.25,"calm":false}}' node tools/lampe-livre.mjs <dossier>
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
const OUT = process.argv[2];
const server = await createServer({ server: { port: 5207, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 400, height: 860 } });
page.setDefaultTimeout(300000);
await page.goto(`http://localhost:5207/livre-rendu.html`);
await page.waitForFunction(() => window.__livre && window.__livre.ready);
const V = JSON.parse(process.env.V);
for (const [name, lx] of Object.entries(V)) for (const t of [0, 6, 12, 18]) {
  const url = await page.evaluate(([lx, t]) => { window.__lamp = lx; return window.__livre.render(390, 844, t, { x: 0, y: 0 }, 0, { x: 0, y: 0 }); }, [lx, t]);
  writeFileSync(`${OUT}/${name}-${t}.jpg`, Buffer.from(url.split(',')[1], 'base64'));
}
console.log('ok'); await browser.close(); await server.close();
