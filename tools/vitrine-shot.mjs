// La vitrine de alt.html (10/10) : chaque objet de l'envoi en boucle vidéo, rendue par le vrai moteur.
//   carte, carbone, fil : vitrine-rendu.html, image par image
//   enveloppe           : la vraie scène (scene-cartes.html, sans adresse) — la feuille et la carte entrent, le cachet
// node tools/vitrine-shot.mjs [carte] [carbone] [fil] [enveloppe] → public/vitrine/<id>.mp4 + <id>.jpg (dernière image)
// et captures/vitrine/<id>-planche.jpg (une image par seconde, pour regarder). ffmpeg : C:\ffmpeg\ffmpeg ou dans le PATH.
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, rmSync, existsSync, copyFileSync } from 'fs';
import { execFileSync } from 'child_process';

const FPS = 30, PORT = 5198;
const FF = existsSync('C:/ffmpeg/ffmpeg.exe') ? 'C:/ffmpeg/ffmpeg.exe' : 'ffmpeg';
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['carte', 'enveloppe', 'carbone', 'fil'];
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
mkdirSync('public/vitrine', { recursive: true });

// dir : les images ; dir2 (facultatif) : un second plan, enchaîné en fondu (0,4 s) sur la fin du premier
function encode(id, dir, n, dir2 = null, n2 = 0) {
  const out = `public/vitrine/${id}.mp4`, XF = 0.4;
  const vf = 'scale=in_range=pc:out_range=tv,format=yuv420p,lutyuv=u=128:v=128';   // tout est gris : chroma neutre (sinon une teinte verte)
  const args = ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', `${dir}/f%04d.jpg`];
  if (dir2) args.push('-framerate', String(FPS), '-i', `${dir2}/f%04d.jpg`, '-filter_complex', `[0][1]xfade=transition=fade:duration=${XF}:offset=${(n / FPS - XF).toFixed(3)},${vf}`);
  else args.push('-vf', vf);
  execFileSync(FF, [...args, '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-tune', 'animation',
    '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', '-an', out]);
  const last = dir2 ? `${dir2}/f${String(n2 - 1).padStart(4, '0')}.jpg` : `${dir}/f${String(n - 1).padStart(4, '0')}.jpg`;
  copyFileSync(last, `public/vitrine/${id}.jpg`);
  const total = n + n2, cols = 5, rows = Math.ceil(total / FPS / cols);
  execFileSync(FF, ['-y', '-loglevel', 'error', '-i', out,
    '-vf', `select='not(mod(n\,${FPS}))',scale=207:345,tile=${cols}x${rows}`, '-frames:v', '1', '-q:v', '3', `captures/vitrine/${id}-planche.jpg`]);
  console.log(id, total, 'images →', out);
}
const save = (dir, i, url) => writeFileSync(`${dir}/f${String(i).padStart(4, '0')}.jpg`, Buffer.from(url.split(',')[1], 'base64'));

for (const id of ids) {
  const dir = `captures/vitrine/${id}`;
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 414, height: 690 }, deviceScaleFactor: 2 });
  page.setDefaultTimeout(300000);
  page.on('pageerror', e => console.error('page', e));
  page.on('console', m => { if (m.type() === 'error') console.error('console', m.text()); });
  let n = 0, nA = 0;
  const dir2 = dir + '-b';
  rmSync(dir2, { recursive: true, force: true });
  if (id === 'enveloppe') {
    // la vraie scène, horloge pilotée : la feuille (prénom en colonne), l'enveloppe monte, la feuille et la carte s'y
    // glissent, elle se retourne ; sans adresse, elle se ferme seule : le rabat, le cachet. On coupe l'attente de
    // l'adresse (entre le retournement et l'envoi) et on s'arrête quand la vue a reculé, le cachet posé.
    await page.goto(`http://localhost:${PORT}/scene-cartes.html?prenom=JULIE&seed=5&reponse=${encodeURIComponent('la mer, le soir')}&adresse=0&envoi=0&test=0`);
    await page.waitForFunction(() => window.__scene && window.__scene.ready);
    await page.waitForTimeout(800);
    await page.evaluate(async () => { await window.__toSheet(); });
    await page.evaluate(() => { const m = window.__scene; window.__at(m.sheet.timing.CURSOR_AT + 0.4); m.sheet.showOrders(); document.getElementById('log').style.display = 'none'; document.querySelectorAll('.sc-back,.sc-pass').forEach(e => e.style.display = 'none'); });
    let cur = dir;
    const shotCanvas = async () => { const b = await page.locator('#c').screenshot({ type: 'jpeg', quality: 92 }); writeFileSync(`${cur}/f${String(n).padStart(4, '0')}.jpg`, b); n++; };
    const st = () => page.evaluate(() => { const e = window.__scene.sheet.state().env; return e ? { post: e.posted } : null; });
    const adv = d => page.evaluate(d => window.__scene.advance(d), d);
    // 1) la feuille glisse dans l'enveloppe (horloge de l'enveloppe ÷ 1,45 : la glissade finit vers 3,25 s)
    for (let i = 0; i < Math.round(3.5 * FPS); i++) { await shotCanvas(); await adv(1 / FPS); }
    nA = n; n = 0; cur = dir2; mkdirSync(dir2, { recursive: true });
    // 2) sans images : le retournement, l'expéditeur, l'attente de l'adresse, jusqu'à l'envoi, puis l'enveloppe se
    //    retourne de nouveau (rabat ouvert) — on reprend là, enchaîné en fondu : le rabat se ferme, le cachet se fait
    for (let k = 0; k < 600; k++) { const s = await st(); if (s && s.post) break; await adv(0.05); }
    await adv(1.55);
    for (let i = 0; i < Math.round(4.0 * FPS); i++) { await shotCanvas(); await adv(1 / FPS); }
    for (let i = 0; i < 24; i++) await shotCanvas();   // on reste un instant sur le cachet
  } else {
    await page.goto(`http://localhost:${PORT}/vitrine-rendu.html`);
    await page.waitForFunction(() => window.__vit && window.__vit.ready);
    const dur = await page.evaluate(id => window.__vit.dur(id), id);
    for (let i = 0; i <= Math.round(dur * FPS); i++) save(dir, n++, await page.evaluate(([id, t]) => window.__vit.frame(id, t), [id, i / FPS]));
  }
  await page.close();
  if (nA) encode(id, dir, nA, dir2, n); else encode(id, dir, n);
}
await browser.close(); await server.close();
