// Mode test : avant TERMINER, le prix de l'original et les retours ; ils partent avec la demande (beta).
// Essai sans adresse (?adresse=0, l'enveloppe part seule) : node tools/beta-check.mjs → captures/beta.png
import { createServer } from 'vite';
import { chromium } from 'playwright';
const PORT = 5198;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; page.on('pageerror', e => errs.push(String(e)));
await page.goto(`http://localhost:${PORT}/scene-cartes.html?prenom=LEA&seed=3&reponse=la%20mer%20en%20hiver&adresse=0&envoi=0`);
await page.waitForFunction(() => window.__scene && window.__scene.ready);
await page.waitForTimeout(800);
await page.evaluate(() => addEventListener('singulies:address', e => { window.__sent = e.detail; }));
await page.evaluate(async () => { await window.__toSheet(); });
const shown = await page.evaluate(async () => { const m = window.__scene; for (let i = 0; i < 120 && !document.querySelector('.sc-ask'); i++) m.advance(0.5); return !!document.querySelector('.sc-ask'); });
await page.evaluate(() => window.__scene.manual(false));
await page.waitForTimeout(1600);
await page.screenshot({ path: 'captures/beta.png' });
await page.fill('.sc-ask input >> nth=0', '40 €');
await page.fill('.sc-ask input >> nth=1', 'très beau');
await page.click('.sc-ask .sc-pass');
await page.waitForTimeout(300);
const sent = await page.evaluate(() => window.__sent && { beta: window.__sent.beta, test: window.__sent.test });
console.log(JSON.stringify({ shown, sent, errs }));
await browser.close(); await server.close();
