// La machine à écrire en direct (machine.html) : captures de chaque vue, téléphone et ordinateur, après avoir tapé un prénom.
//   node tools/machine-shot.mjs <dossier> [PRENOM] [plat]
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
const out = process.argv[2] || 'captures-machine', name = process.argv[3] || 'LEA', flat = process.argv[4] === 'plat';
mkdirSync(out, { recursive: true });
const PORT = 5202;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const [tag, vw, vh, dpr] of [['tel', 390, 844, 2], ['pc', 1440, 900, 1]]) {
  const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: dpr });
  page.setDefaultTimeout(120000);
  page.on('pageerror', e => console.error('page', e));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('console', m.text()); });
  await page.goto(`http://localhost:${PORT}/machine.html?shot=1${flat ? '&plat=1' : ''}${process.env.MODELE ? '&modele=' + process.env.MODELE : ''}`);
  await page.waitForFunction(() => window.__machine);
  await page.evaluate(n => window.__machine.setText(n), name);
  await page.waitForTimeout(400 + name.length * 300 + 900);
  for (const v of ['feuille', 'face', 'haut', 'cote']) {
    // (images successives : la feuille monte une fois la frappe finie)
    await page.evaluate(async v => { window.__machine.setVue(v); for (let i = 0; i < 70; i++) { window.__machine.render(4); await new Promise(r => setTimeout(r, 40)); } }, v);
    const f = `${out}/${tag}-${v}-${name.replace(/ /g, '_')}${flat ? '-plat' : ''}.png`;
    writeFileSync(f, await page.screenshot());
    console.log(f);
  }
  await page.close();
}
await browser.close(); await server.close();
