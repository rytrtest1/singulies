# Images de l'email (hébergées sur le site, public/email/) : Gmail n'inverse jamais une image en mode sombre.
#  - papier.jpg : le papier noir des cartes (photo réelle public/cards/paper.jpg), ramené à sa clarté du site
#  - sceau.png : le logo SS-cœur gaufré à sec sur ce papier, lumière rasante de côté (comme sur les cartes)
# Usage : python tools/email-images.py
import math
from PIL import Image, ImageFilter
import numpy as np

paper = np.asarray(Image.open('public/cards/paper.jpg').convert('L'), dtype=np.float32)
h, w = paper.shape

def paper_tile(size, x0, y0, base=10.0, k=0.11):
    p = paper[y0:y0 + size, x0:x0 + size]
    return np.clip(base + (p - p.mean()) * k, 0, 255)

# fond : 600 × 600, centre de la photo (la zone du logo comblée est évitée)
fond = paper_tile(600, 120, 300)
Image.fromarray(fond.astype(np.uint8)).save('public/email/papier.jpg', quality=82, optimize=True)

# sceau : distance signée du logo (R fort, V faible : ±2 mm) → relief → éclairage
lg = np.asarray(Image.open('public/cards/logo.png'), dtype=np.float32)
d = ((lg[..., 0] * 256 + lg[..., 1]) / 65535 * 2 - 1) * 2.0            # mm, < 0 dans le logo
S = 360
d = np.asarray(Image.fromarray(d).resize((S, S), Image.BILINEAR))
a = np.clip(-d / 0.18, 0, 1); b = np.clip(-d / 1.1, 0, 1)
hgt = 0.7 * (a * a * (3 - 2 * a)) + 0.3 * (b * b * (3 - 2 * b))           # pied raide + épaule arrondie
hgt = np.asarray(Image.fromarray((hgt * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8)), dtype=np.float32) / 255
gy, gx = np.gradient(hgt * 6.0)
L = np.array([-0.62, -0.55, 0.56]); L /= np.linalg.norm(L)              # rasante, en haut à gauche
n = np.dstack([-gx, -gy, np.ones_like(gx)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
shade = (n @ L) / L[2]                                                    # 1 = à plat
base = paper_tile(S, 700, 400, base=13.0)
out = np.clip(base * (0.35 + 0.65 * shade) + np.clip(shade - 1, 0, None) * 44, 0, 255)
Image.fromarray(out.astype(np.uint8)).save('public/email/sceau.png', optimize=True)
print('ok', fond.mean(), out.mean())
