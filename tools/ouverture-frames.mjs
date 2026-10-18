// Ouverture (18/10) : UN PRENOM / UN POEME d'abord, le champ qui naît du fond vers l'avant, puis le menu. node tools/ouverture-frames.mjs [port] → captures/ouv/*.png
import { chromium } from 'playwright';
const PORT = +(process.argv[2] || 5195);
const browser = await chromium.launch({ headless: true, channel: 'msedge', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('ERR', String(e)));
await page.goto(`http://localhost:${PORT}/?envoi=0&seed=3`);
await page.waitForFunction(() => window.__sg && window.__sg.S.t > 0.01);
for (const t of [0.4, 0.8, 1.2, 1.6, 2.0, 2.4, 3.2]) {
  await page.waitForFunction(x => window.__sg.S.t >= x, t, { timeout: 30000 });
  await page.screenshot({ path: `captures/ouv/${String(t).replace('.', '_')}.png` });
  console.log(t, await page.evaluate(() => ({ t: +window.__sg.S.t.toFixed(2), navOn: !!window.__sg.S.navOn })));
}
await browser.close();
