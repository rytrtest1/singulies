// Les vignettes de partage (Open Graph : iMessage, WhatsApp, messages Instagram), une par page, rendues par le vrai
// moteur (email-assets.html → vignettes()) : public/og.jpg (accueil), og-poeme.jpg, og-jeu.jpg. node tools/og-image.mjs
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
page.on('console', m => { if (m.type() === 'error') console.error('console', m.text()); });
await page.goto(`http://localhost:${PORT}/email-assets.html`);
await page.waitForFunction(() => window.__assets && window.__assets.ready);
for (const [name, url] of await page.evaluate(() => window.__assets.vignettes())) writeFileSync('public/' + name, Buffer.from(url.split(',')[1], 'base64'));
await browser.close(); await server.close();
