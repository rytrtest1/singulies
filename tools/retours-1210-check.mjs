// Retours du 12/10 (2) : la page des prénoms seule ; la vitrine (enveloppe, carte mystère) ; les autres poèmes ; un
// poème par mois et mes livres (signe + prix, l'enveloppe en direct). node tools/retours-1210-check.mjs [pc]
import { build, preview } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync, rmSync } from 'fs';
const PC = process.argv[2] === 'pc', PORT = 5213, OUT = 'C:/Users/maxen/AppData/Local/Temp/claude/retours-dist', dir = 'captures/retours-1210';
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
await build({ logLevel: 'error', build: { outDir: OUT, emptyOutDir: true } });
const server = await preview({ build: { outDir: OUT }, preview: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const vp = PC ? { width: 1440, height: 900 } : { width: 390, height: 844 };
const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('ERR', String(e)));
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('console', m.text().slice(0, 200)); });
const shot = n => page.screenshot({ path: `${dir}/${n}.png` });
await page.goto(`http://localhost:${PORT}/alt.html?envoi=0&paiement=faux&seed=3`);
await page.waitForTimeout(6500);
await shot('1-prenoms');
console.log('bandeau sur les prénoms', await page.evaluate(() => ({ nav: document.querySelector('.nv')?.classList.contains('on'), foot: document.querySelector('.nv-foot')?.classList.contains('on'), bords: document.querySelector('.edge-fade')?.classList.contains('on') })));
await page.mouse.click(vp.width / 2, vp.height / 2); await page.keyboard.type('LEA', { delay: 90 });
await page.waitForTimeout(400); await page.keyboard.press('Enter');
await page.waitForTimeout(16000);
await shot('2-feuille');
console.log('bandeau sur la feuille', await page.evaluate(() => ({ nav: document.querySelector('.nv')?.classList.contains('on'), foot: document.querySelector('.nv-foot')?.classList.contains('on') })));
// la vitrine : on descend lentement jusqu'au cachet, puis jusqu'à la carte mystère
const keys = await page.evaluate(() => window.__sg?.cards?.vitrine?.state()?.keys || null);
console.log('étapes', keys);
const scrollTo = async (y, ms) => { const n = Math.max(1, Math.round(ms / 50)); const y0 = await page.evaluate(() => document.getElementById('offre').scrollTop); for (let i = 1; i <= n; i++) { await page.evaluate(v => { const r = document.getElementById('offre'); r.style.scrollSnapType = 'none'; r.scrollTop = v; }, y0 + (y - y0) * i / n); await page.waitForTimeout(50); } };
const PXS = vp.height * 0.18;
if (keys) {
  await scrollTo(keys[1] * PXS, 1800); await page.waitForTimeout(800); await shot('3-carte');
  await scrollTo(keys[2] * PXS, 7500); await page.waitForTimeout(1500); await shot('4-cachet');
  await scrollTo(keys[2] * PXS + 1.2 * PXS, 1300); await page.waitForTimeout(300); await shot('5-mystere-arrive');
  await scrollTo(keys[3] * PXS, 3000); await page.waitForTimeout(1500); await shot('6-mystere');
}
// les autres poèmes
await page.evaluate(() => { const r = document.getElementById('offre'); r.scrollTop = r.querySelector('.of-rest').offsetTop - 50; });
await page.waitForTimeout(1500);
await shot('7-autres');
// toucher la feuille du milieu, puis la molette = refermer
const mid = await page.evaluate(() => { const r = document.querySelector('.ex-slot.mid')?.getBoundingClientRect(); return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; });
if (mid) {
  await page.mouse.click(mid.x, mid.y); await page.waitForTimeout(700);
  const open = await page.evaluate(() => !!document.querySelector('.ex-big'));
  await page.mouse.wheel(0, 200); await page.waitForTimeout(700);
  console.log('lire : ouvert', open, '→ molette, refermé', !(await page.evaluate(() => !!document.querySelector('.ex-big'))));
}
await page.goto(`http://localhost:${PORT}/lettre.html?envoi=0`); await page.waitForTimeout(3500); await shot('8-lettre');
await page.click('.lt-sign'); await page.waitForTimeout(1200); await shot('9-lettre-rejoindre');
await page.goto(`http://localhost:${PORT}/livres.html?envoi=0`); await page.waitForTimeout(3500); await shot('10-livres');
await browser.close(); server.httpServer.close();
