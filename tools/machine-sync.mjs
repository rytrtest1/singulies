// (20/10) le film du mécanisme part avec la frappe de « tapé à la machine à écrire » : écart entre la 1re lettre et le début de lecture.
// node tools/machine-sync.mjs [port] [pc] (Edge : le Chromium de Playwright ne lit pas le H.264)
import { chromium } from 'playwright';
const PORT = +(process.argv.find(a => /^\d{4}$/.test(a)) || 5195), PC = process.argv.includes('pc');
const browser = await chromium.launch({ headless: true, channel: 'msedge', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const vp = PC ? { width: 1440, height: 900 } : { width: 390, height: 844 };
const ctx = await browser.newContext({ viewport: vp });
const page = await ctx.newPage();
await page.addInitScript(() => {
  window.__ev = [];
  const t0 = () => Math.round(performance.now());
  document.addEventListener('playing', e => { if (e.target.classList?.contains('of-mv')) window.__ev.push(['playing', t0(), +e.target.currentTime.toFixed(3)]); }, true);
  document.addEventListener('pause', e => { if (e.target.classList?.contains('of-mv')) window.__ev.push(['pause', t0(), +e.target.currentTime.toFixed(3)]); }, true);
  new MutationObserver(ms => { for (const m of ms) if (m.target.tagName === 'B' && m.target.classList.contains('on') && m.target.closest('.of-vit-t') && !window.__first) { window.__first = t0(); window.__ev.push(['1re lettre', t0(), (document.querySelector('.of-mv') || {}).currentTime]); } })
    .observe(document, { subtree: true, attributes: true, attributeFilter: ['class'] });
});
page.on('pageerror', e => console.log('ERR', String(e)));
await page.goto(`http://localhost:${PORT}/?envoi=0&seed=3`); await page.waitForTimeout(5000);
await page.mouse.click(vp.width / 2, vp.height / 2); await page.keyboard.type('LEA', { delay: 90 }); await page.keyboard.press('Enter');
await page.waitForFunction(() => window.__first, null, { timeout: 120000 });
await page.waitForTimeout(3500);
console.log(JSON.stringify(await page.evaluate(() => ({ ev: window.__ev, now: Math.round(performance.now()), vid: (v => v && { t: +v.currentTime.toFixed(2), paused: v.paused, ready: v.readyState, src: v.currentSrc.split('/').pop() })(document.querySelector('.of-mv')), on: document.querySelector('.of-mvw')?.classList.contains('on') })), null, 0));
await browser.close();
