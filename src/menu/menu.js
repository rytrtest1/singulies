// Le menu (11/10, Maxence) : on arrive directement sur le poème (le lien en bio tient la promesse de la vidéo) ; un
// signe discret en haut à droite (deux traits fins, comme la flèche retour en face) ouvre le portail par-dessus la
// page — ETERNEL déjà écrit, les cartes montent vite du fond (un prénom, un poème · un poème par mois · mes livres ·
// le paquet du jeu), « me contacter » dessous. Le signe n'est jamais là pendant un geste (frappe, vol des lettres,
// enveloppe, paiement) : canShow() le dit. Retour (flèche, Échap) : le menu s'efface, la page est restée telle quelle.
// Toucher « un prénom, un poème » ramène là où l'on en était. Sans WebGL2 : le portail en version simple.
import { openContact } from './contact.js';

const CSS = `
.mn-sign { position: fixed; z-index: 25; right: max(6px, env(safe-area-inset-right)); top: max(6px, env(safe-area-inset-top));
  width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; margin: 0; padding: 0; border: 0;
  background: transparent; color: #fff; opacity: 0; transition: opacity .9s ease; pointer-events: none; cursor: pointer;
  -webkit-tap-highlight-color: transparent; }
.mn-sign.on { opacity: .62; pointer-events: auto; }
.mn-sign.on:hover, .mn-sign.on:focus-visible { opacity: .85; outline: none; }
#portal.menu { z-index: 35; }
.sp-root.sp-menu { z-index: 35; }
.mn-chrome { position: fixed; inset: 0; z-index: 40; pointer-events: none; opacity: 0; transition: opacity .35s ease; }
.mn-chrome.on { opacity: 1; }
.mn-chrome.on > * { pointer-events: auto; }
.mn-back { position: absolute; left: max(6px, env(safe-area-inset-left)); top: max(6px, env(safe-area-inset-top)); width: 44px; height: 44px;
  display: flex; align-items: center; justify-content: center; margin: 0; padding: 0; border: 0; background: transparent; color: #fff;
  opacity: .62; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.mn-back:hover, .mn-back:focus-visible { opacity: .85; outline: none; }
.mn-contact { position: absolute; left: 50%; bottom: max(6px, env(safe-area-inset-bottom)); transform: translateX(-50%); height: 44px;
  padding: 0 14px; margin: 0; border: 0; background: transparent; cursor: pointer; white-space: nowrap; -webkit-tap-highlight-color: transparent;
  font: 500 15px/44px 'SG Garamond', Georgia, serif; letter-spacing: .06em; color: #fff; opacity: .62; }
.mn-contact:hover, .mn-contact:focus-visible { opacity: .85; outline: none; }
`;
const BACK = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
// deux traits fins, le second plus court (un signe, pas l'icône « hamburger » des applications)
const SIGN = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9.5 H20 M10 14.5 H20" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>';

let fontsP = null;
export function menuFonts(base = './') {
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

// opts : { canShow() (le signe peut paraître), onOpen(), onClose(), base, reduced, simple ('all' : le portail simple),
//   links (liens du menu), name() (le prénom tapé, pour le message) }
export function installMenu(opts = {}) {
  const { base = './', reduced = false } = opts;
  if (!document.getElementById('mn-style')) {
    const st = document.createElement('style'); st.id = 'mn-style'; st.textContent = CSS; document.head.appendChild(st);
  }
  menuFonts(base);
  const sign = document.createElement('button');
  sign.type = 'button'; sign.className = 'mn-sign'; sign.innerHTML = SIGN; sign.setAttribute('aria-label', 'Menu');
  const chrome = document.createElement('div'); chrome.className = 'mn-chrome'; chrome.inert = true;
  const back = document.createElement('button'); back.type = 'button'; back.className = 'mn-back'; back.innerHTML = BACK; back.setAttribute('aria-label', 'Retour');
  const contact = document.createElement('button'); contact.type = 'button'; contact.className = 'mn-contact'; contact.textContent = 'me contacter';
  chrome.append(back, contact);
  document.body.append(sign, chrome);

  let portal = null, portalP = null, open = false, busy = false;
  // le portail du menu : monté caché, une fois (3D ; sinon la version simple)
  function ensure() {
    if (portalP) return portalP;
    const common = { base, reduced, menu: true, links: opts.links, onPoem: () => close() };
    const simple = () => import('../simple/simple.js').then(m => m.mountSimplePortal(common));
    portalP = (opts.simple === 'all' ? Promise.resolve(null) : import('../portal/portal.js').then(m => m.mountPortal(common)))
      .catch(e => { console.warn('menu (portail)', e); document.getElementById('portal')?.remove(); return null; })
      .then(p => p || simple())
      .then(p => { portal = p; return p; })
      .catch(e => { console.warn('menu', e); portalP = null; return null; });
    return portalP;
  }
  // préparé d'avance, à un moment calme (la page posée) : l'ouverture ne fait pas attendre
  const idle = window.requestIdleCallback || (f => setTimeout(f, 200));
  setTimeout(() => idle(() => { if (opts.canShow?.()) ensure(); }), 8000);

  async function openMenu() {
    if (open || busy || !opts.canShow?.()) return;
    busy = true;
    opts.onOpen?.();
    const p = await ensure();
    busy = false;
    if (!p) { opts.onClose?.(); return; }
    open = true;
    sign.classList.remove('on');
    p.open();
    chrome.inert = false; chrome.classList.add('on');
  }
  function close() {
    if (!open) return;
    open = false;
    portal?.close();
    chrome.classList.remove('on'); chrome.inert = true;
    opts.onClose?.();
  }
  sign.addEventListener('click', openMenu);
  back.addEventListener('click', close);
  contact.addEventListener('click', () => {
    openContact({ base, reduced, name: opts.name?.() || '', onDone: close });
  });
  // (capture : Échap ferme le menu, et rien d'autre — sinon la page dessous revenait aussi en arrière)
  addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !open || document.querySelector('.mn-ct')) return;
    e.preventDefault(); e.stopPropagation(); close();
  }, true);
  // revenu d'un lien (mes livres, le jeu) par le bouton retour du navigateur, page rendue par le cache : la carte où
  // l'on était entré se rembobine
  addEventListener('pageshow', e => { if (e.persisted && open) portal?.back?.(); });
  // le signe paraît quand la page est au repos
  setInterval(() => { sign.classList.toggle('on', !open && !busy && !!opts.canShow?.()); }, 250);
  return { open: openMenu, close, get isOpen() { return open; } };
}
