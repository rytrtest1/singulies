// Les vignettes de la grille : de vraies captures des objets EN DIRECT de la galerie (même moteur, même lumière) —
// les deux livres. → public/boutique/{livre-recueil,livre-journal}.jpg
// node tools/boutique-vignettes.mjs      (rendu GPU ; ordinateur 1440×900, ×2)
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const PORT = 5212;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
page.setDefaultTimeout(120000);
page.on('pageerror', e => console.error('page', e));
await page.addInitScript(() => { addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = '.gal-nav { display: none !important; }'; document.head.appendChild(st); }); });
mkdirSync('public/boutique', { recursive: true });
const base = `http://localhost:${PORT}/boutique.html?envoi=0`;
const snap = async name => {
  const b = await (await page.$('.gal-stage')).boundingBox();
  await page.screenshot({ path: `public/boutique/${name}.jpg`, type: 'jpeg', quality: 90, clip: { x: b.x + 2, y: b.y + 2, width: b.width - 4, height: b.height - 4 } });
  console.log('ok', name);
};
await page.goto(base + '#/produit/livres');
await page.waitForSelector('.gal-live.on'); await page.waitForTimeout(2500);
await snap('livre-recueil');
await page.click('.var[data-v="1"]'); await page.waitForTimeout(3500);
await snap('livre-journal');
await browser.close(); await server.close();
