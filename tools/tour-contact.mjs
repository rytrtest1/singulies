// Tour (17/10) : la carte de contact en 3D, on y écrit. node tools/tour-contact.mjs [port] → captures/tour/c-*.png
import { chromium } from 'playwright';
const PORT = process.argv[2] || 5195, dir = 'captures/tour';
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
page.on('pageerror', e => console.log('ERR', String(e)));
await page.goto(`http://localhost:${PORT}/livres.html?envoi=0`); await page.waitForTimeout(8000);
await page.click('.nv-mn', { force: true }); await page.waitForTimeout(700);
await page.click('.nv-pan [data-x="contact"]', { force: true }); await page.waitForTimeout(2500);
await page.mouse.click(195, 330); await page.waitForTimeout(500);
await page.keyboard.type('bonjour eternel, ton site est une belle surprise. je voulais te dire merci pour les poemes.', { delay: 25 });
await page.waitForTimeout(1200); await page.screenshot({ path: `${dir}/c-ecrit.png` });
await browser.close();
