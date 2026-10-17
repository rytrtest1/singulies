// Le paquet après la réservation, image par image (serveur de développement). node tools/shuffle-frames.mjs [pc] → captures/shuffle/planche-*.jpg
import { chromium } from 'playwright';
import { mkdirSync, rmSync } from 'fs';
import { execFileSync } from 'child_process';
const PC = process.argv[2] === 'pc', PORT = 5195, dir = 'captures/shuffle';
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'msedge', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const vp = PC ? { width: 1440, height: 900 } : { width: 390, height: 844 };
const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('ERR', String(e)));
await page.goto(`http://localhost:${PORT}/?envoi=0&seed=3`); await page.waitForTimeout(5000);
await page.mouse.click(vp.width / 2, vp.height / 2); await page.keyboard.type('LEA', { delay: 90 }); await page.keyboard.press('Enter');
await page.waitForFunction(() => document.querySelector('#offre.on.bar-on'), null, { timeout: 90000 }); await page.waitForTimeout(800);
await page.click('.of-bar .of-go'); await page.waitForTimeout(900);
if (await page.$('.mc [data-for]')) await page.click('.mc [data-for="moi"]');
await page.waitForFunction(() => window.__sg.cardsApi?.scene?.state().shuffling, null, { timeout: 60000 }).catch(() => console.log('pas de mélange'));
await page.waitForTimeout(800);
const N = 48;
for (let i = 0; i < N; i++) { await page.screenshot({ path: `${dir}/f${String(i).padStart(2, '0')}.png` }); await page.waitForTimeout(110); }
const crop = PC ? 'crop=900:520:270:190,scale=225:-1,tile=8x6' : 'crop=390:520:0:170,scale=130:-1,tile=8x6';
execFileSync('C:/ffmpeg/ffmpeg.exe', ['-y', '-loglevel', 'error', '-framerate', '1', '-i', `${dir}/f%02d.png`, '-vf', crop, '-frames:v', '1', `${dir}/planche${PC ? '-pc' : ''}.jpg`]);
await browser.close();
