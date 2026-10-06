// Essai du PDF de la demande : node tools/pdf-shot.mjs → captures/pdf/ (page en PNG + le PDF)
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const PORT = 5196;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on('pageerror', e => console.error('page', e));
await page.goto(`http://localhost:${PORT}/confidentialite.html`);
mkdirSync('captures/pdf', { recursive: true });
const cases = {
  reponse: { name: 'CLEMENCE ROSE', kind: 'reponse', id: 66, text: "celle qui m'a appris à rester, même quand tout disait de partir", mode: 'poste', address: ['Clémence Rose Martin', '12 rue des Lilas', '69004 Lyon'], date: '6 octobre 2026 à 10:12' },
  theme: { name: 'NOUR', kind: 'theme', text: "la mer en hiver, quand il n'y a plus personne", mode: 'direct', address: [], date: '6 octobre 2026 à 10:12' },
  impro: { name: 'LEA', kind: 'improvisation', text: '', mode: 'poste', address: ['Léa Martin', '3 rue Haute', '75011 Paris'], date: '6 octobre 2026 à 10:12' },
};
for (const [k, d] of Object.entries(cases)) {
  const r = await page.evaluate(async d => {
    const ff = [new FontFace('SG Garamond', 'url(./fonts/EBGaramond-500.woff2)', { weight: '500' }), new FontFace('SG Machine', 'url(./fonts/CourierPrime-latin.woff2)')];
    for (const f of ff) document.fonts.add(await f.load());
    const { composePage, pagePdf } = await import('/src/demande/pdf.js');
    const c = await composePage(d, './');
    const b = await pagePdf(c);
    const bytes = Array.from(new Uint8Array(await b.arrayBuffer()));
    const small = document.createElement('canvas'); small.width = 600; small.height = Math.round(600 * c.height / c.width);
    small.getContext('2d').drawImage(c, 0, 0, small.width, small.height);
    return { png: small.toDataURL('image/png'), bytes };
  }, d);
  writeFileSync(`captures/pdf/${k}.png`, Buffer.from(r.png.split(',')[1], 'base64'));
  writeFileSync(`captures/pdf/${k}.pdf`, Buffer.from(r.bytes));
  console.log(k, r.bytes.length, 'octets');
}
await browser.close(); await server.close();
