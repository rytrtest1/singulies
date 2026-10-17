// La machine au retour au point 1 : mains puis frappes, avec le texte. node tools/machine-back-check.mjs
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, channel: 'msedge', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('ERR', String(e)));
await page.goto('http://localhost:5195/?envoi=0&paiement=faux&seed=3'); await page.waitForTimeout(6000);
await page.mouse.click(195, 422); await page.keyboard.type('CLEMENCE', { delay: 90 }); await page.keyboard.press('Enter');
await page.waitForFunction(() => document.querySelector('#offre.bar-on'), null, { timeout: 90000 }); await page.waitForTimeout(4000);
const st = t => page.evaluate(t => { const v = document.querySelector('.of-mv'); return t + ' ' + JSON.stringify({ t: +v.currentTime.toFixed(2), paused: v.paused, on: document.querySelector('.of-mvw').classList.contains('on'), txt: document.querySelector('.of-vit-t').textContent.slice(0, 40) }); }, t);
console.log(await st('début'));
await page.keyboard.press('ArrowRight'); await page.waitForTimeout(3500); console.log(await st('point 2'));
await page.keyboard.press('ArrowLeft');
for (const ms of [300, 900, 1600, 2400, 3200, 4500]) { await page.waitForTimeout(ms === 300 ? 300 : 0); await page.waitForTimeout(ms === 300 ? 0 : ms - [300, 900, 1600, 2400, 3200, 4500][[300, 900, 1600, 2400, 3200, 4500].indexOf(ms) - 1]); console.log(await st('retour +' + ms)); }
await browser.close();
