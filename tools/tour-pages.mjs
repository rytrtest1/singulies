// Tour du site (17/10) : pages livres, un poème par mois, menu, étapes de la vitrine.
// node tools/tour-pages.mjs [pc] [port] → captures/tour/*.png
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const PC = process.argv[2] === 'pc', PORT = process.argv[3] || 5195, dir = 'captures/tour';
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const vp = PC ? { width: 1440, height: 900 } : { width: 390, height: 844 };
const page = await browser.newPage({ viewport: vp, deviceScaleFactor: PC ? 1 : 2 });
const tag = PC ? 'pc-' : '';
const shot = n => page.screenshot({ path: `${dir}/${tag}${n}.png` });
page.on('pageerror', e => console.log('ERR', String(e)));
for (const [n, u] of [['livres', 'livres.html'], ['lettre', 'lettre.html']]) {
  await page.goto(`http://localhost:${PORT}/${u}?envoi=0`);
  await page.waitForTimeout(9000); await shot('p-' + n);
}
await page.click('.nv-mn', { force: true }); await page.waitForTimeout(900); await shot('p-menu');
await page.keyboard.press('Escape'); await page.waitForTimeout(600);
await page.goto(`http://localhost:${PORT}/livres.html?envoi=0`); await page.waitForTimeout(9000);
await page.mouse.click(vp.width / 2, vp.height * 0.45); await page.waitForTimeout(3500); await shot('p-livre-ouvert');
await browser.close();
