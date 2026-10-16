// Ce que coûte la préparation des pages voisines (17/10) : profil JS (CDP) pendant qu'elles se montent, sur la page
// des prénoms ; les fonctions les plus lourdes et les images > 50 ms. Version figée. node tools/preload-prof.mjs
import { build, preview } from 'vite';
import { chromium } from 'playwright';
const PORT = 5196, OUT = 'C:/Users/maxen/AppData/Local/Temp/claude/prof-dist';
await build({ logLevel: 'error', build: { outDir: OUT, emptyOutDir: true, minify: false } });
const server = await preview({ build: { outDir: OUT }, preview: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: process.env.PC ? { width: 1440, height: 900 } : { width: 390, height: 844 }, deviceScaleFactor: process.env.PC ? 1 : 2 });
page.on('pageerror', e => console.log('ERR', String(e)));
page.on('console', m => { if (/^\[prep\]/.test(m.text())) console.log(m.text()); });
await page.addInitScript(() => {
  window.__fr = []; let last = 0;
  const f = t => { if (last) window.__fr.push([+(t / 1000).toFixed(2), +(t - last).toFixed(0)]); last = t; requestAnimationFrame(f); };
  requestAnimationFrame(f);
});
await page.goto(`http://localhost:${PORT}/index.html?envoi=0&seed=3${process.env.Q || ''}`);
const cdp = await page.context().newCDPSession(page);
await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
await page.waitForTimeout(+(process.env.AT || 3000));
await cdp.send('Profiler.start');
if (!process.env.NOFORCE) await page.evaluate(() => window.__nav?.preload?.());
await page.waitForTimeout(+(process.env.DUR || 8000));
const { profile } = await cdp.send('Profiler.stop');
const self = new Map(), dt = profile.timeDeltas; const byId = new Map(profile.nodes.map(n => [n.id, n]));
profile.samples.forEach((id, i) => { const n = byId.get(id), k = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop()}:${n.callFrame.lineNumber}`; self.set(k, (self.get(k) || 0) + (dt[i] || 0) / 1000); });
console.log([...self].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => v.toFixed(0).padStart(6) + ' ms  ' + k).join('\n'));
console.log(JSON.stringify(await page.evaluate(() => window.__fr.filter(x => x[1] > 50))));
await browser.close(); server.httpServer.close();
