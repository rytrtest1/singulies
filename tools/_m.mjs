import { createServer } from 'vite';
import { chromium } from 'playwright';
const PORT = 5209;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.setDefaultTimeout(90000);
const R = sel => page.evaluate(sel => [...document.querySelectorAll(sel)].map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom), Math.round(844 - r.bottom)]; }), sel);
for (const u of ['lettre.html', 'livres.html']) {
  await page.goto(`http://localhost:${PORT}/${u}?envoi=0`); await page.waitForTimeout(5000);
  console.log(u, 'sign', JSON.stringify(await R('.lt-sign')), 'prix', JSON.stringify(await R('.lt-pr')), 'cap', JSON.stringify(await R('.lt-cap-t')), 'grab', JSON.stringify(await R('.lt-grab')), 'foot', JSON.stringify(await R('.nv-foot button')));
}
await page.goto(`http://localhost:${PORT}/?envoi=0&seed=3&paiement=faux`);
await page.waitForTimeout(8000);
await page.mouse.click(195, 422); await page.keyboard.type('LEA', { delay: 140 }); await page.keyboard.press('Enter');
await page.waitForFunction(() => document.querySelector('#offre.bar-on'));
await page.waitForTimeout(9000);
console.log('poeme', 'sign', JSON.stringify(await R('.of-bar .of-go')), 'prix', JSON.stringify(await R('.of-price')), 'down', JSON.stringify(await R('.of-down')), 'cap', JSON.stringify(await R('.of-vit-t')), 'foot', JSON.stringify(await R('.nv-foot button')), 'nav', JSON.stringify(await R('.nv.on')));
await page.screenshot({ path: process.argv[2] + '/poeme-entree.png' });
await browser.close(); await server.close();
