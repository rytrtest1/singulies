// (20/10) cérémonie du site principal : le paquet en haut (« tire une question du jeu »), OU, « exprime-toi librement », la carte vierge en bas ;
// 10 s sans choix : PASSER + (j'improvise avec …) ; un choix efface tout ; les deux cartes restent à l'écran ; ← = l'action d'avant.
// node tools/vierge-choix.mjs [port] [pc] → captures/vierge/*.png
import { chromium } from 'playwright';
import { mkdirSync, rmSync } from 'fs';
const PORT = +(process.argv.find(a => /^\d{4}$/.test(a)) || 5195), PC = process.argv.includes('pc'), dir = 'captures/vierge';
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'msedge', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const vp = PC ? { width: 1440, height: 900 } : { width: 390, height: 844 };
const page = await browser.newPage({ viewport: vp });
page.on('pageerror', e => console.log('ERR', String(e)));
page.on('console', m => { if (m.type() === 'error') console.log('console', m.text().slice(0, 200)); });
let n = 0; const shot = async t => { await page.screenshot({ path: `${dir}/${String(++n).padStart(2, '0')}-${t}.png` }); };
const st = () => page.evaluate(() => { const g = e => document.querySelector(e); const p = g('.sc-pass'), ts = [...document.querySelectorAll('.sc-tire')]; const s = window.__sg.cardsApi.scene.state(), m = window.__sg.cardsApi.scene.marks();
  return { bf: s.bf, bfp: s.bfp, mode: s.mode, userWrite: s.userWrite, text: s.active && s.active.text, pass: p.classList.contains('on'), passTxt: p.innerText.replace(/\n/g, ' '), tires: ts.filter(e => e.classList.contains('on')).map(e => e.textContent), level: window.__sg.cardsApi.level(), deckBot: Math.round(m.deckBot), blankTop: Math.round(m.blankBfTop) }; });
await page.goto(`http://localhost:${PORT}/?envoi=0&seed=3`); await page.waitForTimeout(5000);
await page.mouse.click(vp.width / 2, vp.height / 2); await page.keyboard.type('LEA', { delay: 90 }); await page.keyboard.press('Enter');
await page.waitForFunction(() => document.querySelector('#offre.on.bar-on'), null, { timeout: 120000 }); await page.waitForTimeout(800);
await page.click('.of-bar .of-go'); await page.waitForTimeout(900);
if (await page.$('.mc [data-for]')) await page.click('.mc [data-for="moi"]');
await page.waitForFunction(() => window.__sg.cardsApi?.scene?.state().bf, null, { timeout: 90000 });
await page.waitForTimeout(4500); await shot('labels'); console.log('4,5 s', JSON.stringify(await st()));
await page.waitForTimeout(8500); await shot('passer'); console.log('13 s', JSON.stringify(await st()));
const mk = () => page.evaluate(() => window.__sg.cardsApi.scene.marks());
let m = await mk();
// toucher la carte vierge : tout s'efface
await page.mouse.click(vp.width / 2, m.blankBfTop + 60); await page.waitForTimeout(1800); await shot('vierge-touchee'); console.log('carte vierge touchée', JSON.stringify(await st()));
await page.keyboard.type('mes mots', { delay: 40 }); await page.waitForTimeout(600);
// tirer une question : la carte vierge reste en bas
await page.mouse.click(vp.width / 2, (m.deckTop + m.deckBot) / 2); for (const ms of [250, 500, 700]) { await page.waitForTimeout(ms === 250 ? 250 : 300); await shot('pioche-' + ms); }
await page.waitForTimeout(2500); await shot('question'); console.log('question tirée', JSON.stringify(await st()));
// la carte vierge reprend la main
m = await mk(); await page.mouse.click(vp.width / 2, m.blankBfTop + 80); await page.waitForTimeout(1800); await shot('vierge-reprise'); console.log('vierge reprise', JSON.stringify(await st()));
// ← : la question reprend la main, puis ←: le paquet
await page.evaluate(() => document.querySelector('.nv-bk')?.click()); await page.waitForTimeout(1500); console.log('← 1', JSON.stringify(await st()));
await page.evaluate(() => document.querySelector('.nv-bk')?.click()); await page.waitForTimeout(700); await shot('annule-a'); await page.waitForTimeout(2200); await shot('annule-b'); console.log('← 2', JSON.stringify(await st()));
await browser.close();
