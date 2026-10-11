// Allers-retours au glissé entre les pages (alt.html, 11/10) : après chaque retour, chaque texte doit être exactement à
// sa place de départ. node tools/swipe-check.mjs → captures/swipe/*.png — version figée.
import { build, preview } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const PORT = 5198, OUT = 'C:/Users/maxen/AppData/Local/Temp/claude/swipe-dist', dir = 'captures/swipe';
mkdirSync(dir, { recursive: true });
await build({ logLevel: 'error', build: { outDir: OUT, emptyOutDir: true } });
const server = await preview({ build: { outDir: OUT }, preview: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const vp = { width: 390, height: 844 };
const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 2 });
page.on('pageerror', e => console.log('ERR', String(e)));
await page.goto(`http://localhost:${PORT}/alt.html?envoi=0&paiement=faux&seed=3`);
await page.waitForTimeout(6000);
await page.mouse.click(vp.width / 2, vp.height / 2); await page.keyboard.type('CLEMENCE', { delay: 90 }); await page.keyboard.press('Enter');
await page.waitForFunction(() => document.querySelector('#offre.bar-on'), null, { timeout: 40000 });
await page.waitForTimeout(6000);
// la position de chaque texte qu'on peut voir (et ses décalages résiduels)
const probe = () => page.evaluate(() => {
  const r = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), e.style.translate || '-', getComputedStyle(e).visibility]; };
  return { cap: r('.of-cap'), vit: r('.of-cap .of-vit'), go: r('.of-go'), canvas: r('canvas.sc-c'), lettre: r('.pg-lettre .lt'), livres: r('.pg-livres .lt'), page: window.__nav?.page };
});
const drag = async (x0, x1) => { const y = 300; await page.mouse.move(x0, y); await page.mouse.down(); for (let i = 1; i <= 12; i++) { await page.mouse.move(x0 + (x1 - x0) * i / 12, y); await page.waitForTimeout(16); } await page.mouse.up(); await page.waitForTimeout(1300); };
const p0 = await probe(); console.log('départ', JSON.stringify(p0));
await page.screenshot({ path: `${dir}/0-depart.png` });
for (let k = 1; k <= 3; k++) {
  await drag(330, 70);   // vers la gauche : la page de droite
  console.log(k, 'à droite', JSON.stringify(await probe()));
  await page.screenshot({ path: `${dir}/${k}-droite.png` });
  await drag(70, 330);   // vers la droite : retour
  const p = await probe(); console.log(k, 'retour', JSON.stringify(p));
  await page.screenshot({ path: `${dir}/${k}-retour.png` });
  const same = JSON.stringify([p.cap, p.vit, p.go, p.canvas]) === JSON.stringify([p0.cap, p0.vit, p0.go, p0.canvas]);
  console.log(k, same ? 'IDENTIQUE au départ' : 'DIFFERENT du départ');
}
// et dans l'autre sens : la page de gauche, retour
await drag(70, 330); console.log('à gauche', JSON.stringify(await probe())); await page.screenshot({ path: `${dir}/4-gauche.png` });
await drag(330, 70); const p = await probe(); console.log('retour', JSON.stringify(p)); await page.screenshot({ path: `${dir}/4-retour.png` });
console.log(JSON.stringify([p.cap, p.vit, p.go, p.canvas]) === JSON.stringify([p0.cap, p0.vit, p0.go, p0.canvas]) ? 'IDENTIQUE au départ' : 'DIFFERENT du départ');
await browser.close(); server.httpServer.close();
