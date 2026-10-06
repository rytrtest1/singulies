// Images fixes de l'email, rendues par le vrai moteur (email-assets.html) puis enregistrées dans public/email/ :
//   q/<id>.jpg (les cartes questions), q/blanche.jpg (la carte blanche), l/<A–Z>.png (lettres du prénom) + l/tailles.json
// node tools/email-assets.mjs [--gpu]   (sans GPU : rendu logiciel, lent)
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const PORT = 5197;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const gpu = process.argv.includes('--gpu');
const browser = await chromium.launch({ headless: true, args: gpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
page.setDefaultTimeout(600000);
page.on('pageerror', e => console.error('page', e));
await page.goto(`http://localhost:${PORT}/email-assets.html`);
await page.waitForFunction(() => window.__assets && window.__assets.ready);
const save = (path, url) => writeFileSync(path, Buffer.from(url.split(',')[1], 'base64'));
mkdirSync('public/email/q', { recursive: true }); mkdirSync('public/email/l', { recursive: true });

const sizes = {};
for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
  const r = await page.evaluate(c => window.__assets.letter(c), ch);
  save(`public/email/l/${ch}.png`, r.url); sizes[ch] = [r.w, r.h];
}
writeFileSync('public/email/l/tailles.json', JSON.stringify(sizes));
console.log('lettres ok');
save('public/email/q/blanche.jpg', await page.evaluate(() => window.__assets.blanche()));
const ids = await page.evaluate(() => window.__assets.questions);
const t0 = Date.now();
for (const id of ids) {
  save(`public/email/q/${id}.jpg`, await page.evaluate(i => window.__assets.card(i), id));
  if (id % 10 === 0) console.log('carte', id, ((Date.now() - t0) / 1000).toFixed(0) + ' s');
}
console.log('cartes ok', ids.length);
await browser.close(); await server.close();
