// La section (A PROPOS, QUESTIONS, CONTACT, SINGULIES, LE JEU) : accès de chaque page à chaque autre, sous-bandeau, menu ≡, retour,
// relais seamless SINGULIES → jeu. node tools/section-check.mjs [pc] [port] → captures/section/*.png
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const PC = process.argv[2] === 'pc', PORT = process.argv[3] || 5195, dir = 'captures/section';
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'msedge', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const vp = PC ? { width: 1440, height: 900 } : { width: 390, height: 844 };
const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('ERR', String(e)));
page.on('console', m => { if (m.type() === 'error') console.log('console', m.text().slice(0, 160)); });
let n = 0; const shot = async t => { await page.screenshot({ path: `${dir}/${String(++n).padStart(2, '0')}-${t}.png` }); };
const info = async t => console.log(t.padEnd(26), JSON.stringify(await page.evaluate(() => ({ path: location.pathname.split('/').pop(), ov: [...document.querySelectorAll('.mn-au, .mn-ct:not(.ct-in), .mn-jeu')].map(e => e.dataset.x + (e.inert ? '(inert)' : '')).join(','), sub: document.querySelector('.nv-sub')?.classList.contains('on'), cur: document.querySelector('.nv-sub .cur')?.textContent, pan: document.querySelector('.nv-pan')?.classList.contains('on'), head: document.querySelector('.nv-br')?.textContent, back: !document.querySelector('.nv-bk')?.classList.contains('off') }))));
const menu = async x => { await page.click('.nv-mn', { force: true }); await page.waitForTimeout(700); await page.click(`.nv-pan [data-x="${x}"]`, { force: true }); await page.waitForTimeout(2200); };
const sub = async x => { await page.evaluate(x => document.querySelector(`.nv-sub button[data-x="${x}"]`).click(), x); await page.waitForTimeout(2200); };
await page.goto(`http://localhost:${PORT}/livres.html?envoi=0`); await page.waitForTimeout(8000);
await menu('contact'); await info('menu>contact'); await shot('contact');
// le menu ≡ depuis CONTACT : s'ouvre, liste visible
await page.click('.nv-mn', { force: true }); await page.waitForTimeout(800); await info('≡ sur CONTACT'); await shot('menu-sur-contact');
await page.click('.nv-pan [data-x="auteur"]', { force: true }); await page.waitForTimeout(2200); await info('contact>a propos (menu)'); await shot('apropos');
for (const x of ['questions', 'singulies', 'contact', 'auteur']) { await sub(x); await info('sous-bandeau>' + x); }
await shot('sous-bandeau');
await sub('jeu'); await info('sous-bandeau>jeu'); await shot('jeu-overlay');
await sub('contact'); await info('jeu>contact');
await page.click('.nv-bk', { force: true }); await page.waitForTimeout(1500); await info('retour');
await page.click('.nv-mn', { force: true }); await page.waitForTimeout(600); await page.click('.nv-pan [data-p="lettre"]', { force: true }); await page.waitForTimeout(2800); await info('menu>lettre (pages)');
await menu('singulies'); await info('singulies');
await page.waitForTimeout(2500); await shot('singulies');
// le relais : on touche le paquet
const box = await page.evaluate(() => { const r = document.querySelector('.sg-deck').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
await page.mouse.click(box.x, box.y); await page.waitForTimeout(250); await shot('relais-0250');
await page.waitForTimeout(500); await shot('relais-0750'); await page.waitForTimeout(1200); await shot('relais-1950'); await page.waitForTimeout(2500); await info('jeu (relais)'); await shot('jeu-relais');
await page.click('.nv-bk', { force: true }); await page.waitForTimeout(600); await shot('retour-0600'); await page.waitForTimeout(2200); await info('retour du jeu'); await shot('retour-fin');
await page.click('.nv-bk', { force: true }); await page.waitForTimeout(900); await info('retour SINGULIES');
await browser.close();
