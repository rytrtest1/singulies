// Les deux polices du site (EB Garamond : ce qui flotte ; Courier Prime : ce qui est imprimé sur un objet), chargées
// une seule fois pour les pages en DOM (un poème par mois, mes livres, pages du bandeau).
let fontsP = null;
export function siteFonts(base = './') {
  if (fontsP) return fontsP;
  const u = p => new URL(base + p, document.baseURI).href;
  const ff = [
    new FontFace('SG Garamond', `url(${u('fonts/EBGaramond-500.woff2')})`, { weight: '500' }),
    new FontFace('SG Machine', `url(${u('fonts/CourierPrime-latin.woff2')})`, { unicodeRange: 'U+0000-00FF, U+2000-206F' }),
    new FontFace('SG Machine', `url(${u('fonts/CourierPrime-latin-ext.woff2')})`, { unicodeRange: 'U+0100-024F, U+0152-0153' }),
  ];
  fontsP = Promise.all(ff.map(f => f.load().then(x => document.fonts.add(x)).catch(() => {})));
  return fontsP;
}
