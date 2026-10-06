// Espaces au-dessus d'ETERNEL (haut de l'écran → haut des capitales) / en dessous (ligne de base → carte du haut), px CSS : plusieurs visites (donne tirée au hasard), au
// long de l'invitation (sauts, respiration). node tools/eternel-gap.mjs (après vite build)
import { preview } from 'vite';
import { chromium } from 'playwright';
const server = await preview({ preview: { port: 5197, strictPort: true, host: 'localhost' }, logLevel: 'error' });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const [n, vp] of [['tel', { width: 390, height: 844 }], ['insta', { width: 390, height: 664 }], ['petit', { width: 375, height: 600 }], ['pc', { width: 1440, height: 810 }]]) {
  const page = await browser.newPage({ viewport: vp });
  const res = [];
  for (let v = 0; v < 6; v++) {
    await page.goto('http://localhost:5197/');
    await page.waitForFunction(() => window.__sg?.portal?.readyFired && document.querySelector('.pt-sig')?.textContent === 'ETERNEL', null, { timeout: 60000 });
    let min = 1e9, cap = 0, above = 0;
    for (let s = 5.5; s < 22; s += 0.25) {
      const r = await page.evaluate(s => { const p = window.__sg.portal; p.seek(s); return new Promise(ok => requestAnimationFrame(() => requestAnimationFrame(() => {
        const sig = document.querySelector('.pt-sig'), fs = parseFloat(getComputedStyle(sig).fontSize);
        const c = document.createElement('canvas').getContext('2d'); c.font = `500 ${fs}px 'SG Garamond'`; const m = c.measureText('E');
        const base = sig.getBoundingClientRect().top + (fs - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
        const tops = ['poeme', 'lettre', 'livres'].map(id => p.rect(id).top);
        ok({ base, cap: m.actualBoundingBoxAscent, top: Math.min(...tops) });
      }))); }, s);
      min = Math.min(min, r.top - r.base); cap = r.cap; above = r.base - r.cap;
    }
    res.push(Math.round(above) + '/' + Math.round(min));
    if (v === 0) res.unshift('cap ' + Math.round(cap));
  }
  console.log(n, res.join(' '));
  await page.close();
}
await browser.close(); await server.close();
