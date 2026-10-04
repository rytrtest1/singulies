// planche de captures : node tools/planche.cjs prefixe sortie T1,T2,... (y0 h gain)
const { PNG } = require('pngjs'); const fs = require('fs');
const [pre, out, list, y0 = 0, h0 = 0, gain = 1.6] = process.argv.slice(2);
const ims = list.split(',').map((t) => PNG.sync.read(fs.readFileSync(`captures/transition/${pre}-${t}.png`)));
const W = ims[0].width, H = +h0 || ims[0].height, Y = +y0;
const o = new PNG({ width: (W + 6) * ims.length, height: H });
ims.forEach((im, k) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const si = ((Y + y) * W + x) * 4, di = (y * o.width + k * (W + 6) + x) * 4; for (let c = 0; c < 3; c++) o.data[di + c] = Math.min(255, im.data[si + c] * gain); o.data[di + 3] = 255; } });
fs.writeFileSync(`captures/transition/${out}.png`, PNG.sync.write(o));
