// La flèche du bas : où se pose la section d'après. node tools/fleche-check.mjs [pc] → captures/tour/fl-*.png
import { chromium } from 'playwright';
const PC = process.argv[2] === 'pc', PORT = 5195;
const browser = await chromium.launch({ headless: true, channel: 'msedge', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const vp = PC ? { width: 1440, height: 900 } : { width: 390, height: 844 };
const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('ERR', String(e)));
await page.goto(`http://localhost:${PORT}/?envoi=0&paiement=faux&seed=3`); await page.waitForTimeout(6000);
await page.mouse.click(vp.width / 2, vp.height / 2); await page.keyboard.type('CLEMENCE', { delay: 90 }); await page.keyboard.press('Enter');
await page.waitForFunction(() => document.querySelector('#offre.bar-on'), null, { timeout: 90000 }); await page.waitForTimeout(8000);
await page.click('.of-down', { force: true }); await page.waitForTimeout(2500);
console.log(await page.evaluate(() => { const e = document.querySelector('.of-ex'), t = document.querySelector('.of-ex-t'); return { secTop: Math.round(e.getBoundingClientRect().top), titleTop: Math.round(t.getBoundingClientRect().top) }; }));
await page.screenshot({ path: `captures/tour/${PC ? 'pc-' : ''}fl.png` });
await browser.close();
