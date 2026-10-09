// Les réglages de l'adresse (?test=1…) survivent au passage portail → poème (l'adresse devient /poeme).
// node tools/param-check.mjs
import { createServer } from 'vite';
import { chromium } from 'playwright';
const PORT = 5199;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; page.on('pageerror', e => errs.push(String(e)));
await page.goto(`http://localhost:${PORT}/?test=1&envoi=0`);
await page.waitForFunction(() => window.__sg?.portal?.readyFired, null, { timeout: 120000 });
await page.waitForTimeout(5600);
await page.evaluate(() => window.__sg.portal.choose('poeme'));
await page.waitForTimeout(2500);
console.log(JSON.stringify({ url: page.url(), errs }));
await browser.close(); await server.close();
