// La version simple, cas à cas : ?simple=suite (vrai champ, puis la suite simple), le jeu simple, le retour.
// node tools/simple-check.mjs → captures/simple-check/*.png
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const PORT = 5191;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
mkdirSync('captures/simple-check', { recursive: true });
const out = {};
{ // 1. le vrai champ (WebGL), la suite en simple
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto(`http://localhost:${PORT}/?portail=0&simple=suite&envoi=0`);
  await page.waitForTimeout(2500);
  await page.mouse.click(195, 422); await page.keyboard.type('LEA'); await page.keyboard.press('Enter'); await page.waitForTimeout(400); await page.keyboard.press('Enter');
  await page.waitForFunction(() => !!document.querySelector('.sp-flow.on'), null, { timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'captures/simple-check/suite.png' });
  out.suite = { flow: await page.evaluate(() => !!document.querySelector('.sp-flow')), errs };
  await browser.close();
}
{ // 2. le jeu simple, depuis le portail simple ; retour
  const browser = await chromium.launch({ headless: true, args: ['--disable-3d-apis'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto(`http://localhost:${PORT}/?envoi=0`);
  await page.waitForTimeout(3500);
  await page.click('button[aria-label="SINGULIES, le jeu"]'); await page.waitForTimeout(2600);
  await page.click('.sp-jeu button[aria-label="une autre question"]'); await page.waitForTimeout(1800);
  await page.screenshot({ path: 'captures/simple-check/jeu.png' });
  await page.waitForTimeout(3500);
  out.jeuSigns = await page.evaluate(() => [...document.querySelectorAll('.sp-jeu .sp-sign.on')].map(b => b.textContent));
  await page.click('.sp-jeu button[aria-label="Commander le jeu SINGULIES"]'); await page.waitForTimeout(400);
  await page.screenshot({ path: 'captures/simple-check/jeu-bientot.png' });
  await page.click('.sp-jeu .sp-back'); await page.waitForTimeout(1500);
  out.jeu = { back: await page.evaluate(() => !document.querySelector('.sp-jeu') && document.querySelector('.sp-portal').classList.contains('on')), errs };
  // le lien d'attente du portail (la lettre) : la carte se retourne
  await page.click('button[aria-label="une lettre chez toi, chaque mois"]'); await page.waitForTimeout(1000);
  await page.screenshot({ path: 'captures/simple-check/portail-bientot.png' });
  await browser.close();
}
{ // 3. question partagée (jeu?q=…), version simple : la carte réponse, PARTAGER une fois écrit
  const browser = await chromium.launch({ headless: true, args: ['--disable-3d-apis'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  const id = JSON.parse((await import('fs')).readFileSync('src/cards/questions.json', 'utf8'))[3].id;
  await page.goto(`http://localhost:${PORT}/jeu.html?q=${id}&envoi=0`);
  await page.waitForSelector('.sp-jeu textarea', { timeout: 20000 }); await page.waitForTimeout(2500);
  const before = await page.evaluate(() => !!document.querySelector('.sp-jeu .sp-sign.on[aria-label^="Partager"]'));
  await page.click('.sp-jeu textarea'); await page.keyboard.type('la mer'); await page.waitForTimeout(1600);
  await page.screenshot({ path: 'captures/simple-check/jeu-partagee.png' });
  const after = await page.evaluate(() => !!document.querySelector('.sp-jeu .sp-sign.on[aria-label^="Partager"]'));
  out.partagee = { before, after, errs };
  await browser.close();
}
console.log(JSON.stringify(out));
await server.close();
