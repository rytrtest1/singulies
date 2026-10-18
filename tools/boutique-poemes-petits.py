# Les poèmes d'exemple en petit (défilé de l'accueil de la boutique) : public/boutique/poeme-<prénom>-s.jpg, 800 px de large.
# python tools/boutique-poemes-petits.py   (après node tools/boutique-poemes-shot.mjs)
from PIL import Image
import glob, os
for f in glob.glob('public/boutique/poeme-*.jpg'):
    if f.endswith('-s.jpg'): continue
    im = Image.open(f).convert('RGB')
    h = round(im.height * 800 / im.width)
    im.resize((800, h), Image.LANCZOS).save(f[:-4] + '-s.jpg', quality=82, optimize=True)
    print(os.path.basename(f[:-4] + '-s.jpg'), os.path.getsize(f[:-4] + '-s.jpg') // 1024, 'Ko')
