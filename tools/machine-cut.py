# La machine, v7 (17/10, Maxence : « le mécanisme doit frapper plus vite, une vraie allure de frappe, pas de moments sans frappe,
# et ne jamais figer l'image quand le marteau touche le papier »). Part de public/vrai/machine-6.mp4 :
#  - les mains (images 0 à 41, avec le fondu vers le mécanisme) sont gardées telles quelles ;
#  - du mécanisme, on ne garde que les frappes (le marteau visible en diagonale, ≥ 70 pixels clairs sous les piliers) avec deux
#    images de repos avant et après chacune : tout le reste (les temps morts) est coupé ;
#  - le mécanisme est accéléré (2 images sur 3 gardées : ×1,5) ;
#  - src/alt/machine.json : l'image de départ du mécanisme (« loop ») et les fenêtres de repos (marteau absent, hors du
#    papier) où l'on peut figer l'image sans jamais couper un coup de marteau.
# python tools/machine-cut.py   (ffmpeg : C:/ffmpeg/ffmpeg ; Pillow)
import glob, json, os, subprocess, sys, tempfile
from PIL import Image

SRC = 'public/vrai/machine-6.mp4'
OUT = 'public/vrai/machine-7.mp4'
FF = 'C:/ffmpeg/ffmpeg'
HANDS_END = 42          # (images 0–41 : les mains et leur fondu)
FPS = 24

def counts(path):
    d = tempfile.mkdtemp()
    subprocess.run([FF, '-v', 'error', '-y', '-i', path, '-vf', 'scale=360:-1', os.path.join(d, 'f%04d.png')], check=True)
    fs = sorted(glob.glob(os.path.join(d, 'f*.png')))
    out = []
    for f in fs:
        im = Image.open(f).convert('L'); W, H = im.size
        reg = im.crop((int(W * 0.15), int(H * 0.14), int(W * 0.85), int(H * 0.62))); px = reg.load(); w, h = reg.size
        out.append(sum(1 for y in range(h) for x in range(w) if px[x, y] > 14))
    return out

c = counts(SRC)
n = len(c)
# les frappes : suites d'images où le marteau est visible, regroupées (écart ≤ 3 images)
hit = [i for i in range(HANDS_END, n) if c[i] > 70]
bursts = []
for i in hit:
    if bursts and i - bursts[-1][1] <= 3: bursts[-1][1] = i
    else: bursts.append([i, i])
rest = lambda i: 0 <= i < n and c[i] < 60
keep = set()
for a, b in bursts:
    a0 = a - 1
    while rest(a0) is False and a0 > HANDS_END: a0 -= 1
    b0 = b + 1
    while rest(b0) is False and b0 < n - 1: b0 += 1
    for k in range(max(HANDS_END, a0 - 1), min(n - 1, b0 + 1) + 1): keep.add(k)
mech = sorted(keep)
# accélération : 2 images sur 3
fast = [k for j, k in enumerate(mech) if j % 3 != 1]
print('frappes', len(bursts), 'images gardées', len(mech), '->', len(fast))
sel = '+'.join(f'eq(n\\,{k})' for k in fast)
hands = f'trim=start_frame=0:end_frame={HANDS_END},setpts=PTS-STARTPTS'
flt = f"[0:v]{hands}[h];[0:v]select='{sel}',setpts=N/({FPS}*TB)[m];[h][m]concat=n=2:v=1:a=0,fps={FPS}[o]"
scr = tempfile.NamedTemporaryFile('w', suffix='.txt', delete=False, encoding='utf-8'); scr.write(flt); scr.close()
subprocess.run([FF, '-v', 'error', '-y', '-i', SRC, '-filter_complex_script', scr.name, '-map', '[o]', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], check=True)
# fenêtres de repos de la vidéo finale
c2 = counts(OUT)
wins, s = [], None
for i, v in enumerate(c2):
    if i < HANDS_END: continue
    if v < 60 and s is None: s = i
    if v >= 60 and s is not None:
        if i - s >= 2: wins.append([round((s + 0.35) / FPS, 3), round((i - 0.15) / FPS, 3)])
        s = None
if s is not None and len(c2) - s >= 2: wins.append([round((s + 0.35) / FPS, 3), round(len(c2) / FPS, 3)])
meta = { 'loop': round(HANDS_END / FPS, 3), 'duration': round(len(c2) / FPS, 3), 'rest': wins }
json.dump(meta, open('src/alt/machine.json', 'w'))
print(meta['loop'], meta['duration'], len(wins), 'fenêtres de repos')
