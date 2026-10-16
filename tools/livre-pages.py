# Les pages des livres à feuilleter (16/10) : quelques doubles pages tirées des PDF KDP (intérieur), en encre blanche sur
# papier noir (8 px / mm), comme la couverture. python tools/livre-pages.py <recueil.pdf> <journal.pdf>
# → public/livres/pages/<id>-<n>.png + pages.json ({ id: [[gauche, droite], …] })
import sys, json, random, fitz
from PIL import Image, ImageOps
PX = 8
OUT = 'public/livres/pages'
books = [('recueil', sys.argv[1], 127.0, 203.2), ('journal', sys.argv[2], 152.4, 228.6)]
rnd = random.Random(16)
res = {}
for bid, path, w, h in books:
    d = fitz.open(path)
    full = [i for i, p in enumerate(d) if len(p.get_text().strip()) > 60]
    # (des doubles pages : gauche paire dans l'index du PDF, la droite juste après ; les deux écrites)
    pairs = [(i, i + 1) for i in full if i % 2 == 1 and i + 1 in full]
    pick = sorted(rnd.sample(pairs, min(7, len(pairs))))
    res[bid] = []
    for l, r in pick:
        names = []
        for i in (l, r):
            pg = d[i]
            pix = pg.get_pixmap(matrix=fitz.Matrix(PX * 25.4 / 72, PX * 25.4 / 72), colorspace=fitz.csGRAY)
            im = Image.frombytes('L', (pix.width, pix.height), pix.samples)
            im = im.resize((round(w * PX), round(h * PX)), Image.LANCZOS)
            if sorted(im.getdata())[im.width * im.height // 2] > 128: im = ImageOps.invert(im)   # (encre blanche sur papier noir)
            n = f'{bid}-{i}.png'
            im.save(f'{OUT}/{n}', optimize=True)
            names.append(n)
        res[bid].append(names)
json.dump(res, open(f'{OUT}/pages.json', 'w'), indent=1)
print(json.dumps(res))
