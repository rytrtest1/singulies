// L'écran de fin (remerciements) : rendu direct. node tools/fin-shot.mjs [pc] [reserve|paye] → captures/fin/*.png
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const PC = process.argv[2] === 'pc', MODE = process.argv[3] === 'paye' ? 'paye' : 'reserve', dir = 'captures/fin';
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'msedge', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const vp = PC ? { width: 1440, height: 900 } : { width: 390, height: 844 };
const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 2 });
page.on('pageerror', e => console.log('ERR', String(e)));
page.on('console', m => { if (m.type() === 'error') console.log('console', m.text().slice(0, 200)); });
await page.goto('http://localhost:5195/?envoi=0&seed=3'); await page.waitForTimeout(5000);
await page.evaluate(async mode => { const m = await import('/src/alt/fin.js'); window.__fin = m.finalScreen({ name: 'CLEMENCE ROSE', ref: 'SG-4F7K2', reserve: mode === 'reserve' }, './'); }, MODE);
for (const ms of [800, 2500, 5000, 9000]) { await page.waitForTimeout(ms === 800 ? 800 : ms - [800, 2500, 5000, 9000][[800, 2500, 5000, 9000].indexOf(ms) - 1]); await page.screenshot({ path: `${dir}/${PC ? 'pc-' : ''}${MODE}-${ms}.png` }); }
// le paquet : le relais vers le jeu (la carte se retourne sur une question, au centre), puis le retour
const b = await page.evaluate(() => { const r = document.querySelector('.mc-deck').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
await page.waitForTimeout(1500); await page.mouse.click(b.x, b.y); await page.waitForTimeout(1200); await page.screenshot({ path: `${dir}/${PC ? 'pc-' : ''}${MODE}-relais-1.png` });
await page.waitForTimeout(2500); await page.screenshot({ path: `${dir}/${PC ? 'pc-' : ''}${MODE}-relais-2.png` });
await page.click('.nv-bk', { force: true }); await page.waitForTimeout(2500); await page.screenshot({ path: `${dir}/${PC ? 'pc-' : ''}${MODE}-relais-retour.png` });
await browser.close();
