// Capture du banc d'essai de la carte (serveur Vite de dev intégré + Chromium logiciel).
//   node tools/bench-shot.mjs sortie.png "#lightAz=10&h=0.2" [largeur hauteur]
// Écrit aussi, sur la sortie standard, la luminance moyenne du papier (rendu) dans une zone sans logo,
// à comparer à la photo (même zone, mêmes coordonnées en mm).
import { createServer } from 'vite';
import { chromium } from 'playwright';

const [out = 'bench.png', hash = '', W = '1600', H = '520'] = process.argv.slice(2);
const server = await createServer({ server: { port: 5197, strictPort: true }, logLevel: 'silent' });
await server.listen();
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +W, height: +H } });
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push(String(e)));
await page.goto(`http://localhost:5197/banc-carte.html${hash.startsWith('#') ? hash : '#' + hash}`);
await page.waitForFunction(() => window.__bench?.ready, null, { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(800);
await page.screenshot({ path: out });
// luminance moyenne : bande gauche de la carte (x 4–20 mm, y 8–44 mm) dans le rendu et dans la photo
const lum = await page.evaluate(() => {
  const cv = document.getElementById('c'), img = document.getElementById('ref');
  const mean = (src, w, h, rx) => {
    const c = new OffscreenCanvas(w, h), x = c.getContext('2d'); x.drawImage(src, 0, 0, w, h);
    const fit = Math.min(w / rx[0], h / rx[1]), ox = (w - rx[0] * fit) / 2, oy = (h - rx[1] * fit) / 2;
    const d = x.getImageData(Math.round(ox + 4 * fit), Math.round(oy + 8 * fit), Math.round(16 * fit), Math.round(36 * fit)).data;
    let s = 0; for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    return +(s / (d.length / 4)).toFixed(1);
  };
  return { rendu: mean(cv, cv.width, cv.height, [87, 51.5]), photo: img.complete && img.naturalWidth ? mean(img, img.naturalWidth, img.naturalHeight, [87, 51.5]) : null };
});
console.log(JSON.stringify({ luminance: lum, erreurs: errs }));
await browser.close();
await server.close();

// Loupe : node tools/bench-shot.mjs sortie.png "#..." W H x,y,w,h(mm, origine en haut à gauche) gain
// → sortie-loupe.png : photo à gauche, rendu à droite, même cadrage, même étirement (v − 8) × gain.
const zoom = process.argv[6];
if (zoom) {
  const { PNG } = await import('pngjs');
  const fs = await import('node:fs');
  const [zx, zy, zw, zh] = zoom.split(',').map(Number), gain = +(process.argv[7] || 5);
  const im = PNG.sync.read(fs.readFileSync(out));
  const half = im.width / 2, fit = Math.min(half / 87, im.height / 51.5);
  const ox = (half - 87 * fit) / 2, oy = (im.height - 51.5 * fit) / 2;
  const cw = Math.round(zw * fit), ch = Math.round(zh * fit);
  const o = new PNG({ width: cw * 2 + 6, height: ch });
  for (let side = 0; side < 2; side++) for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const sx = Math.round(side * half + ox + zx * fit + x), sy = Math.round(oy + zy * fit + y);
    const v = im.data[4 * (sy * im.width + sx)];
    const k = 4 * (y * o.width + x + side * (cw + 6));
    o.data[k] = o.data[k + 1] = o.data[k + 2] = Math.max(0, Math.min(255, (v - 8) * gain)); o.data[k + 3] = 255;
  }
  fs.writeFileSync(out.replace(/\.png$/, '-loupe.png'), PNG.sync.write(o));
}
