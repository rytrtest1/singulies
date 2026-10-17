// Réunion du 17/10 (« le meilleur des deux mondes ») : les deux versions côte à côte, au format téléphone.
// node tools/reunion-shots.mjs [port] → docs/reunion-2/captures/{site,epure}-*.png
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const PORT = process.argv[2] || 5197, dir = 'docs/reunion-2/captures';
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'msedge', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const vp = { width: 390, height: 844 };
const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 2 });
page.on('pageerror', e => console.log('ERR', String(e)));
const shot = n => page.screenshot({ path: `${dir}/${n}.png` });
const wait = ms => page.waitForTimeout(ms);

// ——— le site actuel ———
const t0 = Date.now();
await page.goto(`http://localhost:${PORT}/?envoi=0&seed=3`);
await wait(1500); await shot('site-1-arrivee');
await wait(4500); await shot('site-2-curseur');
await page.mouse.click(vp.width / 2, vp.height / 2); await page.keyboard.type('CLEMENCE', { delay: 110 });
await wait(600); await shot('site-3-prenom-tape');
await page.keyboard.press('Enter');
const tEnter = Date.now();
await wait(2500); await shot('site-4-vol-des-lettres');
await page.waitForFunction(() => document.querySelector('#offre.txt-on'), null, { timeout: 90000 }).catch(() => console.log('pas de txt-on'));
console.log('site : de Entrée au premier texte de l’offre', ((Date.now() - tEnter) / 1000).toFixed(1), 's');
await wait(5000); await shot('site-5-feuille-offre');
await page.evaluate(() => { const r = document.getElementById('offre'); r && r.scrollBy({ top: innerHeight * 0.6 }); }); await wait(2500); await shot('site-6-vitrine-etape');
await page.evaluate(() => { const r = document.getElementById('offre'); r && r.scrollTo({ top: 0 }); }); await wait(1500);
const go = page.locator('text=RECEVOIR').first();
if (await go.count()) { await go.click().catch(() => {}); await wait(3000); await shot('site-7-apres-recevoir'); await wait(5000); await shot('site-8-ceremonie'); }
console.log('site : durée totale capturée', ((Date.now() - t0) / 1000).toFixed(0), 's');

// ——— la version épurée ———
await page.goto(`http://localhost:${PORT}/epure.html?envoi=0`);
await wait(2600); await shot('epure-1-arrivee');
await page.mouse.click(vp.width / 2, 380); await page.keyboard.type('CLEMENCE', { delay: 110 }); await page.keyboard.press('Enter');
await wait(2500); await shot('epure-2-prenom');
await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; document.querySelector('#recois').scrollIntoView(); }); await wait(3500); await shot('epure-3-ce-que-tu-recois');
await page.evaluate(() => document.querySelector('#exemples').scrollIntoView()); await wait(1200); await shot('epure-4-exemples');
await page.evaluate(() => { scrollTo(0, 0); document.querySelector('#go').click(); }); await wait(3500); await shot('epure-5-commande-question');
await page.evaluate(() => { const f = document.querySelector('#order'); const s = (n, v) => { f.elements[n].value = v; f.elements[n].dispatchEvent(new Event('input', { bubbles: true })); }; s('who', 'Clémence Martin'); s('rue', '12 rue des Lilas'); s('cp', '75011'); s('ville', 'Paris'); s('email', 'essai@example.com'); document.querySelector('.env').scrollIntoView({ block: 'center' }); });
await wait(800); await shot('epure-6-commande-enveloppe');
await page.evaluate(() => document.querySelector('#send').click()); await wait(6000); await shot('epure-7-fin');
await browser.close();
