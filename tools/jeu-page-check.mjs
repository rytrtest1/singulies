// La page du jeu recodée (17/10) : ouverture, tirage, retour, aperçu sur SINGULIES, question partagée.
// node tools/jeu-page-check.mjs [pc] [port] → captures/jeu/*.png
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const PC = process.argv[2] === 'pc', PORT = process.argv[3] || 5195, dir = 'captures/jeu';
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const vp = PC ? { width: 1440, height: 900 } : { width: 390, height: 844 };
const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('ERR', String(e)));
page.on('console', m => { if (m.type() === 'error') console.log('console', m.text().slice(0, 200)); });
const tag = PC ? 'pc-' : '';
let n = 0; const shot = async t => { await page.screenshot({ path: `${dir}/${tag}${String(++n).padStart(2, '0')}-${t}.png` }); };
const st = async t => console.log(t, await page.evaluate(() => ({ url: location.pathname + location.search, title: document.querySelector('.nv-br')?.textContent, back: !document.querySelector('.nv-bk')?.classList.contains('off') })));
// 1) la page seule
await page.goto(`http://localhost:${PORT}/jeu.html?envoi=0`); await page.waitForTimeout(9000); await st('jeu'); await shot('jeu');
await page.mouse.click(vp.width / 2, vp.height * 0.5); await page.waitForTimeout(2500); await shot('apres-toucher');
await page.click('.nv-mn', { force: true }); await page.waitForTimeout(800); await shot('menu');
await page.keyboard.press('Escape'); await page.waitForTimeout(500);
// 2) question partagée
await page.goto(`http://localhost:${PORT}/jeu.html?q=5`); await page.waitForTimeout(9000); await shot('partagee');
// 3) SINGULIES → l'aperçu → le jeu → retour
await page.goto(`http://localhost:${PORT}/livres.html?envoi=0`); await page.waitForTimeout(7000);
await page.click('.nv-foot button', { force: true }); await page.waitForTimeout(4500); await shot('singulies');
await page.mouse.click(vp.width / 2, vp.height * 0.3); await page.waitForTimeout(6000); await st('apres-clic-apercu'); await shot('arrivee-jeu');
await page.click('.nv-bk', { force: true }).catch(() => {}); await page.waitForTimeout(3000); await st('retour');
await browser.close();
