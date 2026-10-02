// Mesures chiffrées : captures + comparaison avec ressources/imageref.png.
// Usage : node tools/measure.mjs [--out captures/etape2] [--sizes 1672x941,390x844] [--fps] [--query "grain=0"]
// Sort un JSON sur stdout (tableaux) et écrit les PNG dans --out.
import { preview } from 'vite';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('node tools/measure.mjs [--out DIR] [--sizes WxH,...] [--names "A|B"] [--fps] [--query QS] [--settle SECONDS]');
  process.exit(0);
}
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const OUT = opt('--out', 'captures/latest');
const SIZES = opt('--sizes', '1672x941,390x844').split(',').map((s) => s.split('x').map(Number));
const NAMES = opt('--names', '|LEA|CLEMENCE ROSE|MARIE CHARLOTTE ELOISE').split('|');
const QUERY = opt('--query', '');
const SETTLE = +opt('--settle', '4');
const FPS = args.includes('--fps');
fs.mkdirSync(OUT, { recursive: true });

const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
function stats(png) {
  const { width: w, height: h, data } = png;
  let n5 = 0, n20 = 0, n80 = 0, sum = 0;
  let bx0 = 1e9, by0 = 1e9, bx1 = -1, by1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, L = lum(data[i], data[i + 1], data[i + 2]);
    sum += L; if (L > 5) n5++; if (L > 20) n20++; if (L > 80) n80++;
    // boîte du prénom : pixels très clairs dans la bande centrale
    if (L > 200 && x > w * 0.35 && x < w * 0.65 && y > h * 0.38 && y < h * 0.52) {
      bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y);
    }
  }
  const N = w * h, pct = (v) => +(100 * v / N).toFixed(2);
  const box = bx1 < 0 ? null : { cx: +(100 * (bx0 + bx1) / 2 / w).toFixed(1), cy: +(100 * (by0 + by1) / 2 / h).toFixed(1), hPx: by1 - by0 + 1 };
  return { 'px>5 %': pct(n5), 'px>20 %': pct(n20), 'px>80 %': pct(n80), 'lum moy': +(sum / N).toFixed(2), 'prénom x %': box?.cx ?? '-', 'prénom y %': box?.cy ?? '-', 'prénom haut px': box?.hPx ?? '-' };
}

const ref = PNG.sync.read(fs.readFileSync('ressources/imageref.png'));
const rows = [{ capture: 'imageref.png', taille: `${ref.width}x${ref.height}`, ...stats(ref) }];

const server = await preview({ preview: { port: 5199, strictPort: true }, logLevel: 'silent' });
const url = `http://localhost:5199/${QUERY ? '?' + QUERY : ''}`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const perf = [];
try {
  for (const [w, h] of SIZES) {
    const mobile = w < 700;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
    for (const name of NAMES) {
      const page = await ctx.newPage();
      await page.goto(url);
      await page.waitForFunction(() => window.__sg && window.__sg.atlas, null, { timeout: 15000 });
      if (name) { await page.focus('#in'); await page.keyboard.type(name, { delay: 40 }); }
      await page.waitForFunction((s) => window.__sg.S.t > s, SETTLE, { timeout: 60000 });
      const file = path.join(OUT, `${w}x${h}-${name ? name.replace(/ /g, '_') : 'vide'}.png`);
      await page.screenshot({ path: file });
      const st = stats(PNG.sync.read(fs.readFileSync(file)));
      const model = await page.evaluate(() => window.__sg.model.text);
      rows.push({ capture: path.basename(file), taille: `${w}x${h}`, texte: model, ...st });
      if (FPS && name === NAMES[NAMES.length - 1]) {
        const r = await page.evaluate(() => new Promise((res) => {
          let n = 0; const t0 = performance.now();
          const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else res({ fps: +(n / 3).toFixed(1), drawCalls: window.__sg.stats?.drawCalls ?? '-', gpuMB: window.__sg.stats?.gpuMB ?? '-' }); };
          requestAnimationFrame(f);
        }));
        perf.push({ taille: `${w}x${h}`, ...r });
      }
      await page.close();
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  await new Promise((r) => server.httpServer.close(r));
}
console.log(JSON.stringify({ captures: rows, perf }, null, 1));
