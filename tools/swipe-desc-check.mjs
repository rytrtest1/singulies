// Glisser sur le texte descriptif change de point (un poème par mois, mes livres, la vitrine du poème). node tools/swipe-desc-check.mjs
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, channel: 'msedge', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('ERR', String(e)));
const drag = async (y) => { await page.mouse.move(300, y); await page.mouse.down(); await page.mouse.move(60, y, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(1500); };
for (const [n, u] of [['lettre', 'lettre.html'], ['livres', 'livres.html']]) {
  await page.goto(`http://localhost:5195/${u}?envoi=0`); await page.waitForTimeout(8000);
  const y = await page.evaluate(() => { const r = document.querySelector('.lt-cap-t').getBoundingClientRect(); return Math.round(r.top + r.height / 2); });
  const k0 = await page.evaluate(() => window.__lettre ? window.__lettre.step : null);
  await drag(y);
  console.log(n, 'description y=', y, 'point actif:', await page.evaluate(() => [...document.querySelectorAll('.lt-dot')].findIndex(b => b.classList.contains('on'))));
}
await page.goto('http://localhost:5195/?envoi=0&paiement=faux&seed=3'); await page.waitForTimeout(6000);
await page.mouse.click(195, 422); await page.keyboard.type('CLEMENCE', { delay: 90 }); await page.keyboard.press('Enter');
await page.waitForFunction(() => document.querySelector('#offre.bar-on'), null, { timeout: 90000 }); await page.waitForTimeout(5000);
const y = await page.evaluate(() => { const r = document.querySelector('.of-vit-t').getBoundingClientRect(); return Math.round(r.top + r.height / 2); });
await drag(y);
console.log('poème description y=', y, 'point actif:', await page.evaluate(() => [...document.querySelectorAll('.of-dot')].findIndex(b => b.classList.contains('on'))));
await browser.close();
