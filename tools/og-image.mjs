// Image d'aperçu du lien (Open Graph : iMessage, WhatsApp, messages Instagram) : ETERNEL et la première carte,
// « ton prénom, ton poème », rendus par le vrai moteur (email-assets.html). node tools/og-image.mjs → public/og.jpg
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const PORT = 5196;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1300, height: 700 } });
page.setDefaultTimeout(300000);
page.on('pageerror', e => console.error('page', e));
await page.goto(`http://localhost:${PORT}/email-assets.html`);
await page.waitForFunction(() => window.__assets && window.__assets.ready);
const url = await page.evaluate(() => window.__assets.og());
writeFileSync('public/og.jpg', Buffer.from(url.split(',')[1], 'base64'));
await browser.close(); await server.close();
