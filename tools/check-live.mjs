// Vérifs dynamiques : parallaxe, perte/restauration de contexte, mouvement réduit, erreurs.
import { preview } from 'vite';
import { chromium } from 'playwright';
const server = await preview({ preview: { port: 5197, strictPort: true }, logLevel: 'silent' });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const out = {};
try {
  const ctx = await browser.newContext({ viewport: { width: 1672, height: 941 } });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('http://localhost:5197/?seed=7');
  await page.waitForFunction(() => window.__sg?.field && window.__sg.S.t > 3);
  const c0 = await page.evaluate(() => ({ ...window.__sg.field.cam }));
  await page.mouse.move(1600, 900, { steps: 5 });
  await page.waitForTimeout(400); const c04 = await page.evaluate(() => ({ ...window.__sg.field.cam }));
  await page.waitForTimeout(2600); const c3 = await page.evaluate(() => ({ ...window.__sg.field.cam }));
  out.parallaxe = { avant: c0, '0,4 s': c04, '3 s': c3 };
  out.contexte = await page.evaluate(async () => {
    const ext = document.getElementById('c').getContext('webgl2').getExtension('WEBGL_lose_context');
    ext.loseContext(); await new Promise((r) => setTimeout(r, 300));
    const t1 = window.__sg.S.t; ext.restoreContext(); await new Promise((r) => setTimeout(r, 1500));
    return { tAvantRestauration: +t1.toFixed(2), tApres: +window.__sg.S.t.toFixed(2), drawCalls: window.__sg.stats.drawCalls, lettres: window.__sg.stats.letters };
  });
  out.erreurs = errors;
  await ctx.close();
  const rctx = await browser.newContext({ viewport: { width: 1672, height: 941 }, reducedMotion: 'reduce' });
  const rp = await rctx.newPage();
  await rp.goto('http://localhost:5197/?seed=7');
  await rp.waitForFunction(() => window.__sg?.field && window.__sg.S.t > 2);
  const z0 = await rp.evaluate(() => window.__sg.field.words.map((w) => w.z + w.X));
  await rp.waitForTimeout(2000);
  const z1 = await rp.evaluate(() => window.__sg.field.words.map((w) => w.z + w.X));
  out.mouvementReduit = { motsDeplaces: z0.filter((v, i) => v !== z1[i]).length };
  await rctx.close();
} finally { await browser.close(); await new Promise((r) => server.httpServer.close(r)); }
console.log(JSON.stringify(out, null, 1));
