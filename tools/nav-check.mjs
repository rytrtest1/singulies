// Le bandeau des pages, une seule page (alt.html, 11/10) — version figée.
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
// toucher un nom du bandeau (sa partie visible)
const tapLabel = async txt => { const pt = await page.evaluate(t => { const a = [...document.querySelectorAll('.nv-l')].find(e => e.textContent === t && !e.classList.contains('far')); if (!a) return null; const r = a.getBoundingClientRect(); const x0 = Math.max(r.left, 8), x1 = Math.min(r.right, innerWidth - 8); return { x: (x0 + x1) / 2, y: r.top + r.height / 2 }; }, txt); if (pt) await page.mouse.click(pt.x, pt.y); else console.log('pas de nom', txt); };
const shot = n => page.screenshot({ path: `${dir}/${tag}${n}.png` });
page.on('pageerror', e => console.log('ERR', String(e)));
page.on('console', m => { if (m.type() === 'error') console.log('console', m.text()); });
await page.goto(`http://localhost:${PORT}/alt.html?envoi=0&paiement=faux&seed=3`);
await page.waitForTimeout(6000);
console.log('prénoms : bandeau', await page.evaluate(() => document.querySelector('.nv').classList.contains('on')), 'SINGULIES', await page.evaluate(() => document.querySelector('.nv-foot').classList.contains('on')));
await shot('prenoms');
await page.mouse.click(vp.width / 2, vp.height / 2); await page.keyboard.type('CLEMENCE', { delay: 100 }); await page.keyboard.press('Enter');
await page.waitForFunction(() => document.querySelector('#offre.bar-on'), null, { timeout: 40000 });
await page.waitForTimeout(3000);
await shot('feuille');
const st = () => page.evaluate(() => ({ y: Math.round(document.getElementById('offre').scrollTop), vt: +window.__sg.cards.vitrine.state().vt.toFixed(2) }));
for (const k of [1, 2, 3]) {
  const t0 = Date.now();
  await page.click(`.of-dot[data-k="${k}"]`, { force: true });
  await page.waitForFunction(k => { const s = window.__sg.cards.vitrine.state(); return s.arrived && Math.abs(s.vt - s.keys[k]) < 0.01; }, k, { timeout: 25000 }).catch(() => {});
  console.log('point', k, ((Date.now() - t0) / 1000).toFixed(1), 's', JSON.stringify(await st()));
  await shot('etape' + k);
}
// la flèche du bas, depuis la dernière étape : les autres prénoms (même défilement)
await page.click('.of-down', { force: true });
await page.waitForTimeout(2200);
console.log('flèche bas', JSON.stringify(await st()), 'solo', await page.evaluate(() => document.querySelector('.nv').classList.contains('solo')));
await shot('autres');
const box = await page.evaluate(() => { const r = document.querySelector('.ex-slot.mid').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.4 }; });
await page.mouse.click(box.x, box.y); await page.waitForTimeout(900); await shot('lire');
await page.mouse.click(box.x, box.y); await page.waitForTimeout(700);
const order = [];
for (let i = 0; i < 5; i++) { await page.mouse.click(vp.width - 12, box.y); await page.waitForTimeout(650); order.push(await page.evaluate(() => document.querySelector('.ex-slot.mid')?.dataset.i)); }
console.log('défilé sans fin (à droite)', order.join(' '));
// remonter, puis la page voisine (sans rechargement)
await page.evaluate(() => { const o = document.getElementById('offre'); o.style.scrollSnapType = 'none'; o.scrollTo({ top: 0 }); });
await page.waitForTimeout(4000);
await page.evaluate(() => { window.__noReload = 1; });
await tapLabel('UN POEME PAR MOIS');
await page.waitForTimeout(300); await shot('depart');
await page.waitForTimeout(1500); await shot('lettre');
console.log('lettre :', page.url(), 'sans rechargement', await page.evaluate(() => window.__noReload === 1));
await tapLabel('LE JEU');
await page.waitForTimeout(3500); await shot('jeu');
console.log('jeu :', page.url(), 'sans rechargement', await page.evaluate(() => window.__noReload === 1));
await tapLabel('UN POEME PAR MOIS'); await page.waitForTimeout(1500);
await tapLabel('UN PRENOM UN POEME'); await page.waitForTimeout(1800); await shot('retour');
console.log('retour :', page.url(), 'sans rechargement', await page.evaluate(() => window.__noReload === 1), 'feuille', await page.evaluate(() => !!document.querySelector('#offre.on')));
// recharger : le prénom est déjà écrit
await page.goto(`http://localhost:${PORT}/alt.html?envoi=0&paiement=faux&seed=3`); await page.waitForTimeout(5000); await shot('recharge');
console.log('rechargé :', await page.evaluate(() => window.__sg.model.text));
await browser.close(); server.httpServer.close();
