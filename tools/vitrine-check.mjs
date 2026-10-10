// La vitrine de alt.html (10/10) : RECEVOIR, la description, le prix ; un tour tout seul (la feuille, puis les boucles
// vidéo), les flèches, le glissé. node tools/vitrine-check.mjs → captures/vitrine-*.png + l'état à chaque étape.
// (Edge : le Chromium de Playwright ne lit pas le H.264)
import { createServer } from 'vite';
import { chromium } from 'playwright';
const PORT = 5199;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, hasTouch: false });
const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const shot = n => page.screenshot({ path: `captures/vitrine-${n}.png` });
const state = () => page.evaluate(() => {
  const v = [...document.querySelectorAll('.of-vid')].map(x => ({ src: (x.currentSrc || '').split('/').pop(), on: x.classList.contains('on'), t: +x.currentTime.toFixed(1), paused: x.paused, err: !!x.dataset.bad }));
  const bar = document.querySelector('.of-bar'), go = document.querySelector('.of-bar .of-go');
  return { txt: document.querySelector('.of-vit-t')?.getAttribute('aria-label'), stage: document.querySelector('.of-stage')?.classList.contains('on'), vids: v.filter(x => x.src), go: go?.textContent, goTop: Math.round(go?.getBoundingClientRect().top || 0) };
});
await page.goto(`http://localhost:${PORT}/alt.html?envoi=0&paiement=faux&seed=3`);
await page.waitForTimeout(9000);
await page.mouse.click(187, 406);
await page.keyboard.type('CLEMENCE', { delay: 120 });
await page.keyboard.press('Enter');
await page.waitForFunction(() => document.querySelector('#offre.bar-on'), null, { timeout: 40000 });
await page.waitForTimeout(1600); console.log('feuille', JSON.stringify(await state())); await shot('1-feuille');
await page.waitForTimeout(6500); console.log('auto 2', JSON.stringify(await state())); await shot('2-carte');
await page.waitForTimeout(4000); await shot('2b-carte');
// les flèches : on prend la main
await page.click('.of-vit-a[data-d="1"]'); await page.waitForTimeout(3500); console.log('suivant', JSON.stringify(await state())); await shot('3-enveloppe');
await page.waitForTimeout(5000); await shot('3b-enveloppe');
await page.click('.of-vit-a[data-d="1"]'); await page.waitForTimeout(8500); console.log('carbone', JSON.stringify(await state())); await shot('4-carbone');
// glisser l'objet vers la gauche = le suivant
await page.mouse.move(300, 300); await page.mouse.down(); await page.mouse.move(120, 310, { steps: 6 }); await page.mouse.up();
await page.waitForTimeout(9000); console.log('fil', JSON.stringify(await state())); await shot('5-fil');
await page.click('.of-vit-a[data-d="1"]'); await page.waitForTimeout(1500); console.log('retour feuille', JSON.stringify(await state())); await shot('6-feuille');
await page.click('.of-vit-a[data-d="-1"]'); await page.waitForTimeout(1500); console.log('précédent', JSON.stringify(await state()));
// RECEVOIR : la vitrine s'efface, la feuille entre dans l'enveloppe
await page.click('.of-bar .of-go'); await page.waitForTimeout(2500); console.log('recevoir', JSON.stringify(await state())); await shot('7-recevoir');
console.log('erreurs', errs);
await browser.close(); await server.close();
