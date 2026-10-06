// Feuille (lignes à écrire) et enveloppe (pivot devant la poche, cachet de cire, champs, POSTER).
// node tools/env-shot.mjs → captures/enveloppe/*.png (téléphone, GPU, aucun envoi : &envoi=0)
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const PORT = 5194, SPEED = 1.45;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const dir = 'captures/enveloppe';
mkdirSync(dir, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
page.on('pageerror', e => console.error('page', e));
page.on('console', m => { if (m.type() === 'error') console.error('console', m.text()); });
await page.goto(`http://localhost:${PORT}/scene-cartes.html?prenom=CLEMENCE%20ROSE&seed=3&reponse=bonjour%20toi&envoi=0`);
await page.waitForFunction(() => window.__scene && window.__scene.ready);
await sleep(800);
await page.evaluate(async () => { await window.__toSheet(); });
const tm = await page.evaluate(() => window.__scene.sheet.timing);
for (const [k, tau] of [['lignes-a', tm.landAll - 1.2], ['lignes-b', tm.landAll + 0.6], ['feuille', tm.CURSOR_AT + 0.6]]) {
  await page.evaluate(t => window.__at(t), tau);
  await page.screenshot({ path: `${dir}/${k}.png` });
}
await page.evaluate(() => { window.__at(30); window.__scene.sheet.choose('poste'); });
// temps de l'enveloppe (s, horloge de l'enveloppe) → secondes réelles
let ev = 0;
for (const e of [2.4, 2.8, 3.1, 3.35, 3.6, 4.2, 5.4, 6.2, 6.5, 7.2, 9]) {
  await page.evaluate(d => window.__scene.advance(d), (e - ev) / SPEED); ev = e;
  await page.screenshot({ path: `${dir}/env-${e.toFixed(2)}.png` });
}
const out = await page.evaluate(() => {
  const m = window.__scene, sh = m.sheet, el = () => [...document.querySelectorAll('.sc-answer')].find(x => document.activeElement === x) || document.querySelectorAll('.sc-answer')[1];
  const res = [];
  sh.startWriting(); m.advance(0.3);
  res.push(sh.state().env.field);
  for (const v of ['Léa Martin', '3 rue Haute', '', '75011', 'Paris', 'lea@exemple.fr']) {
    const a = el(); a.value = v; a.dispatchEvent(new Event('input'));
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); m.advance(0.3);
    res.push(sh.state().env.field + ':' + sh.state().env.canPost);
  }
  const post = [...document.querySelectorAll('.sc-pass')].find(e => e.textContent === 'POSTER');
  return { res, fields: sh.state().env.fields, poster: post && post.classList.contains('on') };
});
await page.evaluate(() => window.__scene.advance(0.8));
await page.screenshot({ path: `${dir}/champs.png` });
console.log(JSON.stringify(out));
await page.close();
await browser.close(); await server.close();
