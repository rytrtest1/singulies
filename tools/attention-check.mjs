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
await page.waitForTimeout(8000); console.log('8 s', JSON.stringify(await st()));
await page.waitForTimeout(4500); await page.screenshot({ path: 'captures/attn/1-debut.png' }); console.log('12,5 s', JSON.stringify(await st()));
await page.waitForTimeout(3000); await page.screenshot({ path: 'captures/attn/2-texte.png' }); console.log('15,5 s', JSON.stringify(await st()));
await page.waitForTimeout(4500); console.log('20 s (disparue d’elle-même)', JSON.stringify(await st()));
await browser.close();
