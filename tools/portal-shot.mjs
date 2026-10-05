// Captures du portail (première page) à des instants choisis (seek : le rendu logiciel est très lent), puis le
// choix du poème (le champ, clavier) et le retour. node tools/portal-shot.mjs [tel|insta|pc]
import { preview } from 'vite';
import { chromium } from 'playwright';
const sleep = ms => new Promise(r => setTimeout(r, ms));
// version compilée (dist, `vite build` avant) : immunisée contre les rechargements quand d'autres fichiers changent
const server = await preview({ preview: { port: 5199, strictPort: true, host: 'localhost' }, logLevel: 'error' });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const out = 'captures/portail/';
const only = process.argv[2];
// instants (s depuis l'arrivée) : paquet qui arrive, donne, tout posé (poème éclairé, saut), coin corné, la lumière sur la lettre
const MOMENTS = [['1-paquet', 0.9], ['2-donne', 1.75], ['3-donne', 2.5], ['4-poeme', 3.95], ['5-coin', 5.9], ['6-lettre', 10.9]];
for (const [name, vp, touch] of [['tel', { width: 390, height: 844 }, true], ['insta', { width: 390, height: 664 }, true], ['pc', { width: 1440, height: 810 }, false]].filter(v => !only || v[0] === only)) {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 });
  const page = await ctx.newPage(); page.setDefaultTimeout(300000);
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('http://localhost:5199/');
  await page.waitForFunction(() => window.__sg && window.__sg.portal && window.__sg.portal.readyFired);
  for (const [m, s] of MOMENTS) {
    await page.evaluate(s => window.__sg.portal.seek(s), s);
    await page.screenshot({ path: `${out}${name}-${m}.png` });
  }
  const st = await page.evaluate(() => window.__sg.portal.state());
  const r = await page.evaluate(() => { const r = window.__sg.portal.rect('poeme'); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await page.evaluate(() => window.__sg.portal.seek(30));
  await page.mouse.click(r[0], r[1]);
  await page.evaluate(() => window.__sg.portal.seek(30.5));
  await page.screenshot({ path: `${out}${name}-7-depart.png` });
  await page.evaluate(() => window.__sg.portal.run());
  await sleep(2500);
  const after = await page.evaluate(() => ({ focus: document.activeElement?.id, portal: window.__sg.S.portal }));
  await page.keyboard.type('LEA'); await sleep(1500);
  await page.screenshot({ path: `${out}${name}-8-champ.png` });
  await page.keyboard.press('Escape'); await sleep(500);
  const back = await page.evaluate(() => ({ portal: window.__sg.S.portal, text: window.__sg.model.text }));
  console.log(name, JSON.stringify({ st, after, back, errs }));
  await ctx.close();
}
await browser.close(); await new Promise(r => server.httpServer.close(r));
