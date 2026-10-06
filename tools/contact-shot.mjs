// Essai du contact (email / numéro) : enveloppe (expéditeur puis adresse) et carte « en direct ».
// node tools/contact-shot.mjs → captures/contact/*.png (téléphone, GPU, aucun envoi : &envoi=0)
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const PORT = 5193;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
mkdirSync('captures/contact', { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (const mode of ['poste', 'direct']) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  page.on('pageerror', e => console.error('page', e));
  await page.goto(`http://localhost:${PORT}/scene-cartes.html?prenom=LEA&seed=3&reponse=bonjour&envoi=0`);
  await page.waitForFunction(() => window.__scene && window.__scene.ready);
  await sleep(800);
  await page.evaluate(async () => { await window.__toSheet(); window.__at(15); });
  const out = await page.evaluate(async mode => {
    const m = window.__scene, sh = m.sheet, ta = document.querySelector('.sc-answer'), log = [];
    sh.choose(mode); m.advance(mode === 'poste' ? 9.5 : 1.6);
    const st0 = sh.state().env;
    sh.startWriting();                                 // (le toucher sur la zone en cours)
    ta.value = mode === 'poste' ? 'lea@exemple.fr' : '06 12 34 56 78'; ta.dispatchEvent(new Event('input')); m.advance(0.4);
    log.push(['contact', JSON.stringify(sh.state().env)]);
    if (mode === 'poste') {
      const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }); ta.dispatchEvent(ev);
      m.advance(1.2);
      ta.value = 'Léa Martin\n3 rue Haute\n75011 Paris'; ta.dispatchEvent(new Event('input')); m.advance(0.4);
    }
    const st = sh.state().env, post = [...document.querySelectorAll('.sc-pass')].find(e => e.textContent === 'POSTER' || e.textContent === 'ENVOYER');
    return { st0, log, st, sign: post && post.classList.contains('on') ? post.textContent : null };
  }, mode);
  await page.screenshot({ path: `captures/contact/${mode}.png` });
  console.log(mode, JSON.stringify(out));
  await page.close();
}
await browser.close(); await server.close();
