// Tour (17/10) : les pages du menu (A PROPOS, CONTACT, SINGULIES). node tools/tour-menu.mjs [pc] [port] → captures/tour/m-*.png
import { chromium } from 'playwright';
const PC = process.argv[2] === 'pc', PORT = process.argv[3] || 5195, dir = 'captures/tour';
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const vp = PC ? { width: 1440, height: 900 } : { width: 390, height: 844 };
const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('ERR', String(e)));
const tag = PC ? 'pc-' : '';
await page.goto(`http://localhost:${PORT}/livres.html?envoi=0`); await page.waitForTimeout(8000);
for (const x of ['auteur', 'contact', 'singulies']) {
  await page.click('.nv-mn', { force: true }); await page.waitForTimeout(700);
  await page.click(`.nv-pan [data-x="${x}"]`, { force: true }); await page.waitForTimeout(2500);
  await page.screenshot({ path: `${dir}/${tag}m-${x}.png` });
  await page.keyboard.press('Escape'); await page.waitForTimeout(700);
}
await browser.close();
