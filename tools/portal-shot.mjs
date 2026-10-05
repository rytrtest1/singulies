// Captures du portail (première page) : arrivée, cartes posées, « bientôt », choix du poème, retour.
import { createServer } from 'vite';
import { chromium } from 'playwright';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const server = await createServer({ server: { port: 5199, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const out = 'captures/portail/';
const only = process.argv[2];
for (const [name, vp, touch] of [['tel', { width: 390, height: 844 }, true], ['insta', { width: 390, height: 664 }, true], ['pc', { width: 1440, height: 810 }, false]].filter(v => !only || v[0] === only)) {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 });
  const page = await ctx.newPage(); page.setDefaultTimeout(240000);
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  const t0 = Date.now();
  await page.goto('http://localhost:5199/');
  await page.waitForFunction(() => window.__sg && window.__sg.portal, null, { timeout: 30000 });
  const ready = Date.now() - t0;
  await sleep(500); await page.screenshot({ path: `${out}${name}-1-arrivee.png` });
  await sleep(2500); await page.screenshot({ path: `${out}${name}-2-cartes.png` });
  const rects = await page.evaluate(() => ['poeme', 'lettre', 'livres', 'jeu'].map(id => { const r = window.__sg.portal.rect(id); return [id, Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; }));
  const r = rects[1];
  await page.mouse.click(r[1] + r[3] / 2, r[2] + r[4] / 2);
  await sleep(1300); await page.screenshot({ path: `${out}${name}-3-bientot.png` });
  await sleep(3000);
  const p = rects[0];
  await page.mouse.click(p[1] + p[3] / 2, p[2] + p[4] / 2);
  await sleep(400); await page.screenshot({ path: `${out}${name}-4-depart.png` });
  await sleep(2200);
  const st = await page.evaluate(() => ({ focus: document.activeElement?.id, portal: window.__sg.S.portal, phase: window.__sg.S.phase }));
  await page.keyboard.type('LEA'); await sleep(1500);
  await page.screenshot({ path: `${out}${name}-5-champ.png` });
  await page.keyboard.press('Escape'); await sleep(1800);
  const back = await page.evaluate(() => ({ portal: window.__sg.S.portal, text: window.__sg.model.text }));
  await page.screenshot({ path: `${out}${name}-6-retour.png` });
  console.log(name, JSON.stringify({ ready, rects, st, back, errs }));
  await ctx.close();
}
await browser.close(); await server.close();
