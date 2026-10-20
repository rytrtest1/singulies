// (20/10) sens du glissé : à gauche = la suivante (la question part à gauche), à droite = la précédente (elle revient du bord gauche).
// node tools/swipe-sens.mjs [port] → captures/swipe/*.png
import { chromium } from 'playwright';
import { mkdirSync, rmSync } from 'fs';
const PORT = +(process.argv.find(a => /^\d{4}$/.test(a)) || 5195), dir = 'captures/swipe';
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'msedge', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const vp = { width: 390, height: 844 };
const page = await browser.newPage({ viewport: vp });
page.on('pageerror', e => console.log('ERR', String(e)));
let n = 0; const shot = async t => { await page.screenshot({ path: `${dir}/${String(++n).padStart(2, '0')}-${t}.png` }); };
const st = () => page.evaluate(() => { const s = window.__sg.cardsApi.scene.state(); return { mode: s.mode, hasPrev: s.hasPrev, discards: s.discards }; });
await page.goto(`http://localhost:${PORT}/?envoi=0&seed=3`); await page.waitForTimeout(5000);
await page.mouse.click(vp.width / 2, vp.height / 2); await page.keyboard.type('LEA', { delay: 90 }); await page.keyboard.press('Enter');
await page.waitForFunction(() => document.querySelector('#offre.on.bar-on'), null, { timeout: 120000 }); await page.waitForTimeout(800);
await page.click('.of-bar .of-go'); await page.waitForTimeout(900);
if (await page.$('.mc [data-for]')) await page.click('.mc [data-for="moi"]');
await page.waitForFunction(() => window.__sg.cardsApi?.scene?.state().bf, null, { timeout: 90000 });
let m = await page.evaluate(() => window.__sg.cardsApi.scene.marks());
await page.mouse.click(vp.width / 2, (m.deckTop + m.deckBot) / 2); await page.waitForTimeout(4000);
const y = (m.deckTop + m.deckBot) / 2 - 10;
const swipe = async (x0, x1) => { await page.mouse.move(x0, y); await page.mouse.down(); for (let i = 1; i <= 8; i++) { await page.mouse.move(x0 + (x1 - x0) * i / 8, y); await page.waitForTimeout(20); } await page.mouse.up(); };
await swipe(300, 60); console.log('gauche', JSON.stringify(await st())); for (const ms of [150, 250, 300]) { await page.waitForTimeout(ms); await shot('gauche-' + ms); } await page.waitForTimeout(2500);
await swipe(80, 330); console.log('droite', JSON.stringify(await st())); for (const ms of [100, 200, 250, 300]) { await page.waitForTimeout(ms); await shot('droite-' + ms); } await page.waitForTimeout(2000); await shot('fin');
await browser.close();
