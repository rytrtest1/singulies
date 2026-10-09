// Les trois versions basiques, en entier (pleine page), téléphone et ordinateur, avec un prénom tapé.
// node tools/basique-shot.mjs → captures/basique/<page>-<tel|pc>.png (+ la commande ouverte pour la boutique)
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const PORT = 5193;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true });
const dir = 'captures/basique';
mkdirSync(dir, { recursive: true });
const errs = [];
for (const [dev, opt] of [['tel', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true }], ['pc', { viewport: { width: 1280, height: 800 } }]]) {
  const ctx = await browser.newContext({ ...opt, reducedMotion: 'reduce' });
  for (const p of ['boutique', 'artiste', 'formulaire']) {
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errs.push(p + ': ' + e));
    await page.goto(`http://localhost:${PORT}/basique-${p}.html`);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${dir}/${p}-${dev}-1-ouverture.png` });
    await page.fill('#name', 'Clémence');
    if (p === 'boutique') await page.click('#order');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${dir}/${p}-${dev}-2-entiere.png`, fullPage: true });
    await page.close();
  }
  await ctx.close();
}
await browser.close();
await server.close();
console.log(errs.length ? errs.join('\n') : 'ok, aucune erreur');
