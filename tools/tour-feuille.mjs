// Tour (17/10) : l'entrée de la feuille (menu, mains, mécanisme), puis la suite en défilant.
// node tools/tour-feuille.mjs [pc] [port] → captures/tour/f-*.png
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const PC = process.argv[2] === 'pc', PORT = process.argv[3] || 5195, dir = 'captures/tour';
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'msedge', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const vp = PC ? { width: 1440, height: 900 } : { width: 390, height: 844 };
const page = await browser.newPage({ viewport: vp, deviceScaleFactor: PC ? 1 : 2 });
const tag = PC ? 'pc-' : '';
const shot = n => page.screenshot({ path: `${dir}/${tag}f-${n}.png` });
page.on('pageerror', e => console.log('ERR', String(e)));
await page.goto(`http://localhost:${PORT}/?envoi=0&paiement=faux&seed=3`);
await page.waitForTimeout(6000);
await page.mouse.click(vp.width / 2, vp.height / 2); await page.keyboard.type('CLEMENCE', { delay: 100 }); await page.keyboard.press('Enter');
await page.waitForFunction(() => document.querySelector('#offre.txt-on'), null, { timeout: 90000 }).catch(() => console.log('pas de txt-on'));
const st = () => page.evaluate(() => { const v = document.querySelector('.of-mv'); return { nav: document.querySelector('.nv')?.classList.contains('on'), vidOn: document.querySelector('.of-mvw')?.classList.contains('on'), t: v && +v.currentTime.toFixed(2), paused: v && v.paused, rate: v && v.playbackRate }; });
for (const [n, ms] of [['0', 150], ['1', 700], ['2', 1300], ['3', 3000], ['4', 5000]]) { await page.waitForTimeout(n === '0' ? ms : ms - [150, 700, 1300, 3000, 5000][+n - 1]); console.log(n, JSON.stringify(await st())); await shot(n); }
await page.evaluate(() => document.getElementById('offre').scrollTo({ top: 99999 })); await page.waitForTimeout(1500); await shot('bas');
await page.evaluate(() => { const r = document.getElementById('offre'); const e = r.querySelector('.of-ex'); r.scrollTo({ top: r.scrollTop + e.getBoundingClientRect().top - 120 }); }); await page.waitForTimeout(1500); console.log('past', JSON.stringify(await st())); await shot('autres');
await browser.close();
