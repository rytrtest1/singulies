// La vitrine de alt.html (10/10), jouée en direct dans la scène : on avance d'une étape à la fois (flèche), une image
// par seconde pendant qu'elle se joue ; une planche par étape. node tools/vitrine-check.mjs [prénom] [recul]
//   → captures/vitrine/etape-<k>.jpg (+ recul : on revient d'une étape, et RECEVOIR depuis la dernière)
import { build, preview } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync, rmSync } from 'fs';
import { execFileSync } from 'child_process';
const NAME = process.argv[2] || 'CLEMENCE', BACK = process.argv.includes('recul');
const FF = 'C:/ffmpeg/ffmpeg.exe', PORT = 5199, dir = 'captures/vitrine';
mkdirSync(dir, { recursive: true });
// une version figée du site (l'autre session modifie les fichiers : le serveur de développement rechargerait la page)
const OUT = 'C:/Users/maxen/AppData/Local/Temp/claude/vit-dist';
await build({ logLevel: 'error', build: { outDir: OUT, emptyOutDir: true } });
const server = await preview({ build: { outDir: OUT }, preview: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
page.setDefaultTimeout(60000);
const errs = []; page.on('pageerror', e => { errs.push(String(e)); console.log('ERR', String(e).slice(0, 300)); }); page.on('framenavigated', f => { if (f === page.mainFrame()) console.log('NAV', f.url()); }); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const vs = () => page.evaluate(() => window.__sg.cards?.vitrine?.state());
await page.goto(`http://localhost:${PORT}/alt.html?envoi=0&paiement=faux&seed=3`);
await page.waitForTimeout(9000);
await page.mouse.click(187, 406);
await page.keyboard.type(NAME, { delay: 110 });
await page.keyboard.press('Enter');
await page.waitForFunction(() => document.querySelector('#offre.bar-on'), null, { timeout: 40000 });
await page.waitForTimeout(1500);
// on prend la main tout de suite (le tour automatique s'arrête)
async function playStep(k, d = 1) {
  const sub = `${dir}/e${k}`; rmSync(sub, { recursive: true, force: true }); mkdirSync(sub, { recursive: true });
  await page.click(`.of-vit-a[data-d="${d}"]`);
  let i = 0;
  for (; i < 14; i++) {
    await page.waitForTimeout(i === 0 ? 300 : 1000);
    await page.screenshot({ path: `${sub}/f${String(i).padStart(2, '0')}.png` });
    const st = await vs(); if (st && st.arrived && i > 0) { await page.waitForTimeout(800); await page.screenshot({ path: `${sub}/f${String(++i).padStart(2, '0')}.png` }); break; }
  }
  const n = i + 1, cols = Math.min(6, n), rows = Math.ceil(n / cols);
  execFileSync(FF, ['-y', '-loglevel', 'error', '-framerate', '1', '-i', `${sub}/f%02d.png`, '-vf', `scale=250:-1,tile=${cols}x${rows}`, '-frames:v', '1', `${dir}/etape-${k}${d < 0 ? '-recul' : ''}.jpg`]);
  console.log('étape', k, d < 0 ? '(recul)' : '', JSON.stringify(await vs()), await page.evaluate(() => document.querySelector('.of-vit-t').getAttribute('aria-label')));
}
await page.screenshot({ path: `${dir}/etape-0.png` });
for (let k = 1; k <= 3; k++) await playStep(k);
// le défilement : retour en haut (la feuille), puis une étape par cran de défilement
await page.evaluate(() => document.getElementById('offre').scrollTo({ top: 0 })); await page.waitForTimeout(6000);
const stepPx = await page.evaluate(() => Math.round(innerHeight * 0.42));
for (let k = 1; k <= 3; k++) {
  await page.evaluate(y => document.getElementById('offre').scrollTo({ top: y }), k * stepPx); await page.waitForTimeout(6500);
  await page.screenshot({ path: `${dir}/defile-${k}.png` });
  console.log('défilement', k, JSON.stringify(await vs()), await page.evaluate(() => document.querySelector('.of-vit-t').getAttribute('aria-label')));
}
await page.evaluate(() => document.getElementById('offre').scrollTo({ top: 0 })); await page.waitForTimeout(1500);
if (BACK) {
  await playStep(2, -1);
  await page.click('.of-bar .of-go');   // RECEVOIR depuis la guirlande : la feuille revient, puis l'enveloppe
  await page.waitForTimeout(3500); await page.screenshot({ path: `${dir}/recevoir.png` });
  console.log('recevoir', JSON.stringify(await vs()), await page.evaluate(() => document.getElementById('offre').className));
}
console.log('erreurs', errs.slice(0, 6));
await browser.close(); server.httpServer.close();
