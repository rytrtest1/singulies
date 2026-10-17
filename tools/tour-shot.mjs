// Tour du site (17/10) : captures de l'accueil, de la feuille et du bas de page, sur le serveur de développement.
// node tools/tour-shot.mjs [pc] [port] → captures/tour/*.png
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const PC = process.argv[2] === 'pc', PORT = process.argv[3] || 5195, dir = 'captures/tour';
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const vp = PC ? { width: 1440, height: 900 } : { width: 390, height: 844 };
const page = await browser.newPage({ viewport: vp, deviceScaleFactor: PC ? 1 : 2 });
const tag = PC ? 'pc-' : '';
const shot = n => page.screenshot({ path: `${dir}/${tag}${n}.png` });
page.on('pageerror', e => console.log('ERR', String(e)));
await page.goto(`http://localhost:${PORT}/?envoi=0&paiement=faux&seed=3`);
await page.waitForTimeout(5000); await shot('a-eternel');
await page.waitForTimeout(8000); await shot('b-curseur');
await page.mouse.click(vp.width / 2, vp.height / 2); await page.keyboard.type('CLEMENCE', { delay: 100 }); await page.waitForTimeout(1500); await shot('c-saisie');
await page.keyboard.press('Enter');
await page.waitForFunction(() => document.querySelector('#offre.bar-on'), null, { timeout: 60000 }).catch(() => console.log('pas de feuille'));
await page.waitForTimeout(4000); await shot('d-feuille');
await browser.close();
