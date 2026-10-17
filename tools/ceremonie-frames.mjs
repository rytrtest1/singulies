// Après la réservation : le mélange (téléphone : à la verticale), « tire une carte », le prénom, le haut ; puis la carte tirée et PASSER
// (la carte se retourne en place). node tools/ceremonie-frames.mjs [pc] → captures/cer/*.png
import { chromium } from 'playwright';
import { mkdirSync, rmSync } from 'fs';
const PC = process.argv[2] === 'pc', PORT = 5195, dir = 'captures/cer';
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'msedge', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const vp = PC ? { width: 1440, height: 900 } : { width: 390, height: 844 };
const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('ERR', String(e)));
page.on('console', m => { if (m.type() === 'error') console.log('console', m.text().slice(0, 200)); });
let n = 0; const shot = async t => { await page.screenshot({ path: `${dir}/${String(++n).padStart(2, '0')}-${t}.png` }); };
await page.goto(`http://localhost:${PORT}/?envoi=0&seed=3`); await page.waitForTimeout(5000);
await page.mouse.click(vp.width / 2, vp.height / 2); await page.keyboard.type('LEA', { delay: 90 }); await page.keyboard.press('Enter');
await page.waitForFunction(() => document.querySelector('#offre.on.bar-on'), null, { timeout: 90000 }); await page.waitForTimeout(800);
await page.click('.of-bar .of-go'); await page.waitForTimeout(900);
if (await page.$('.mc [data-for]')) await page.click('.mc [data-for="moi"]');
await page.waitForFunction(() => window.__sg.cardsApi?.scene?.state().shuffling, null, { timeout: 60000 }).catch(() => console.log('pas de mélange'));
await page.waitForTimeout(2500); await shot('melange-a');
console.log('nav', JSON.stringify(await page.evaluate(() => ({ nv: document.querySelector('.nv')?.className, hd: document.querySelector('.nv-hd')?.className, foot: document.querySelector('.nv-foot')?.className, paying: !!document.querySelector('.of.paying, .of.env'), offre: document.getElementById('offre')?.className, navOn: window.__sg?.S?.navOn }))));
for (let i = 0; i < 8; i++) { await page.waitForTimeout(180); await shot('melange-' + i); }
// tirer : le toucher du paquet
await page.mouse.click(vp.width / 2, vp.height * 0.5); await page.waitForTimeout(3500); await shot('carte-tiree');
console.log('état', JSON.stringify(await page.evaluate(() => { const s = window.__sg.cardsApi.scene.state(); return { mode: s.mode, shuffling: s.shuffling, paid: s.paidMode, idle: +s.idle.toFixed(1) }; })));
await page.waitForTimeout(2500);
const pass = await page.$('.sc-pass.on'); console.log('PASSER visible', !!pass);
if (pass) {
  await shot('avant-passer'); await pass.click();
  for (const ms of [200, 450, 700, 1000, 1500, 2200]) { await page.waitForTimeout(ms === 200 ? 200 : 250); await shot('passer-' + ms); }
  await page.waitForTimeout(1500); await shot('carte-blanche');
  console.log('PASSER 2', !!(await page.$('.sc-pass.on')));
  const p2 = await page.$('.sc-pass.on'); if (p2) { await p2.click(); for (const ms of [300, 900, 1800]) { await page.waitForTimeout(ms === 300 ? 300 : 700); await shot('passer2-' + ms); } }
}
await browser.close();
