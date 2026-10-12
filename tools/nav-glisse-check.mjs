// Le bandeau des pages se fait glisser (12/10) ; changer de page pendant une transition ; le livre tourné à la main.
// node tools/nav-glisse-check.mjs [pc] → captures/nav-glisse/*.png + états dans la console (version figée)
import { build, preview } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync, rmSync } from 'fs';
const PC = process.argv[2] === 'pc', PORT = 5211, OUT = 'C:/Users/maxen/AppData/Local/Temp/claude/nav-glisse-dist', dir = 'captures/nav-glisse';
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
await build({ logLevel: 'error', build: { outDir: OUT, emptyOutDir: true } });
const server = await preview({ build: { outDir: OUT }, preview: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const vp = PC ? { width: 1440, height: 900 } : { width: 390, height: 844 };
const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1, hasTouch: !PC });
page.on('pageerror', e => console.log('ERR', String(e)));
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('console', m.text()); });
const shot = n => page.screenshot({ path: `${dir}/${n}.png` });
const state = () => page.evaluate(() => ({ page: window.__lv?.page, cur: [...document.querySelectorAll('.nv-l.cur')].map(a => a.textContent).join('|'), busy: window.__lv?.busy, url: location.pathname }));
// glisser sur le bandeau (souris tenue : mêmes événements de pointeur)
const swipe = async (dx, ms = 260) => {
  const y = 24, x0 = vp.width / 2;
  await page.mouse.move(x0, y); await page.mouse.down();
  const n = 12; for (let i = 1; i <= n; i++) { await page.mouse.move(x0 + dx * i / n, y); await page.waitForTimeout(ms / n); }
  await page.mouse.up();
};
await page.goto(`http://localhost:${PORT}/livres.html?envoi=0`);
await page.evaluate(() => { window.__lv = null; });
await page.waitForTimeout(2500);
// le livre : tenu, glissé à droite, puis vers le bas
const box = await page.evaluate(() => { const r = document.querySelector('.lt-book').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
await shot('livre-0');
await page.mouse.move(box.x, box.y); await page.mouse.down();
for (let i = 1; i <= 10; i++) { await page.mouse.move(box.x + 14 * i, box.y + 3 * i); await page.waitForTimeout(25); }
await page.waitForTimeout(150);
await shot('livre-1-tourne');
for (let i = 1; i <= 10; i++) { await page.mouse.move(box.x + 140 + 16 * i, box.y + 30); await page.waitForTimeout(25); }
await page.waitForTimeout(150);
await shot('livre-2-dos');
await page.mouse.up();
await page.waitForTimeout(4500);
await shot('livre-3-revenu');
// le bandeau : glisser vers la gauche = la page de droite
console.log('avant', JSON.stringify(await state()));
await swipe(-130);
await page.waitForTimeout(250);
await shot('bandeau-glisse');
console.log('glissé ←', JSON.stringify(await state()));
// pendant la transition : glisser encore (elle se termine d'un coup, la suivante part)
await swipe(-130, 150);
await page.waitForTimeout(1300);
console.log('glissé ← pendant', JSON.stringify(await state()));
await shot('bandeau-2');
// un toucher pendant une transition
await swipe(130);
await page.waitForTimeout(120);
const t = await page.evaluate(() => { const a = [...document.querySelectorAll('.nv-l')].find(e => !e.classList.contains('cur') && !e.classList.contains('far') && e.getBoundingClientRect().left > innerWidth / 2); if (!a) return null; const r = a.getBoundingClientRect(); return { x: Math.min(r.left + 20, innerWidth - 10), y: r.top + r.height / 2, txt: a.textContent }; });
if (t) { await page.mouse.click(t.x, t.y); console.log('toucher pendant', t.txt); }
await page.waitForTimeout(1400);
console.log('fin', JSON.stringify(await state()));
await shot('fin');
await browser.close(); server.httpServer.close();
