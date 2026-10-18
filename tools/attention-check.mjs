// L'attention (18/10) : le curseur seul, rien touché → vignette + « entre un prénom » ; un geste l'éteint. node tools/attention-check.mjs [pc] [port] → captures/attn/*.png
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const PC = process.argv[2] === 'pc', PORT = +(process.argv.find(a => /^\d{4}$/.test(a)) || 5195);
mkdirSync('captures/attn', { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'msedge', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const vp = PC ? { width: 1440, height: 900 } : { width: 390, height: 844 };
const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('ERR', String(e)));
await page.goto(`http://localhost:${PORT}/?envoi=0&seed=3`);
await page.waitForFunction(() => window.__sg && window.__sg.S.introOff, null, { timeout: 60000 });
const st = () => page.evaluate(() => { const a = document.querySelector('.sg-attn'); return { on: !!a && a.classList.contains('on'), txt: a ? a.innerText : '' }; });
await page.waitForTimeout(3000); console.log('3 s', JSON.stringify(await st()));
await page.waitForTimeout(3500); await page.screenshot({ path: 'captures/attn/1-debut.png' }); console.log('6,5 s', JSON.stringify(await st()));
await page.waitForTimeout(3500); await page.screenshot({ path: 'captures/attn/2-texte.png' }); console.log('10 s', JSON.stringify(await st()));
await page.mouse.move(50, 50); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(1200); console.log('après geste', JSON.stringify(await st()));
await page.screenshot({ path: 'captures/attn/3-apres.png' });
await browser.close();
