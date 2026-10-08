// Safari d'avant iOS 17 (iPhone X : iOS 16 au plus) : OffscreenCanvas n'existe pas avant 16.4, et ne s'envoie pas
// sûrement à WebGL avant 17 — le portail et les cartes plantaient (« ton téléphone n'arrive pas… »). On les remplace
// alors par de simples <canvas> (mêmes width / height / getContext, acceptés partout par texImage2D).
const ua = navigator.userAgent;
const ios = /(iPhone|iPad|iPod).* OS (\d+)_/.exec(ua);
const mac = !/Chrome|CriOS|FxiOS|EdgiOS|Edg\//.test(ua) && /Version\/(\d+)[\d.]* .*Safari/.exec(ua);
const safari = ios ? +ios[2] : mac ? +mac[1] : 99;
if (typeof OffscreenCanvas === 'undefined' || safari < 17) {
  window.OffscreenCanvas = function (w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  };
}
// une grande toile qui ne sert plus : sa mémoire rendue tout de suite (Safari plafonne la mémoire des toiles, bas sur
// les anciens iPhone ; le ramasse-miettes passe trop tard quand on en crée une à chaque frappe)
export function releaseCanvas(c) { try { c.width = 0; c.height = 0; } catch { /* */ } }
