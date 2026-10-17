// Tour (17/10) : un poème par mois, les étapes (lumière continue). node tools/tour-lettre.mjs [port] → captures/tour/l-*.png
import { chromium } from 'playwright';
const PORT = process.argv[2] || 5195, dir = 'captures/tour';
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('ERR', String(e)));
await page.goto(`http://localhost:${PORT}/lettre.html?envoi=0`); await page.waitForTimeout(8000);
await page.screenshot({ path: `${dir}/l-0.png` });
for (const k of [1, 2]) { await page.click(`.lt-dot[data-k="${k}"]`, { force: true }); for (const ms of [1500, 4000]) { await page.waitForTimeout(ms); await page.screenshot({ path: `${dir}/l-${k}-${ms}.png` }); } }
await browser.close();
