// Ouvre une page, attend, rend les erreurs de la console. node tools/console-check.mjs "scene-cartes.html?prenom=LEA" [ms]
import { createServer } from 'vite';
import { chromium } from 'playwright';
const PORT = 5196;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text().slice(0, 600)); });
await page.goto(`http://localhost:${PORT}/${process.argv[2] || ''}`);
await page.waitForTimeout(+(process.argv[3] || 6000));
console.log(JSON.stringify(errs, null, 1));
await browser.close(); await server.close();
