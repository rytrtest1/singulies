// (20/10) l'ordre d'arrivée des intitulés : « tire une question du jeu » (tapé), puis OU (fondu), puis « exprime-toi librement » (tapé).
import { chromium } from 'playwright';
const PORT = +(process.argv.find(a => /^\d{4}$/.test(a)) || 5195);
const browser = await chromium.launch({ headless: true, channel: 'msedge', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const vp = { width: 390, height: 844 };
const page = await browser.newPage({ viewport: vp });
page.on('pageerror', e => console.log('ERR', String(e)));
await page.goto(`http://localhost:${PORT}/?envoi=0&seed=3`); await page.waitForTimeout(5000);
await page.mouse.click(vp.width / 2, vp.height / 2); await page.keyboard.type('LEA', { delay: 90 }); await page.keyboard.press('Enter');
await page.waitForFunction(() => document.querySelector('#offre.on.bar-on'), null, { timeout: 120000 }); await page.waitForTimeout(800);
await page.click('.of-bar .of-go'); await page.waitForTimeout(900);
if (await page.$('.mc [data-for]')) await page.click('.mc [data-for="moi"]');
await page.waitForFunction(() => window.__sg.cardsApi?.scene?.state().bf, null, { timeout: 90000 });
const t0 = Date.now();
for (let i = 0; i < 22; i++) { const r = await page.evaluate(() => { const ts = [...document.querySelectorAll('.sc-tire')]; const p = document.querySelector('.sc-pass'); return { a: ts[0]?.classList.contains('on') ? ts[0].textContent : '', ou: p.classList.contains('on') ? p.innerText.split('\n')[0] : '', b: ts[1]?.classList.contains('on') ? ts[1].textContent : '' }; }); console.log(((Date.now() - t0) / 1000).toFixed(1), JSON.stringify(r)); await page.waitForTimeout(450); }
await browser.close();
