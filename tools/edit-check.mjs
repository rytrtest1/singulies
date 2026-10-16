// Revenir au prénom (16/10) : toucher le prénom pendant qu'il part = il se rembobine ; sur la feuille, toucher la
// colonne ou UN PRENOM UN POEME = le champ, le prénom retapé, modifiable. Version figée. node tools/edit-check.mjs
import { build, preview } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const PORT = 5198, OUT = 'C:/Users/maxen/AppData/Local/Temp/claude/edit-dist', dir = 'captures/edit';
mkdirSync(dir, { recursive: true });
await build({ logLevel: 'error', build: { outDir: OUT, emptyOutDir: true } });
const server = await preview({ build: { outDir: OUT }, preview: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const vp = { width: 390, height: 844 };
const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('ERR', String(e)));
const st = () => page.evaluate(() => { const S = window.__sg.S; return { trans: S.trans, rw: S.rw, edit: !!S.edit, text: window.__sg.model.text, phase: S.phase }; });
await page.goto(`http://localhost:${PORT}/index.html?envoi=0&paiement=faux&seed=3`);
await page.waitForTimeout(5000);
await page.mouse.click(195, 422); await page.keyboard.type('LEA', { delay: 90 });
await page.keyboard.press('Enter'); await page.waitForTimeout(400); await page.keyboard.press('Enter');
await page.waitForTimeout(1800);
const b = await page.evaluate(() => window.__sg.S.placeBox);
console.log('pendant', JSON.stringify(await st()), JSON.stringify(b));
await page.mouse.click((b[0] + b[2]) / 2, (b[1] + b[3]) / 2);
await page.waitForTimeout(300); console.log('rembobine', JSON.stringify(await st()));
await page.screenshot({ path: `${dir}/a-rembobine.png` });
await page.waitForTimeout(2500); console.log('revenu', JSON.stringify(await st()));
await page.screenshot({ path: `${dir}/b-revenu.png` });
await page.keyboard.press('Backspace'); await page.keyboard.type('O', { delay: 90 });
await page.keyboard.press('Enter'); await page.waitForTimeout(400); await page.keyboard.press('Enter');
await page.waitForFunction(() => document.querySelector('#offre.on.bar-on'), null, { timeout: 60000 });
await page.waitForTimeout(800);
await page.screenshot({ path: `${dir}/c-feuille.png` });
const b2 = await page.evaluate(() => window.__sg.S.placeBox);
console.log('feuille', JSON.stringify(await st()), JSON.stringify(b2));
await page.mouse.click((b2[0] + b2[2]) / 2, (b2[1] + b2[3]) / 2);
// (17/10) depuis la feuille : rembobinage (plus de rechargement) — quelques images, puis on corrige et l'on repart
for (const [i, w] of [[1, 250], [2, 350], [3, 400]]) { await page.waitForTimeout(w); await page.screenshot({ path: `${dir}/d${i}-rembobine.png` }); }
await page.waitForTimeout(2500);
console.log('apres', JSON.stringify(await st()));
await page.screenshot({ path: `${dir}/d-corrige.png` });
await page.mouse.click(195, 422); await page.waitForTimeout(200);
await page.keyboard.press('Backspace'); await page.keyboard.type('NA', { delay: 90 });
await page.keyboard.press('Enter'); await page.waitForTimeout(400); await page.keyboard.press('Enter');
await page.waitForFunction(() => document.querySelector('#offre.on.bar-on'), null, { timeout: 60000 });
await page.waitForTimeout(1200);
console.log('refaite', JSON.stringify(await st()));
await page.screenshot({ path: `${dir}/e-refaite.png` });
await browser.close(); server.httpServer.close();
