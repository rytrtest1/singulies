// Après la réservation (18/10) : la carte vierge d'abord (« tes mots sont le thème du poème »), le paquet dessous, PASSER au milieu
// (« j'improvise avec LEA ») ; puis le toucher du paquet (la carte vierge s'efface, une question se tire) ; puis ← (le message de sortie).
// node tools/ceremonie-vierge.mjs [pc] [port] → captures/vierge/*.png
import { chromium } from 'playwright';
import { mkdirSync, rmSync } from 'fs';
const PC = process.argv[2] === 'pc', PORT = +(process.argv.find(a => /^\d{4}$/.test(a)) || 5195), dir = 'captures/vierge';
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'msedge', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const vp = PC ? { width: 1440, height: 900 } : { width: 390, height: 844 };
const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('ERR', String(e)));
page.on('console', m => { if (m.type() === 'error') console.log('console', m.text().slice(0, 200)); });
let n = 0; const shot = async t => { await page.screenshot({ path: `${dir}/${String(++n).padStart(2, '0')}-${t}.png` }); };
const st = () => page.evaluate(() => { const c = window.__sg.cardsApi, s = c.scene.state(), m = c.scene.marks(); const p = document.querySelector('.sc-pass'); const t = document.querySelector('.sc-tire');
  return { mode: s.mode, bf: s.bf, shuffling: s.shuffling, freeFor: +s.freeFor.toFixed(1), pass: p && p.classList.contains('on'), passTxt: p && p.innerText.replace(/\n/g, ' '), passTop: p && Math.round(p.getBoundingClientRect().top), tire: t && t.classList.contains('on') ? t.textContent : '',
    blankBottom: Math.round(m.blankUpBottom), deckTop: Math.round(m.deckTop), deckBot: Math.round(m.deckBot), back: document.querySelector('#back')?.classList.contains('on') }; });
await page.goto(`http://localhost:${PORT}/?envoi=0&seed=3`); await page.waitForTimeout(5000);
await page.mouse.click(vp.width / 2, vp.height / 2); await page.keyboard.type('LEA', { delay: 90 }); await page.keyboard.press('Enter');
await page.waitForFunction(() => document.querySelector('#offre.on.bar-on'), null, { timeout: 120000 }); await page.waitForTimeout(800);
await page.click('.of-bar .of-go'); await page.waitForTimeout(900);
if (await page.$('.mc [data-for]')) await page.click('.mc [data-for="moi"]');
await page.waitForFunction(() => window.__sg.cardsApi?.scene?.state().bf, null, { timeout: 90000 }).catch(() => console.log('pas de carte vierge d’abord'));
await page.waitForTimeout(1500); await shot('arrivee'); console.log('1,5 s', JSON.stringify(await st()));
await page.waitForTimeout(3500); await shot('passer'); console.log('5 s', JSON.stringify(await st()));
await page.waitForTimeout(2500); await shot('hop'); console.log('7,5 s', JSON.stringify(await st()));
// le toucher du paquet
const d = await page.evaluate(() => { const m = window.__sg.cardsApi.scene.marks(); return { y: (m.deckTop + m.deckBot) / 2 }; });
await page.mouse.click(vp.width / 2, d.y);
for (const ms of [300, 700, 1200]) { await page.waitForTimeout(ms === 300 ? 300 : 450); await shot('pioche-' + ms); }
await page.waitForTimeout(2500); await shot('question'); console.log('après toucher', JSON.stringify(await st()));
// ← : le message de sortie
await page.evaluate(() => document.querySelector('.nv-bk')?.click());
await page.waitForTimeout(3500); await shot('sortie-a'); await page.waitForTimeout(3500); await shot('sortie-b');
console.log('message', await page.evaluate(() => document.querySelector('.mc.exit')?.innerText || '(aucun)'));
await browser.close();
