// (20/10) le saut de la carte du dessus sur le paquet (carte vierge d'abord) : images rapprochées, une toutes les 60 ms.   node tools/hop-shot.mjs [port]
import { chromium } from 'playwright';
import { mkdirSync, rmSync } from 'fs';
const PORT = +(process.argv.find(a => /^\d{4}$/.test(a)) || 5195), dir = 'captures/hop';
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'msedge', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const vp = { width: 390, height: 844 };
const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 2 });
await page.goto(`http://localhost:${PORT}/?envoi=0&seed=3`); await page.waitForTimeout(5000);
await page.mouse.click(vp.width / 2, vp.height / 2); await page.keyboard.type('LEA', { delay: 90 }); await page.keyboard.press('Enter');
await page.waitForFunction(() => document.querySelector('#offre.on.bar-on'), null, { timeout: 120000 }); await page.waitForTimeout(800);
await page.click('.of-bar .of-go'); await page.waitForTimeout(900);
if (await page.$('.mc [data-for]')) await page.click('.mc [data-for="moi"]');
await page.waitForFunction(() => window.__sg.cardsApi?.scene?.state().bf, null, { timeout: 90000 });
const m = await page.evaluate(() => window.__sg.cardsApi.scene.marks());
const clip = { x: 20, y: Math.round(m.deckTop) - 30, width: 350, height: Math.round(m.deckBot - m.deckTop) + 60 };
await page.waitForTimeout(3000);
for (let i = 0; i < 60; i++) { await page.screenshot({ path: `${dir}/${String(i).padStart(2, '0')}.png`, clip }); await page.waitForTimeout(60); }
await browser.close();
