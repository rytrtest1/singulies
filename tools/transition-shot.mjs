// Captures de la transition accueil → cartes, à des instants donnés (temps de la page, pas de l'horloge) :
// node tools/transition-shot.mjs [largeur hauteur prénom] → captures/transition/<l>x<h>-<T>.png
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const [W = 390, H = 844, NAME = 'Léa'] = process.argv.slice(2);
const PORT = 5197, OUT = 'captures/transition';
mkdirSync(OUT, { recursive: true });
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: +W, height: +H } });
page.setDefaultTimeout(240000);
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://localhost:${PORT}/?seed=7`);
await page.waitForFunction(() => window.__sg && window.__sg.atlas, null, { timeout: 60000 });
await page.focus('#in');
await page.keyboard.type(NAME, { delay: 60 });
await page.keyboard.press('Enter');
await page.waitForFunction(() => window.__sg.S.t > 9, null, { timeout: 120000 });   // la lumière s'est posée
const tag = `${W}x${H}`;
await page.screenshot({ path: `${OUT}/${tag}-avant.png` });
await page.evaluate(() => window.__sg.startTransition());
const info = await page.evaluate(() => ({ flyers: window.__sg.plan?.flyers.length, fed: window.__sg.plan?.fed }));
console.log('lettres qui partent', info);
for (const T of [0.8, 1.6, 2.4, 3.2, 4.0, 4.8, 5.6, 6.2, 6.8]) {
  if (process.env.SKIP) { await page.waitForFunction(() => window.__sg.S.t - window.__sg.S.trans >= 6.6, null, { timeout: 240000 }); await page.screenshot({ path: `${OUT}/${tag}-avant-relais.png` }); break; }
  const ok = await page.waitForFunction((T) => { const S = window.__sg.S; return S.phase === 'scene' || S.t - S.trans >= T; }, T, { timeout: 120000 }).then(() => true, () => false);
  if (!ok) break;
  const ph = await page.evaluate(() => window.__sg.S.phase);
  if (ph === 'scene') break;
  await page.screenshot({ path: `${OUT}/${tag}-T${T.toFixed(1)}.png` });
}
await page.waitForFunction(() => window.__sg.S.phase === 'scene', null, { timeout: 120000 });
const c = await page.evaluate(() => ({ frames: window.__sg.cards?.frames }));
console.log('scène des cartes', c);
await page.screenshot({ path: `${OUT}/${tag}-relais.png` });
await page.waitForFunction(() => window.__sg.cards.frames > 40, null, { timeout: 120000 });
await page.screenshot({ path: `${OUT}/${tag}-cartes.png` });
console.log('erreurs', errors);
await browser.close();
await server.close();
