// Retours du 12/10 (nuit) : la démonstration du bandeau sur la page des prénoms (sans rien écrire, une fois) ; plus de
// « pour moi / pour offrir » dans le bandeau ; la vitrine : glisser l'objet = l'étape suivante (à toutes les étapes),
// la page se pose d'elle-même sur l'étape (la carte mystère arrive au bout d'un petit geste) ; changer de page : les deux
// objets glissent côte à côte (capture au milieu) ; un poème par mois : sans titre, REJOINDRE = le panneau du paiement.
// SWIFT=1 node tools/retours-1210c-check.mjs <dossier>
import { createServer } from 'vite';
import { chromium } from 'playwright';
const OUT = process.argv[2] || '.', PORT = 5205;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch(process.env.SWIFT ? { headless: true, executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : { headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.setDefaultTimeout(120000);
const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const out = {};
const shot = n => page.screenshot({ path: `${OUT}/${n}.png` });
await page.goto(`http://localhost:${PORT}/?envoi=0&seed=3&paiement=faux`);
// 1. rien écrit : le menu paraît, puis la démonstration (le bandeau glisse tout seul)
await page.waitForFunction(() => document.querySelector('.nv.on'), null, { timeout: 60000 });
out.menuAt = await page.evaluate(() => performance.now() / 1000);
const xs = [];
for (let i = 0; i < 24; i++) { xs.push(await page.evaluate(() => document.querySelector('.nv-track').style.transform)); await page.waitForTimeout(250); }
out.demo = new Set(xs).size > 2;
out.demoFlag = await page.evaluate(() => sessionStorage.getItem('sg.nav.reveal'));
await shot('1-portail-menu');
// 2. le prénom → la feuille
await page.mouse.click(195, 422);
await page.keyboard.type('LEA', { delay: 140 });
await page.keyboard.press('Enter');
await page.waitForFunction(() => document.querySelector('#offre.bar-on'));
await page.waitForTimeout(2500);
out.bfor = await page.evaluate(() => !!document.querySelector('.of-bfor'));
await shot('2-feuille');
// 3. vitrine : glisser (souris tenue) sur l'objet, à l'étape 0, puis une fois descendu dans l'histoire
const drag = async (y) => { await page.mouse.move(300, y); await page.mouse.down(); await page.mouse.move(120, y + 6, { steps: 1 }); await page.mouse.up(); };
await drag(330);
await page.waitForTimeout(4000);
out.afterSwipe1 = await page.evaluate(() => ({ top: document.getElementById('offre').scrollTop, k: window.__sg.cardsApi.vitrine?.state().k }));
// au milieu de l'histoire (la feuille est sortie de sa place du haut) : glisser encore
await drag(330);
await page.waitForTimeout(9000);
out.afterSwipe2 = await page.evaluate(() => ({ top: document.getElementById('offre').scrollTop, k: window.__sg.cardsApi.vitrine?.state().k }));
// 4. la dernière étape : un petit défilement depuis l'étape « cire » suffit, la page finit seule
const L = await page.evaluate(() => { const o = document.getElementById('offre'); return o.querySelector('.of-story').offsetHeight; });
const y2 = out.afterSwipe2.top;
// (on se place sur l'étape du cachet, puis un petit geste vers le bas : 20 % de la dernière étape)
const seg = await page.evaluate(() => innerHeight * 0.18 * 4 * 0.5);
await page.mouse.move(195, 400); await page.mouse.wheel(0, 1);   // (un geste arrête la page qui défilait encore)
await page.evaluate(y => document.getElementById('offre').scrollTo({ top: y }), L - seg);
await page.waitForTimeout(3000);
await page.evaluate(y => document.getElementById('offre').scrollTo({ top: y }), L - seg * 0.8);
await page.waitForTimeout(12000);
out.settle = await page.evaluate(() => document.getElementById('offre').scrollTop);
out.storyLen = L;
await shot('3-mystere');
// retour en haut
await page.evaluate(() => document.getElementById('offre').scrollTo({ top: 0 }));
await page.waitForTimeout(5000);
// 5. vers un poème par mois (gauche) : capture au milieu de la transition
await page.evaluate(() => window.__nav.goTo('lettre'));
await page.waitForTimeout(330); await shot('4-transition');
await page.waitForTimeout(2500); await shot('5-lettre');
out.lettreTitre = await page.evaluate(() => [...document.querySelectorAll('.lt-ti')].map(e => getComputedStyle(e).display + ':' + e.textContent));
await page.click('.pg-lettre .lt-sign');
await page.waitForTimeout(1500);
out.panneau = await page.evaluate(() => !!document.querySelector('form.of-pay.on'));
await shot('6-rejoindre');
await page.keyboard.press('Escape');
await page.waitForTimeout(800);
out.ferme = await page.evaluate(() => !document.querySelector('form.of-pay.on'));
// 6. mes livres
await page.evaluate(() => window.__nav.goTo('livres'));
await page.waitForTimeout(330); await shot('7-transition-livres');
await page.waitForTimeout(2500); await shot('8-livres');
out.errs = errs;
console.log(JSON.stringify(out, null, 1));
await browser.close(); await server.close();
