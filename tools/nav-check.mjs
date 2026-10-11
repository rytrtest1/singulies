// Le bandeau des pages et la vitrine au rythme réel (alt.html, 11/10) — version figée.
// node tools/nav-check.mjs [pc] → captures/nav/*.png
import { build, preview } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const PC = process.argv[2] === 'pc', PORT = 5194, OUT = 'C:/Users/maxen/AppData/Local/Temp/claude/nav-dist', dir = 'captures/nav';
mkdirSync(dir, { recursive: true });
await build({ logLevel: 'error', build: { outDir: OUT, emptyOutDir: true } });
const server = await preview({ build: { outDir: OUT }, preview: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const vp = PC ? { width: 1440, height: 900 } : { width: 390, height: 844 };
const page = await browser.newPage({ viewport: vp, deviceScaleFactor: PC ? 1 : 2 });
const tag = PC ? 'pc-' : '';
page.on('pageerror', e => console.log('ERR', String(e)));
page.on('console', m => { if (m.type() === 'error') console.log('console', m.text()); });
await page.goto(`http://localhost:${PORT}/alt.html?envoi=0&paiement=faux&seed=3`);
await page.waitForTimeout(9000);
console.log('menu ?', await page.evaluate(() => !!document.querySelector('.mn-sign')), 'bandeau visible (champ) ?', await page.evaluate(() => document.querySelector('.nv').classList.contains('on')));
await page.mouse.click(vp.width / 2, vp.height / 2); await page.keyboard.type('CLEMENCE', { delay: 100 }); await page.keyboard.press('Enter');
await page.waitForFunction(() => document.querySelector('#offre.bar-on'), null, { timeout: 40000 });
await page.waitForTimeout(3000);
console.log('bandeau visible (feuille) ?', await page.evaluate(() => document.querySelector('.nv').classList.contains('on')), 'flèche retour ?', await page.evaluate(() => !!document.querySelector('.of-back')));
await page.screenshot({ path: `${dir}/${tag}feuille.png` });
// la flèche de droite : l'étape suivante à son allure (on mesure la durée)
const st = () => page.evaluate(() => ({ y: Math.round(document.getElementById('offre').scrollTop), ...window.__sg.cards.vitrine.state() }));
for (let k = 1; k <= 3; k++) {
  const t0 = Date.now();
  await page.click('.of-vit-a[data-d="1"]');
  await page.waitForFunction(() => { const s = window.__sg.cards.vitrine.state(); return s.arrived && s.target > 0; }, null, { timeout: 20000 }).catch(() => {});
  await page.waitForFunction(k => { const s = window.__sg.cards.vitrine.state(); return s.arrived && Math.abs(s.vt - s.keys[k]) < 0.01; }, k, { timeout: 20000 }).catch(() => {});
  console.log('étape', k, 'en', ((Date.now() - t0) / 1000).toFixed(1), 's', JSON.stringify(await st()));
  await page.screenshot({ path: `${dir}/${tag}etape${k}.png` });
}
// depuis la fin, la flèche de droite rembobine tout
{ const t0 = Date.now(); await page.click('.of-vit-a[data-d="1"]');
  for (let i = 0; i < 6; i++) { await page.waitForTimeout(1000); const q = await st(); console.log('  ', ((Date.now() - t0) / 1000).toFixed(1), 'y', q.y, 'vt', q.vt.toFixed(2), 'fps', await page.evaluate(() => new Promise(r => { let n = 0; const t = performance.now(); const f = () => { n++; if (performance.now() - t < 500) requestAnimationFrame(f); else r(n * 2); }; requestAnimationFrame(f); }))); }
  await page.waitForFunction(() => { const s = window.__sg.cards.vitrine.state(); return s.arrived && s.vt < 0.01; }, null, { timeout: 20000 }).catch(() => {});
  console.log('rembobinage en', ((Date.now() - t0) / 1000).toFixed(1), 's', JSON.stringify(await st())); }
// la flèche du bas : directement les autres prénoms
await page.waitForTimeout(600);
console.log('flèche bas :', await page.evaluate(() => { const d = document.querySelector('.of-down'), r = d.getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return d.className + ' ' + JSON.stringify([r.left, r.top, r.width, r.height]) + ' au-dessus : ' + (e && (e.className || e.tagName)) + ' op ' + getComputedStyle(d).opacity; }));
await page.click('.of-down', { timeout: 4000, force: true }).catch(e => console.log('flèche bas', e.message.split('\n')[0]));
await page.waitForTimeout(1500);
console.log('après flèche bas', JSON.stringify(await st()));
await page.screenshot({ path: `${dir}/${tag}autres.png` });
await page.evaluate(() => document.getElementById('offre').scrollTo({ top: 0 }));
await page.waitForTimeout(5000);
// la page voisine (à droite) : un poème par mois
await page.click('.nv-l[data-d="1"]');
await page.waitForTimeout(250); await page.screenshot({ path: `${dir}/${tag}depart.png` });
await page.waitForURL(/lettre/, { timeout: 5000 }).catch(() => {});
await page.waitForTimeout(400); await page.screenshot({ path: `${dir}/${tag}arrivee.png` });
await page.waitForTimeout(1600); await page.screenshot({ path: `${dir}/${tag}lettre.png` });
await page.click('.nv-l[data-d="2"]');
await page.waitForURL(/livres/, { timeout: 5000 }).catch(() => {});
await page.waitForTimeout(2000); await page.screenshot({ path: `${dir}/${tag}livres.png` });
console.log('url', page.url());
await browser.close(); server.httpServer.close();
