// Tour (17/10) : les étapes de la vitrine (points 1, 2, 3), sur téléphone. node tools/tour-etapes.mjs [port] → captures/tour/e-*.png
import { chromium } from 'playwright';
const PORT = process.argv[2] || 5195, dir = 'captures/tour';
const browser = await chromium.launch({ headless: true, channel: 'msedge', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
page.on('pageerror', e => console.log('ERR', String(e)));
await page.goto(`http://localhost:${PORT}/?envoi=0&paiement=faux&seed=3`); await page.waitForTimeout(6000);
await page.mouse.click(195, 422); await page.keyboard.type('CLEMENCE', { delay: 90 }); await page.keyboard.press('Enter');
await page.waitForFunction(() => document.querySelector('#offre.bar-on'), null, { timeout: 90000 }); await page.waitForTimeout(3500);
await page.screenshot({ path: `${dir}/e-0.png` });
console.log(await page.evaluate(() => Object.keys(window.__sg?.cards?.vitrine || {})));
for (const k of [1, 2, 3]) {
  await page.evaluate(k => window.__sg.cards.vitrine.jump(k), k); await page.waitForTimeout(2500); await page.screenshot({ path: `${dir}/e-${k}.png` });
}
await page.evaluate(() => window.__sg.cards.vitrine.jump(1)); await page.waitForTimeout(2000);
console.log('look', await page.evaluate(() => window.__sg.cards.vitrine.look(true))); await page.waitForTimeout(3000); await page.screenshot({ path: `${dir}/e-zoom.png` });
await browser.close();
