// Un poème par mois : du dernier point au premier — la lumière doit rester continue. node tools/lettre-wrap.mjs → captures/tour/w-*.png + luminance
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('ERR', String(e)));
await page.goto('http://localhost:5195/lettre.html?envoi=0'); await page.waitForTimeout(8000);
await page.evaluate(() => window.__lettre.setStep(3)); await page.waitForTimeout(9000);
await page.screenshot({ path: 'captures/tour/w-0.png' });
await page.mouse.move(300, 380); await page.mouse.down(); await page.mouse.move(60, 380, { steps: 6 }); await page.mouse.up();
const t0 = Date.now();
for (const ms of [100, 400, 800, 1200, 1700, 2300, 3200]) { await page.waitForTimeout(Math.max(0, ms - (Date.now() - t0))); await page.screenshot({ path: `captures/tour/w-${ms}.png` }); }
await browser.close();
