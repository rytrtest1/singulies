// Toucher une carte du portail (09/10) : on entre dans la carte du poème ; le paquet du jeu s'enfonce dans le fond.
// node tools/portal-leave.mjs → captures/portail-depart/*.png
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const PORT = 5185;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
mkdirSync('captures/portail-depart', { recursive: true });
for (const [tag, vp] of [['tel', { width: 390, height: 844 }], ['pc', { width: 1280, height: 800 }]]) {
  for (const id of ['poeme', 'jeu']) {
    const page = await browser.newPage({ viewport: vp });
    const errs = []; page.on('pageerror', e => errs.push(String(e)));
    await page.goto(`http://localhost:${PORT}/?envoi=0`);
    await page.waitForFunction(() => window.__sg?.portal?.readyFired, null, { timeout: 120000 });
    await page.waitForTimeout(6000);                    // (le paquet ne répond qu'une fois la donne finie)
    await page.evaluate(i => window.__sg.portal.choose(i), id);
    for (const ms of [250, 550, 850, 1150, 1700]) { await page.waitForTimeout(ms === 250 ? 250 : ms === 1700 ? 550 : 300); await page.screenshot({ path: `captures/portail-depart/${tag}-${id}-${ms}.png` }); }
    if (errs.length) console.log(tag, id, errs);
    await page.close();
  }
}
await browser.close(); await server.close();
