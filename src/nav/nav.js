// Les pages, reliées par le fil (11/10, Maxence : « pas de menu, tout est relié »). En haut, le nom de la page où l'on
// est (UN PRENOM UN POEME), et de part et d'autre, reliés à lui par un fil cousu qui court d'un bord à l'autre de
// l'écran, les noms des pages voisines (UN POEME PAR MOIS à gauche — sur téléphone on en lit « … PAR MOIS » au bord —,
// MES LIVRES à droite) ; sur ordinateur, la place le permet : toutes les pages, les plus lointaines plus pâles encore.
// En bas, SINGULIES, sur un second fil, d'un bord à l'autre, sur toutes les pages (le toucher : me contacter). Les deux fils
// respirent à peine (leur affaissement change très lentement, chaque bout à son rythme).
// UNE SEULE PAGE : aller à une page voisine ne recharge rien. Les pages sont pensées dans un même espace, côte à côte :
// l'objet du centre et ceux des côtés se décalent ensemble, de la même distance, à la même allure (celui de droite vient
// au centre exactement pendant que celui du centre va à gauche, en rapetissant à la taille d'un voisin). Ordinateur :
// les objets des pages voisines attendent sur les côtés, plus petits, en fondu (comme les stories voisines) ; on clique
// dessus. Téléphone : leur bord ; toucher le bord gauche ou droit de l'écran = la page voisine (comme une story), ou
// glisser l'objet (il suit le doigt, le voisin vient avec) ; une fois, l'objet esquisse le geste (à droite, puis à
// gauche). Pages que le document ne sait pas monter (le poème, depuis lettre.html) : on y va en rechargeant.
// (12/10, Maxence) Plus de flèches : on touche un nom, ou on fait glisser le bandeau (il suit le doigt, le nom le plus
// proche du centre à la fin du geste = la page) ; on change de page à tout moment, même pendant une transition (elle se
// termine d'un coup). Le jeu n'est plus une page (il se découvre en répondant à la question du poème ; à la fin,
// « pose une de mes questions à quelqu'un »).
import { paintThread, flowNow } from '../alt/stitch.js';
import { count } from '../app/count.js';

export const PAGES = [
  { id: 'poeme', label: 'UN PRENOM UN POEME', href: '' },
  { id: 'livres', label: 'MES LIVRES', href: 'livres.html' },
  { id: 'lettre', label: 'UN POEME PAR MOIS', href: 'lettre.html' },
];
const K_NAV = 'sg.nav', K_REVEAL = 'sg.nav.reveal';
const STANDALONE = (() => { try { return !!navigator.standalone || matchMedia('(display-mode: standalone)').matches; } catch { return false; } })();
const mod = (i, n) => ((i % n) + n) % n;
const ring = i => PAGES[mod(i, PAGES.length)];
const idx = id => PAGES.findIndex(p => p.id === id);
// les pages que le document sait monter lui-même (src/nav/pages.js)
const MOUNTABLE = { lettre: 1, livres: 1 };
const SPAN = [-3, -2, -1, 0, 1, 2, 3];   // les noms posés sur le fil (les plus lointains : ordinateur, et pendant que le fil coulisse)
const EASE = 'cubic-bezier(.45,.05,.25,1)', DUR = 720;
const PAD = 1600;                         // le fil dépasse le bandeau de chaque côté (il court d'un bord à l'autre)

const CSS = `
.nv { position: fixed; z-index: 26; left: 0; right: 0; top: calc(42px + env(safe-area-inset-top)); height: 46px; pointer-events: none;
  opacity: 0; transition: opacity .7s ease; }
/* (12/10) le fil et les flèches : un seul dessin, fixe à l'écran, refait à chaque image quand il bouge (nav.js) */
.nv-tc { position: absolute; left: 0; bottom: 0; height: 44px; pointer-events: none; }
.nv.on { opacity: 1; }
.nv.under { opacity: 0 !important; pointer-events: none !important; }
.nv.under * { pointer-events: none !important; }
.nv-in { position: absolute; left: 0; right: 0; bottom: 0; height: 44px; overflow: hidden; touch-action: none; user-select: none; -webkit-user-select: none;
  -webkit-mask-image: linear-gradient(to right, transparent var(--nv-a, 0px), #000 calc(var(--nv-a, 0px) + var(--nv-m, 22%)), #000 calc(100% - var(--nv-a, 0px) - var(--nv-m, 22%)), transparent calc(100% - var(--nv-a, 0px)));
  mask-image: linear-gradient(to right, transparent var(--nv-a, 0px), #000 calc(var(--nv-a, 0px) + var(--nv-m, 22%)), #000 calc(100% - var(--nv-a, 0px) - var(--nv-m, 22%)), transparent calc(100% - var(--nv-a, 0px))); }
/* (12/10) le bandeau se fait glisser au doigt / à la souris */
.nv.on .nv-in { pointer-events: auto; cursor: grab; }
.nv.on.drag .nv-in, .nv.on.drag .nv-l { cursor: grabbing; }
.nv-track { position: absolute; left: 50%; top: 0; height: 44px; display: flex; align-items: center; gap: var(--nv-gap, 34px); white-space: nowrap;
  will-change: transform; }
.nv-l { position: relative; z-index: 1; display: block; margin: 0; padding: 14px 0; border: 0; background: none; cursor: pointer; text-decoration: none;
  font: 500 var(--nv-fs, 10.5px)/1 'SG Garamond', Georgia, serif; letter-spacing: .3em; margin-right: -.3em; color: #ece8e0; opacity: .32;
  transition: opacity .6s; -webkit-tap-highlight-color: transparent; -webkit-user-drag: none; }
.nv-l.cur { opacity: .78; cursor: default; }
.nv.redo .nv-l.cur { cursor: pointer; }
.nv-l.far { opacity: 0; pointer-events: none !important; }
.nv.wide.many .nv-l.far.d2 { opacity: .2; pointer-events: auto !important; }
.nv.solo .nv-l:not(.cur) { opacity: 0; pointer-events: none !important; }
.nv.on .nv-l { pointer-events: auto; }
.nv-l:not(.cur):hover, .nv-l:not(.cur):focus-visible { opacity: .75 !important; outline: none; }
/* en bas : SINGULIES, sur son fil, d'un bord à l'autre (le toucher : me contacter) */
.nv-foot { position: fixed; z-index: 26; left: 0; right: 0; bottom: 0; height: calc(34px + env(safe-area-inset-bottom)); pointer-events: none;
  opacity: 0; transition: opacity .7s ease; }
.nv-foot.on { opacity: 1; }
/* (17/10, Maxence : « on garde aussi SINGULIES à ce moment-là ») menu ouvert : SINGULIES, en bas, reste au-dessus du menu */
.nv-foot.up { z-index: 49; }
.nv-foot.up, body:has(.mn-au, .mn-ct:not(.ct-in), .mn-jeu) .nv-foot { z-index: 46; }
.nv-foot.up { z-index: 49; }
.nv-foot.up::before, body:has(.mn-au, .mn-ct:not(.ct-in), .mn-jeu) .nv-foot::before { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: calc(80px + env(safe-area-inset-bottom)); z-index: -1;
  background: linear-gradient(to top, #060606 0, #060606 45%, rgba(6,6,6,0)); pointer-events: none; }
/* (17/10, Maxence : « garde toujours ETERNEL en haut ; dans A PROPOS, CONTACT… un autre sous-bandeau avec ces titres pour naviguer
   dans cette section ») il prend la place du bandeau des pages tant qu'une page de la section est ouverte */
.nv-secbg { position: fixed; inset: 0; z-index: 43; background: #060606; opacity: 0; pointer-events: none; transition: opacity .35s ease; }
.nv-secbg.on { opacity: 1; }
.nv-sectop { position: fixed; z-index: 46; left: 0; right: 0; top: 0; height: calc(116px + env(safe-area-inset-top)); pointer-events: none; opacity: 0; transition: opacity .35s ease;
  background: linear-gradient(#060606 0, #060606 calc(90px + env(safe-area-inset-top)), rgba(6,6,6,.6) calc(102px + env(safe-area-inset-top)), rgba(6,6,6,0)); }
.nv-sectop.on { opacity: 1; }
.nv-sub { position: fixed; z-index: 46; left: 0; right: 0; top: calc(42px + env(safe-area-inset-top)); height: 46px; background: #060606; opacity: 0; pointer-events: none; transition: opacity .45s ease; }
.nv-sub.on { opacity: 1; pointer-events: auto; }
.nv-sub canvas { position: absolute; left: 0; top: 0; pointer-events: none; }
.nv-sub-in { position: absolute; left: 0; right: 0; bottom: 0; height: 44px; overflow: hidden; touch-action: pan-y;
  -webkit-mask-image: linear-gradient(to right, transparent 0, #000 16%, #000 84%, transparent 100%); mask-image: linear-gradient(to right, transparent 0, #000 16%, #000 84%, transparent 100%); }
.nv-sub-tr { position: absolute; left: 50%; top: 0; height: 44px; display: flex; align-items: center; gap: 46px; white-space: nowrap; transition: transform .55s cubic-bezier(.45,.05,.25,1); will-change: transform; }
.nv-sub-tr button { margin: 0; padding: 14px 0; border: 0; background: none; cursor: pointer; color: #ece8e0; opacity: .32; transition: opacity .5s;
  font: 500 var(--nv-fs, 10.5px)/1 'SG Garamond', Georgia, serif; letter-spacing: .3em; margin-right: -.3em; -webkit-tap-highlight-color: transparent; }
.nv-sub-tr button.cur { opacity: .78; cursor: default; }
.nv-sub-tr.nt button { transition: none; }
.nv-sub-tr button:not(.cur):hover, .nv-sub-tr button:not(.cur):focus-visible { opacity: .75; outline: none; }
/* (17/10) la flèche retour du haut est la seule : celle de la scène des cartes se retire quand la ligne du haut est là */
body:has(.nv-hd.on) .sc-back, body:has(.nv-hd.on) #back { display: none !important; }
/* (le retour du haut ferme la page ouverte : le leur fait double emploi) */
.mn-au .au-back, .mn-ct .ct-back { display: none !important; }   /* (aussi sous les pages A PROPOS, CONTACT, SINGULIES) */
.nv-foot canvas { position: absolute; left: 0; top: 0; }
.nv-foot button { position: absolute; left: 50%; top: 2px; transform: translateX(-50%); margin: 0; padding: 8px 6px; border: 0; background: none; cursor: pointer;
  font: 500 var(--nv-ft, 13px)/14px 'SG Garamond', Georgia, serif; letter-spacing: .4em; margin-right: -.4em; color: #ece8e0; opacity: .6; white-space: nowrap;
  -webkit-tap-highlight-color: transparent; transition: opacity .4s; }
.nv-foot.on button { pointer-events: auto; }
.nv-foot button:hover, .nv-foot button:focus-visible { opacity: .8; outline: none; }
/* le noir derrière le bandeau et le bas (les prénoms du champ s'y effacent, ne passent jamais dessous) */
.nv-shade { position: fixed; z-index: 25; left: 0; right: 0; pointer-events: none; opacity: 0; transition: opacity .7s ease; }
.nv-shade.t { top: 0; height: calc(150px + env(safe-area-inset-top)); background: linear-gradient(#060606 0, #060606 60%, rgba(6,6,6,0)); }
.nv-shade.b { bottom: 0; height: calc(38px + env(safe-area-inset-bottom)); background: linear-gradient(to top, #060606 0, #060606 55%, rgba(6,6,6,0)); }
/* (17/10, Maxence : « plutôt prendre exemple sur un prénom qui cache un autre : l'effet est plus marqué et plus étendu ») sur la
   page des prénoms : opaque derrière ETERNEL et le bandeau, puis un fondu long et doux (≈ lissé : −92 % au bord, jusqu'à rien) */
.nv-shade.t.wide { height: calc(230px + env(safe-area-inset-top)); background: linear-gradient(#060606 0, #060606 42%, rgba(6,6,6,.9) 50%, rgba(6,6,6,.7) 59%, rgba(6,6,6,.45) 69%, rgba(6,6,6,.22) 80%, rgba(6,6,6,.07) 91%, rgba(6,6,6,0)); }
.nv-shade.b.wide { height: calc(150px + env(safe-area-inset-bottom)); background: linear-gradient(to top, #060606 0, #060606 24%, rgba(6,6,6,.9) 33%, rgba(6,6,6,.68) 44%, rgba(6,6,6,.42) 57%, rgba(6,6,6,.2) 71%, rgba(6,6,6,.06) 86%, rgba(6,6,6,0)); }   /* (12/10) seulement sous SINGULIES : le prix au-dessus reste lisible */
.nv-shade.on { opacity: 1; }
/* (17/10, Maxence : « revoir l'allure : SINGULIES tout en haut, qui ramène à l'accueil ; à gauche une flèche retour
   toujours là ; un menu qu'on affiche / masque, en plus du bandeau ») la ligne du haut : ← · SINGULIES · menu */
.nv-hd { position: fixed; z-index: 48; left: 0; right: 0; top: 0; height: calc(46px + env(safe-area-inset-top)); pointer-events: none;
  opacity: 0; transition: opacity .7s ease; }
.nv-hd.on { opacity: 1; }
.nv-hd.on > * { pointer-events: auto; }
.nv-hd canvas { position: absolute; left: 0; top: env(safe-area-inset-top); pointer-events: none !important; }
.nv-hd > button { position: absolute; bottom: 0; height: 46px; margin: 0; padding: 0; border: 0; background: none; cursor: pointer; color: #ece8e0;
  -webkit-tap-highlight-color: transparent; transition: opacity .4s; }
.nv-hd .nv-bk, .nv-hd .nv-mn { width: 44px; z-index: 1; display: flex; align-items: center; justify-content: center; opacity: .55; }
.nv-hd .nv-bk { left: max(4px, env(safe-area-inset-left)); }
.nv-hd .nv-mn { right: max(4px, env(safe-area-inset-right)); }
.nv-hd .nv-bk.off { opacity: 0; pointer-events: none; }
.nv-hd .nv-br { left: 50%; transform: translateX(-50%); padding: 0 8px 0 calc(8px + .5em); font: 500 var(--nv-fe, 18px)/46px 'SG Garamond', Georgia, serif; letter-spacing: .5em; opacity: .86; white-space: nowrap; }
.nv-hd > button:hover, .nv-hd > button:focus-visible { opacity: .95; outline: none; }
.nv-hd svg { display: block; overflow: visible; fill: none; stroke: currentColor; stroke-width: 1.2; stroke-linecap: round; }
.nv-mn i { position: relative; display: block; width: 18px; height: 7px; }
.nv-mn i::before, .nv-mn i::after { content: ''; position: absolute; left: 0; right: 0; height: 1.2px; border-radius: 1px; background: currentColor; transition: transform .35s ease, top .35s ease; }
.nv-mn i::before { top: 0; } .nv-mn i::after { top: 6px; }
.nv-hd.open .nv-mn i::before { top: 3px; transform: rotate(40deg); } .nv-hd.open .nv-mn i::after { top: 3px; transform: rotate(-40deg); }
.nv-hd.open { opacity: 1; }
/* la cérémonie : seulement la flèche retour */
.nv-hd.bare .nv-br, .nv-hd.bare .nv-mn, .nv-hd.bare canvas { opacity: 0 !important; pointer-events: none !important; }
.nv-hd canvas { transition: opacity .7s ease; }
.nv-hd.open > * { pointer-events: auto; }
/* le menu, par-dessus la page : les pages, qui t'écrit, écris-moi ; les pages légales, discrètes */
.nv-pan { position: fixed; inset: 0; z-index: 47; background: #060606; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  opacity: 0; pointer-events: none; transition: opacity .35s ease; }
.nv-pan.on { opacity: 1; pointer-events: auto; }
.nv-pan a, .nv-pan button { display: block; margin: 0; padding: 12px 8px 12px calc(8px + .45em); border: 0; background: none; cursor: pointer; text-decoration: none; color: #ece8e0;
  font: 500 14px/1.2 'SG Garamond', Georgia, serif; letter-spacing: .45em; opacity: .6; -webkit-tap-highlight-color: transparent;
  transform: translateY(6px); transition: opacity .4s, transform .5s ease; }
.nv-pan.on a, .nv-pan.on button { transform: none; }
.nv-pan .cur { opacity: .95; }
.nv-pan a:hover, .nv-pan button:hover, .nv-pan a:focus-visible, .nv-pan button:focus-visible { opacity: .95; outline: none; }
.nv-pan hr { width: 28px; height: 0; border: 0; border-top: 1px solid rgba(236,232,224,.18); margin: 14px 0; }
.nv-pan .lg { display: flex; flex-wrap: wrap; justify-content: center; gap: 2px 6px; margin-top: 18px; padding: 0 12px; }
.nv-pan .lg a { font-size: 9.5px; letter-spacing: .22em; padding: 8px 4px 8px calc(4px + .22em); opacity: .35; }
`;

// opts : { current (id de la page du document), base, host : la page du document { stage() (l'objet : il suit le doigt),
//   all() (tout ce qui part et entre sur le côté ; défaut : stage), leave(), back() (elle revient) },
//   show() (le bandeau), side() (les objets voisins), solo() (seulement le nom de la page), foot() (SINGULIES en bas),
//   shade() (le noir derrière le haut et le bas), center() ({ y, h } px : l'objet de la page, pour l'espace commun) }
export function installNav(opts) {
  const base = opts.base || './';
  // (17/10) headerOnly : une page qui n'est pas dans la boucle des pages (le jeu) — seulement la ligne du haut (titre, retour, menu)
  const home = opts.headerOnly ? 0 : idx(opts.current);
  if (home < 0) return null;
  if (!document.getElementById('nv-style')) { const st = document.createElement('style'); st.id = 'nv-style'; st.textContent = CSS; document.head.appendChild(st); }
  const url = p => { const u = new URL(base + p.href, document.baseURI), k = new URLSearchParams(location.search); k.delete('q'); u.search = k.toString(); return u.href; };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = () => innerWidth < 760;

  // l'arrivée : venue d'une page voisine par le fil, en rechargeant (moins de 6 s)
  let arrived = 0;
  try { const a = JSON.parse(sessionStorage.getItem(K_NAV) || 'null'); if (a && a.to === opts.current && Date.now() - a.at < 6000) arrived = a.dir; sessionStorage.removeItem(K_NAV); } catch { /* */ }

  let cur = home;                            // la page qu'on regarde
  const opSeen = new WeakMap();              // (opacité des noms, lue au plus tous les 250 ms)
  const pages = {};                          // id → page montée { stage(), all(), leave(), back(), foot, center() }
  pages[opts.current] = opts.host || { stage: () => [] };

  const root = document.createElement('nav'); root.className = 'nv'; root.setAttribute('aria-label', 'Les pages');
  const inner = document.createElement('div'); inner.className = 'nv-in';
  const track = document.createElement('div'); track.className = 'nv-track';
  const tc = document.createElement('canvas'); tc.className = 'nv-tc'; tc.setAttribute('aria-hidden', 'true');
  inner.appendChild(track); root.append(tc, inner);
  const foot = document.createElement('div'); foot.className = 'nv-foot';
  const fcv = document.createElement('canvas'); fcv.setAttribute('aria-hidden', 'true');
  const fsp = document.createElement('button'); fsp.type = 'button'; fsp.textContent = 'SINGULIES'; fsp.setAttribute('aria-label', 'SINGULIES, ce que c’est');
  // (17/10, Maxence) l'auteur en haut (l'accueil), la maison en bas : SINGULIES = la page qui dit ce qu'est singuliés
  // (qui t'écrit et ECRIS-MOI restent dans le menu)
  fsp.addEventListener('click', () => { if (panOn) setPan(false); import('../menu/singulies.js').then(m => m.openSingulies({ base: opts.base || './', reduced })); });
  foot.append(fcv, fsp);
  const shadeT = document.createElement('div'), shadeB = document.createElement('div');
  shadeT.className = 'nv-shade t'; shadeB.className = 'nv-shade b';
  // ---- (17/10) la ligne du haut : la flèche retour, SINGULIES (l'accueil), le menu ----
  const hd = document.createElement('div'); hd.className = 'nv-hd';
  hd.innerHTML = `<canvas aria-hidden="true"></canvas><button class="nv-bk" type="button" aria-label="Retour"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 5 L8 12 L15 19"/></svg></button>
    <button class="nv-br" type="button" aria-label="ETERNEL, l’accueil">ETERNEL</button>
    <button class="nv-mn" type="button" aria-label="Menu" aria-expanded="false"><i></i></button>`;
  const hcv = hd.querySelector('canvas'), hbr = hd.querySelector('.nv-br');
  const pan = document.createElement('nav'); pan.className = 'nv-pan'; pan.setAttribute('aria-label', 'Menu'); pan.inert = true;
  const legal = [['MENTIONS', 'mentions.html'], ['CONDITIONS', 'conditions.html'], ['CONFIDENTIALITE', 'confidentialite.html']];
  pan.innerHTML = PAGES.map(p => `<a href="${url(p)}" data-p="${p.id}">${p.label}</a>`).join('') +
    `<hr><button type="button" data-x="auteur">A PROPOS</button><button type="button" data-x="questions">QUESTIONS</button><button type="button" data-x="contact">CONTACT</button><button type="button" data-x="singulies">SINGULIES</button><button type="button" data-x="jeu">LE JEU</button>` +
    `<div class="lg">${legal.map(([l, h]) => `<a href="${base}${h}">${l}</a>`).join('')}</div>`;
  let panOn = false;
  const setPan = on => {
    panOn = on; pan.classList.toggle('on', on); pan.inert = !on; hd.classList.toggle('open', on); foot.classList.toggle('up', on);
    hd.querySelector('.nv-mn').setAttribute('aria-expanded', String(on));
    pan.querySelectorAll('[data-p]').forEach(a => a.classList.toggle('cur', !opts.headerOnly && a.dataset.p === ring(cur).id));
  };
  hd.querySelector('.nv-mn').addEventListener('click', () => setPan(!panOn));
  pan.addEventListener('click', e => {
    const a = e.target.closest('[data-p], [data-x]');
    if (!a) { if (e.target === pan) setPan(false); return; }
    if (a.dataset.p) { e.preventDefault(); setPan(false); closeAll(); const id = a.dataset.p; if (opts.headerOnly) { location.href = url(PAGES[idx(id)]); return; } if (id === ring(cur).id) { if (cur === home && opts.onCurrent) opts.onCurrent(); } else goTo(id); return; }
    setPan(false);
    openSection(a.dataset.x);
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && panOn) { e.preventDefault(); e.stopPropagation(); setPan(false); } }, true);
  // ETERNEL : l'accueil (le champ de prénoms) — d'une autre page du document, on y revient d'abord
  hd.querySelector('.nv-br').addEventListener('click', () => {
    setPan(false);
    // (17/10) ETERNEL reste toujours en haut : l'accueil — la page de la section ouverte se referme d'abord
    closeAll();
    if (opts.headerOnly || opts.current !== 'poeme') { location.href = new URL(base, document.baseURI).href; return; }
    if (!atHome()) { goTo(opts.current); setTimeout(() => opts.onCurrent?.(), DUR + 400); }
    else opts.onCurrent?.();
  });
  // ---- la section (A PROPOS, QUESTIONS, CONTACT, SINGULIES, LE JEU) : ouvrir une page, depuis le menu ou le sous-bandeau ----
  const SECTION = [['auteur', 'A PROPOS'], ['questions', 'QUESTIONS'], ['contact', 'CONTACT'], ['singulies', 'SINGULIES'], ['jeu', 'LE JEU']];
  const openOne = x => {
    if (x === 'auteur') import('../menu/auteur.js').then(m => m.openAuteur({ base, reduced }));
    else if (x === 'questions') import('../menu/questions.js').then(m => m.openQuestions());
    else if (x === 'singulies') import('../menu/singulies.js').then(m => m.openSingulies({ base, reduced }));
    else if (x === 'jeu') import('../jeu/game.js').then(m => m.openGame({ base, reduced }));
    else import('../menu/contact.js').then(m => m.openContact({ base, reduced }));
  };
  // une page déjà ouverte se referme d'abord (sans quoi la suivante ne s'ouvrait pas) ; la même : rien
  // (17/10, Maxence : « toujours pouvoir slider à droite ou à gauche, à l'infini entre les catégories, dans les deux sens, avec les
  // transitions ») la page qui part glisse du côté opposé au sens, la suivante arrive du côté du sens ; le sous-bandeau reste en
  // place pendant l'échange (sinon le bandeau des pages reparaissait un instant dessous)
  let switching = false, switchT = 0;
  const slideEl = (el, from, to, ms) => { try { el.animate([{ translate: `${from}px 0` }, { translate: `${to}px 0` }], { duration: ms, easing: 'cubic-bezier(.45,.05,.25,1)', fill: 'both' }); } catch { /* */ } };
  function openSection(x) {
    const cur = ovTop();
    if (cur && cur.dataset.x === x) return;
    const n = SECTION.length, i = SECTION.findIndex(a => a[0] === cur?.dataset.x), j = SECTION.findIndex(a => a[0] === x);
    const dir = cur && i >= 0 && !reduced ? Math.sign(((j - i + n + Math.floor(n / 2)) % n) - Math.floor(n / 2)) || 1 : 0;
    const W = Math.min(innerWidth * 0.5, 90);
    if (!cur) { openOne(x); return; }
    switching = true; clearTimeout(switchT); switchT = setTimeout(() => { switching = false; }, 2200);
    if (dir) slideEl(cur, 0, -dir * W, 400);
    closeAll();
    setTimeout(() => {
      openOne(x);
      if (!dir) return;
      let k = 0; const w = setInterval(() => { const o = ovTop(); if (o && o.dataset.x === x && !o.inert) { clearInterval(w); slideEl(o, dir * W, 0, 520); } else if (++k > 40) clearInterval(w); }, 25);
    }, 430);
  }
  // le sous-bandeau : le nom courant au centre, les autres de part et d'autre, reliés par le fil
  const sub = document.createElement('div'); sub.className = 'nv-sub'; sub.setAttribute('aria-label', 'La section');
  // trois exemplaires de la liste côte à côte : il y a toujours un voisin de chaque côté, la boucle est sans fin (le noyau reste
  // au milieu : après chaque glissé, on se recale sur le même nom de l'exemplaire central, sans que rien ne bouge à l'écran)
  const NS = SECTION.length;
  sub.innerHTML = `<canvas aria-hidden="true"></canvas><div class="nv-sub-in"><div class="nv-sub-tr">${[0, 1, 2].map(k => SECTION.map(([x, l]) => `<button type="button" data-x="${x}"${k === 1 ? '' : ' tabindex="-1" aria-hidden="true"'}>${l}</button>`).join('')).join('')}</div></div>`;
  const scv = sub.querySelector('canvas'), str = sub.querySelector('.nv-sub-tr'), sbt = [...str.children];
  const midOf = x => sbt[NS + SECTION.findIndex(a => a[0] === x)];
  let subCur = null, sd = null, sSw = false, subEl = null, subT = 0;
  sub.addEventListener('click', e => { if (sSw) return; const b = e.target.closest('button[data-x]'); if (b) openSection(b.dataset.x); });
  // on fait glisser le sous-bandeau comme le bandeau des pages : au lâcher, le nom le plus proche du centre ouvre sa page
  const subIn = sub.querySelector('.nv-sub-in');
  subIn.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.button !== 0) return; clearTimeout(subT); sd = { x: e.clientX, X0: new DOMMatrix(getComputedStyle(str).transform).m41, id: e.pointerId, moved: false }; });
  addEventListener('pointermove', e => {
    if (!sd || e.pointerId !== sd.id) return;
    const dx = e.clientX - sd.x;
    if (!sd.moved) { if (Math.abs(dx) < 6) return; sd.moved = true; str.style.transition = 'none'; try { subIn.setPointerCapture(sd.id); } catch { /* */ } }
    str.style.transform = `translateX(${(sd.X0 + dx).toFixed(1)}px)`;
  }, { passive: true });
  const nearest = list => { let best = null, bd = 1e9; const cx = innerWidth / 2; for (const b of list) { const r = b.getBoundingClientRect(), dd = Math.abs((r.left + r.right) / 2 - cx); if (dd < bd) { bd = dd; best = b; } } return best; };
  const subEnd = e => {
    if (!sd || e.pointerId !== sd.id) return;
    const d = sd; sd = null; if (!d.moved) return;
    sSw = true; setTimeout(() => { sSw = false; }, 80); str.style.transition = '';
    const best = nearest(sbt);
    if (e.type !== 'pointercancel' && best && best.dataset.x !== subCur) openSection(best.dataset.x); else { subCur = null; subLayout(true); }
  };
  addEventListener('pointerup', subEnd); addEventListener('pointercancel', subEnd);
  // le nom b au centre (par sa position dans le bandeau, pas par sa position à l'écran : juste en cours de glissement)
  const subShift = b => `translateX(${(-(b.offsetLeft + (b.offsetWidth - 0.3 * 10.5) / 2)).toFixed(1)}px)`;
  const subNoAnim = fn => { str.classList.add('nt'); str.style.transition = 'none'; fn(); void str.offsetWidth; str.classList.remove('nt'); str.style.transition = ''; };
  const subRecenter = () => {
    if (sd || !subEl) return;
    const m = midOf(subCur); if (!m || m === subEl) return;
    subNoAnim(() => { sbt.forEach(b => b.classList.toggle('cur', b === m)); str.style.transform = subShift(m); });
    subEl = m;
  };
  // (la mise en page se refait à chaque changement de nom ; le fil, à chaque image tant que le sous-bandeau est visible)
  function subLayout(anim) {
    const x = ovTop()?.dataset.x || null;
    if (x === subCur) return;
    subCur = x;
    if (!x) return;
    const first = subEl == null || !sub.classList.contains('seen');
    const b = first ? midOf(x) : nearest(sbt.filter(e => e.dataset.x === x));
    if (!b) return;
    clearTimeout(subT);
    if (first) { subNoAnim(() => { sbt.forEach(e => e.classList.toggle('cur', e === b)); str.style.transform = subShift(b); }); sub.classList.add('seen'); }
    else { sbt.forEach(e => e.classList.toggle('cur', e === b)); str.style.transform = subShift(b); subT = setTimeout(subRecenter, 700); }
    subEl = b;
  }
  function subPaint(now) {
    if (!sub.classList.contains('on')) return;
    const d = dpr(), W = innerWidth, x = scv.getContext('2d'), t = now / 1000;
    if (scv.width !== Math.round(W * d)) { scv.width = Math.round(W * d); scv.height = 44 * d; scv.style.width = W + 'px'; scv.style.height = '44px'; }
    x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, W, 44);
    const y = 22.5, rs = sbt.map(b => { const r = b.getBoundingClientRect(), ls = parseFloat(getComputedStyle(b).letterSpacing) || 0; return [r.left, r.right - ls]; }).filter(([l, r]) => r > -20 && l < W + 20);
    const pts = [[-4, null], ...rs.flatMap(([l, r]) => [[l - 7, 'in'], [r + 7, 'out']]), [W + 4, null]];
    for (let i = 0; i + 1 < pts.length; i += 2) {
      const a = pts[i][0], b = pts[i + 1][0]; if (b - a < 6) continue;
      paintThread(x, a, b, y, 61 + i, 1.2, { holes: [i > 0, i + 1 < pts.length - 1], sag: reduced ? 0.5 : 0.3 + 0.9 * breath(i + 2, t), sag2: 0, g0: a - flowNow(), yf: px => waveTop(px, t) });
    }
  }
  setInterval(subLayout, 150);
  // (17/10, Maxence : « en scrollant vers le bas ça bave sur le bandeau ; en slidant le bandeau on voit les pages d'avant en dessous »)
  // secBg : un fond noir sous toutes les pages de la section (la page de dessous ne se voit jamais, ni pendant un échange de pages) ;
  // secTop : le noir derrière la ligne du haut et le sous-bandeau, puis un fondu court — le contenu qui défile s'y efface
  const secBg = document.createElement('div'), secTop = document.createElement('div');
  secBg.className = 'nv-secbg'; secTop.className = 'nv-sectop';
  document.body.append(secBg, secTop, sub);
  // la flèche retour : d'abord ce qui est ouvert sur la page (opts.onBack : une vue rapprochée, la suite de la page),
  // puis la page d'avant (l'historique du site), puis, sur la feuille, le champ du prénom
  let depth = 0;
  const OVS = '.mn-au, .mn-ct:not(.ct-in), .mn-jeu';
  // (la dernière posée d'abord : le jeu en relais est au-dessus de SINGULIES, son retour ne ferme que lui)
  const ovBack = () => { const l = [...document.querySelectorAll('.mn-jeu .jg-back, .mn-au .au-back, .mn-ct:not(.ct-in) .ct-back')].filter(b => !b.closest('[inert]')); return l[l.length - 1] || null; };
  // la page de la section ouverte (la dernière posée : le jeu au-dessus de SINGULIES)
  const BACKS = '.mn-jeu .jg-back, .mn-au .au-back, .mn-ct:not(.ct-in) .ct-back';
  // referme toutes les pages de la section ouvertes (une fois chacune) ; renvoie combien
  const closeAll = () => { const l = [...document.querySelectorAll(BACKS)].filter(b => !b.closest('[inert]')); l.forEach(b => b.click()); return l.length; };
  const ovTop = () => { const l = [...document.querySelectorAll(OVS)]; return l[l.length - 1] || null; };
  const canBack = () => panOn || !!ovBack() || depth > 0 || !atHome() || !!opts.redo?.() || !!opts.canBack?.();
  hd.querySelector('.nv-bk').addEventListener('click', () => {
    if (panOn) { setPan(false); return; }
    { const ov = ovBack(); if (ov) { ov.click(); return; } }   // (une page du menu ouverte : on la ferme d'abord)
    if (opts.onBack && opts.onBack()) return;
    if (depth > 0) { history.back(); return; }
    if (!atHome()) { goTo(opts.current); return; }
    if (opts.redo?.()) opts.onCurrent?.();
  });
  let items = [];
  function build() {
    track.replaceChildren();
    items = SPAN.map(d => {
      const p = ring(cur + d), a = document.createElement('a');
      a.className = 'nv-l' + (d === 0 ? ' cur' : Math.abs(d) > 1 ? ' far d' + Math.abs(d) : ''); a.textContent = p.label; a.href = url(p);
      a.draggable = false;
      if (d === 0) a.setAttribute('aria-current', 'page');
      // (par son nom, pas par son rang : un toucher pendant une transition vise la page qu'on voit)
      // (16/10) le nom de la page où l'on est : y revenir à son début (le poème : le champ de prénoms, pour le changer)
      a.addEventListener('click', e => { e.preventDefault(); if (swallow) { swallow = false; return; } stopReveal();
        if (p.id === ring(cur).id) { if (cur === home && opts.onCurrent) opts.onCurrent(); return; } goTo(p.id); });
      track.appendChild(a);
      return a;
    });
  }
  let swallow = false;                       // un glissé ne se termine pas en toucher sur un nom
  root.classList.toggle('many', PAGES.length > 3);
  document.body.append(shadeT, shadeB, root, foot, pan, hd);
  build();

  // ---- mise en page : le nom courant au centre ; le fil cousu entre chaque nom, et jusqu'aux bords ----
  let centers = [], boxes = [];
  const C = Math.floor(SPAN.length / 2);
  const dpr = () => Math.min(3, window.devicePixelRatio || 1);
  const clamp01 = u => Math.min(1, Math.max(0, u));
  const ez = u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

  // ---- (12/10, Maxence : « qu'on voie le fil bouger pour déplacer le menu ») le fil et les noms sont menés ensemble,
  //      image par image. Changer de page : le fil coulisse (sa torsion défile : elle est attachée à la matière,
  //      stitch.js g0) ; les noms en tête du mouvement partent les premiers (le fil s'étire derrière eux, toujours tiré,
  //      jamais poussé) ; chaque bout de fil se tend quand il s'allonge vraiment et se détend avec un rebond. ----
  const LAG = 45;                            // retard d'un nom au suivant (ms)
  let X = 0, slide = null;                   // X : le décalage du bandeau ; slide : { x0 [par nom], x1, t0, dur, dir }
  // le premier à bouger : le nom en tête du mouvement (dir > 0 : les noms vont vers la gauche, le plus à gauche d'abord)
  const rankOf = (i, dir) => (dir > 0 ? i : items.length - 1 - i);
  const nameX = (i, now) => {
    if (!slide) return X;
    const u = clamp01((now - slide.t0 - rankOf(i, slide.dir) * LAG) / slide.dur);
    return slide.x0[i] + (slide.x1 - slide.x0[i]) * ez(u);
  };
  // (12/10, Maxence : « vraiment donner l'impression qu'elles sont liées ») une onde très lente parcourt chaque fil — en
  // haut de gauche à droite, en bas de droite à gauche — et les noms, suspendus au fil, la suivent (± 0,6 px) ; la
  // matière du fil coulisse dans le même sens (stitch.js, flowNow)
  const WAVE_A = reduced ? 0 : 0.6, WAVE_K = 2 * Math.PI / 380, WAVE_W = 0.55;
  const waveTop = (px, t) => WAVE_A * Math.sin(px * WAVE_K - t * WAVE_W);
  const waveBot = (px, t) => WAVE_A * Math.sin(px * WAVE_K * 1.13 + t * WAVE_W * 0.9 + 1.7);
  function applyNames(now) {
    if (!items.length) return;
    const xs = items.map((_, i) => nameX(i, now)), t = now / 1000, W = innerWidth;
    track.style.transform = `translateX(${(-xs[C]).toFixed(2)}px)`;
    items.forEach((a, i) => {
      const dx = xs[C] - xs[i], dy = boxes[i] ? waveTop(W / 2 + centers[i] - xs[i], t) : 0;
      a.style.translate = Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01 ? `${dx.toFixed(2)}px ${dy.toFixed(2)}px` : '';
    });
    if (slide && now - slide.t0 > slide.dur + items.length * LAG) slide = null;
  }
  function setX(x, anim) {
    const now = performance.now();
    if (!anim || reduced) { slide = null; X = x; applyNames(now); paintNow(); return; }
    const x0 = items.map((_, i) => nameX(i, now));
    slide = { x0, x1: x, t0: now, dur: DUR, dir: Math.sign(x - x0[C]) || 1 };
    X = x; wake();
  }
  // la tension : chaque bout de fil a un ressort (s : son mou, 1 = au repos) qui suit son allongement réel — tendu quand
  // il s'allonge, plus mou s'il raccourcit, et qui revient en rebondissant (amorti à moitié)
  const springs = {};
  let lastS = 0;
  const slackSpring = (key, elong, dt) => {
    const sp = springs[key] || (springs[key] = { s: 1, v: 0 });
    const target = Math.min(1.8, Math.max(0.06, 1 - elong / 6));
    if (reduced || !dt) { sp.s = target; sp.v = 0; return sp.s; }
    sp.v += ((target - sp.s) * 260 - 16 * sp.v) * dt; sp.s += sp.v * dt;
    return Math.max(0, sp.s);
  };
  const settling = () => Object.values(springs).some(sp => Math.abs(sp.v) > 0.02);
  function layout() {
    root.classList.toggle('wide', !mobile());
    root.style.setProperty('--nv-fs', innerWidth < 520 ? '10.5px' : '11.5px');
    // (17/10) la hiérarchie : ETERNEL (l'auteur) > SINGULIES (la maison) > les pages (le bandeau)
    hd.style.setProperty('--nv-fe', innerWidth < 520 ? '18px' : '22px'); foot.style.setProperty('--nv-ft', innerWidth < 520 ? '13px' : '14px');
    root.style.setProperty('--nv-gap', innerWidth < 520 ? '46px' : '64px');   // (12/10) plus de fil entre les noms : on le voit relier
    root.style.setProperty('--nv-m', mobile() ? '12%' : '7%');
    items.forEach(a => { a.style.translate = ''; });
    track.style.transform = 'translateX(0)';
    const tr = track.getBoundingClientRect();
    boxes = items.map(a => { const r = a.getBoundingClientRect(); const ls = parseFloat(getComputedStyle(a).letterSpacing) || 0; return { l: r.left - tr.left, r: r.right - tr.left - ls, y: r.top - tr.top + r.height / 2 }; });
    centers = boxes.map(b => (b.l + b.r) / 2);
    const k = Math.min(dpr(), 2), W = innerWidth;
    tc.width = Math.round(W * k); tc.height = 44 * k; tc.style.width = W + 'px'; tc.style.height = '44px';
    const fw = innerWidth, fh = 34, d = dpr();
    fcv.width = Math.round(fw * d); fcv.height = fh * d; fcv.style.width = fw + 'px'; fcv.style.height = fh + 'px';
    hcv.width = Math.round(fw * d); hcv.height = 46 * d; hcv.style.width = fw + 'px'; hcv.style.height = '46px';
    setX(centers[C], false);
  }
  // ---- les deux fils respirent : l'affaissement de chaque bout change très lentement (6 à 9 s), sans jamais se répéter
  //      à l'identique (deux sinus non accordés), d'un à deux pixels au plus ----
  const breath = (i, t) => 0.45 + 0.42 * Math.sin(t * 0.83 + i * 1.7) * (0.7 + 0.3 * Math.sin(t * 0.31 + i));
  function paint(now) {
    if (!boxes.length) return;
    const t = now / 1000, dtS = lastS ? Math.min(0.05, (now - lastS) / 1000) : 0; lastS = now;
    applyNames(now);
    { const k = Math.min(dpr(), 2), x = tc.getContext('2d'), W = innerWidth; x.setTransform(k, 0, 0, k, 0, 0); x.clearRect(0, 0, W, 44);
      const y = boxes[C].y + 0.5, solo = root.classList.contains('solo');
      const xs = items.map((_, i) => nameX(i, now));
      const sl = i => W / 2 + boxes[i].l - xs[i], sr = i => W / 2 + boxes[i].r - xs[i];
      // les noms cousus : tous ceux qu'on voit, même en partie (le fil ne passe jamais sur des lettres : il plonge dans
      // le trou avant le nom) ; le fil court jusqu'aux deux bords
      const A = 0;
      // (16/10, Maxence : « sur PC il y a encore des trous, comme s'il y avait du texte ») seulement les noms qu'on voit
      // vraiment : les copies lointaines de la boucle, cachées, ne percent pas le fil
      // (17/10) l'opacité lue au plus tous les 250 ms (getComputedStyle à chaque image coûtait)
      const seen = i => {
        if (i === C) return true;
        const c = opSeen.get(items[i]), n = performance.now();
        if (c && n - c[0] < 250) return c[1];
        const v = parseFloat(getComputedStyle(items[i]).opacity) > 0.12; opSeen.set(items[i], [n, v]); return v;
      };
      let P = solo ? [C] : items.map((_, i) => i).filter(i => sr(i) > A + 3 && sl(i) < W - A - 3 && seen(i));
      if (!P.length) P = [C];
      const endL = -4, endR = W + 4;
      const holeL = Math.max(sl(P[0]) - 7, Math.min(endL + 8, A + 2)), holeR = Math.min(sr(P[P.length - 1]) + 7, Math.max(endR - 8, W - A - 2));
      // (au repos : les noms tous au même décalage X — l'allongement se mesure par rapport à ça)
      const r0L = -4, r0R = W + 4;
      const segs = [];
      segs.push({ a: endL, b: holeL, holes: [false, true], g0: endL + xs[P[0]] - W / 2, seed: 11 + P[0] * 7, key: 'L',
        L0: Math.max(W / 2 + boxes[P[0]].l - X - 7, Math.min(r0L + 8, A + 2)) - r0L });
      for (let j = 0; j < P.length - 1; j++) segs.push({ a: sr(P[j]) + 7, b: sl(P[j + 1]) - 7, holes: [true, true], g0: boxes[P[j]].r + 7, seed: 18 + P[j] * 7, key: 'm' + P[j],
        L0: boxes[P[j + 1]].l - boxes[P[j]].r - 14 });
      const pl = P[P.length - 1];
      segs.push({ a: holeR, b: endR, holes: [true, false], g0: holeR + xs[pl] - W / 2, seed: 18 + pl * 7, key: 'R',
        L0: r0R - Math.min(W / 2 + boxes[pl].r - X + 7, Math.max(r0R - 8, W - A - 2)) });
      segs.forEach((g, j) => {
        const L = g.b - g.a;
        if (L <= 6) return;
        const sag = (reduced ? 0.45 : breath(j, t) * Math.min(1.6, L / 40)) * slackSpring(g.key, L - g.L0, dtS);
        paintThread(x, g.a, g.b, y, g.seed, 1.25, { holes: g.holes, sag, sag2: reduced ? 0 : 0.18 * Math.sin(t * 0.57 + j * 2.3), g0: g.g0 - flowNow(), yf: px => waveTop(px, t) });
      });
    }
    { const d = dpr(), x = fcv.getContext('2d'), fw = fcv.width / d, r = fsp.getBoundingClientRect(), y = 17;
      x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, fw, 34);
      if (r.width) {
        const ls = parseFloat(getComputedStyle(fsp).letterSpacing) || 0, l = r.left + 3, rr = r.right - 3 - ls;
        // (le fil du bas coulisse de droite à gauche ; SINGULIES y est suspendu)
        const fl = flowNow(), yb = px => waveBot(px, t);
        fsp.style.translate = `0 ${waveBot((l + rr) / 2, t).toFixed(2)}px`;
        paintThread(x, -4, l, y, 53, 1.2, { holes: [false, true], sag: reduced ? 0.6 : 0.3 + 1.1 * breath(7, t), sag2: reduced ? 0 : 0.35 * Math.sin(t * 0.43 + 1), g0: -4 + fl, yf: yb });
        paintThread(x, rr, fw + 4, y, 71, 1.2, { holes: [true, false], sag: reduced ? 0.6 : 0.3 + 1.1 * breath(9, t), sag2: reduced ? 0 : 0.35 * Math.sin(t * 0.47 + 4), g0: rr + fl, yf: yb });
      }
    }
    // (17/10, Maxence : « ETERNEL comme SINGULIES en bas pour le fil aux extrémités ») ETERNEL est suspendu à son fil, qui court
    // d'un bord à l'autre et plonge dans un trou de chaque côté des deux signes (retour, menu)
    { const d = dpr(), x = hcv.getContext('2d'), fw = hcv.width / d, r = hbr.getBoundingClientRect(), y = 23;
      x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, fw, 46);
      if (r.width) {
        const ls = parseFloat(getComputedStyle(hbr).letterSpacing) || 0, l = r.left + 8 + ls - 11, rr = r.right - 8 - ls + 11, fl = flowNow()   /* (17/10, Maxence : « le fil à droite plus proche qu'à gauche ») bornes sur les lettres : la première commence après le remplissage gauche + l'interlettrage, la dernière finit avant son interlettrage ; le même écart (11 px) de chaque côté */, yt = px => waveTop(px, t);
        // (17/10, Maxence : piste « le fil ne touche pas les icônes ») le fil va d'une icône à l'autre : il sort d'un trou juste après ← (seulement
        // quand il y a un retour ; sinon il court jusqu'au bord) et plonge dans un trou juste avant ≡. Rien derrière les icônes : plus de petits
        // bouts de fil de dix pixels entre l'icône et le bord de l'écran.
        hbr.style.translate = `0 ${waveTop((l + rr) / 2, t).toFixed(2)}px`;
        const vis = el => el && parseFloat(getComputedStyle(el).opacity) > 0.15;
        const bk = hd.querySelector('.nv-bk'), mn = hd.querySelector('.nv-mn i'), sv = bk.querySelector('svg');
        const q = vis(bk) && sv.getBoundingClientRect(), m = mn.getBoundingClientRect();
        const a0 = q && q.width ? q.left + 0.625 * q.width + 10 : -4, b1 = m.width ? m.left - 10 : fw + 4;   // (le même écart de 10 px des deux côtés : la pointe de ← finit aux 15/24 de son dessin)
        const sg = j => ({ sag: reduced ? 0.6 : 0.3 + 1.1 * breath(3 + j, t), sag2: reduced ? 0 : 0.35 * Math.sin(t * 0.43 + 2 + j), yf: yt, g0: (j ? rr : a0) - (j ? -fl : fl) });
        paintThread(x, a0, l, y, 37, 1.2, { holes: [a0 > -4, true], ...sg(0) });
        paintThread(x, rr, b1, y, 41, 1.2, { holes: [true, b1 < fw + 4], ...sg(1) });
      }
    }
  }
  const paintNow = () => { paint(performance.now()); subPaint(performance.now()); };
  // la boucle : vive quand quelque chose bouge (le fil qui coulisse, qu'on fait glisser), ≈ 25 images/s sinon
  let raf = 0, lastP = 0;
  const lively = () => !!slide || !!drag || settling();
  const loop = now => {
    raf = 0;
    if (!(shown || footOn || opts.headerOnly) || document.hidden) return;
    const live = lively();
    if (live || now - lastP > 40) { lastP = now; paint(now); subPaint(now); }
    if (reduced && !live) return;
    raf = requestAnimationFrame(loop);
  };
  const wake = () => { if (!raf) raf = requestAnimationFrame(loop); };

  let shown = false, footOn = false, busy = false, wandered = !!arrived;
  let drag = null, revealDone = false, revealing = false, rvT = [], shownAt = 0;
  const atHome = () => cur === home;
  const pgOf = id => pages[id] || {};
  const objC = () => { const pg = pgOf(ring(cur).id), c = (pg.center && pg.center()) || (atHome() && opts.center && opts.center()) || null; return c || { y: innerHeight * 0.45, h: innerHeight * 0.5 }; };
  // la distance dont une page glisse en partant (et d'où la suivante arrive)
  const S = () => Math.min(innerWidth * 0.42, 340);
  const ro = new ResizeObserver(layout); ro.observe(track);
  addEventListener('resize', layout);
  document.fonts && document.fonts.ready.then(layout);
  layout();

  // ---- visible quand la page le dit ----
  const HUSH_IDLE = 6000;
  let actAt = performance.now();
  for (const ev of ['pointerdown', 'keydown', 'wheel', 'touchstart']) addEventListener(ev, () => { actAt = performance.now(); }, { passive: true, capture: true });
  // (17/10, Maxence : « que ça ne réapparaisse pas si on sort de l'app et qu'on revient, ou retour puis revenir ») revenir dans la page
  // (onglet, application, bouton retour, page rendue par le cache) range de nouveau les bandeaux : seul un vrai silence les rappelle
  const touchAct = () => { actAt = performance.now(); };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) touchAct(); });
  addEventListener('pageshow', touchAct); addEventListener('focus', touchAct); addEventListener('popstate', touchAct); addEventListener('resize', touchAct);
  function tick() {
    if (busy) return;
    const pg = pgOf(ring(cur).id);
    // (17/10, Maxence : « après RECEVOIR, enlève les bandeaux, on garde juste la flèche retour » ; « dans tous les cas, après x secondes
    // sans interaction, le menu et les bandeaux réapparaissent ») pendant la cérémonie (commande, enveloppe, paiement) : seulement ←,
    // jusqu'à ce que plus rien ne bouge depuis HUSH_IDLE ; un geste les range de nouveau
    const hush = atHome() && !!opts.hush?.() && performance.now() - actAt < HUSH_IDLE;
    const bare = atHome() && !!opts.hush?.() && hush;
    const on = atHome() ? !!opts.show?.() && !hush : true;
    const solo = on && atHome() && !drag && !!opts.solo?.();   // (en glissant, les voisins paraissent)
    const f = atHome() ? !!opts.foot?.() && !hush : pg.foot !== false;
    const sh = atHome() ? !!opts.shade?.() : !!pg.foot;
    if (on !== shown) { shown = on; root.classList.toggle('on', on); if (on) { layout(); shownAt = performance.now(); } }
    hd.classList.toggle('on', opts.headerOnly ? true : on || (bare && canBack())); hd.classList.toggle('bare', bare);
    hd.querySelector('.nv-bk').classList.toggle('off', !canBack());
    // (17/10, Maxence : « garde plutôt le nom de la page ») le titre du haut : ETERNEL, ou le nom de la page du menu ouverte
    { const ov = !!ovTop() || switching; sub.classList.toggle('on', ov); secBg.classList.toggle('on', ov); secTop.classList.toggle('on', ov); if (!ov) sub.classList.remove('seen'); root.classList.toggle('under', ov); if (ovTop()) subLayout(); }
    if (f !== footOn) { footOn = f; foot.classList.toggle('on', f); if (f) layout(); }
    root.classList.toggle('solo', solo);
    root.classList.toggle('redo', atHome() && !!opts.redo?.());
    // (12/10) la démonstration du glissé : une fois par visite, sur la première page où le bandeau paraît (la feuille :
    // une fois l'offre posée ; ailleurs : 2,5 s après)
    if (on && !revealDone && !revealing && !busy && !drag) {
      const ready = atHome() && opts.ready ? opts.ready() : performance.now() - shownAt > 2500;
      if (ready) { let done = false; try { done = !!sessionStorage.getItem(K_REVEAL); } catch { /* */ } if (done || reduced || (atHome() && opts.quiet && !opts.quiet())) revealDone = true; else reveal(); }
    }
    shadeT.classList.toggle('on', sh && on); shadeB.classList.toggle('on', sh && f);
    { const w = atHome() && !!opts.wideShade?.(); shadeT.classList.toggle('wide', w); shadeB.classList.toggle('wide', w); }
    if (shown || footOn || opts.headerOnly) wake();
  }
  setInterval(tick, 200); tick();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });

  // ---- les pages : celle du document (host), les autres montées à la demande (pages.js), gardées ----
  const loading = {};
  function ensure(id) {
    if (pages[id]) return Promise.resolve(pages[id]);
    if (!MOUNTABLE[id]) return Promise.resolve(null);
    if (!loading[id]) loading[id] = import('./pages.js').then(m => m.mountPage(id, { base, reduced, nav: api }))
      .then(p => { if (p) pages[id] = p; delete loading[id]; return p; })
      .catch(e => { console.warn('page', id, e); delete loading[id]; return null; });
    return loading[id];
  }
  // (préparées à un moment calme : la page voisine est déjà là quand on y va)
  const idle = window.requestIdleCallback || (f => setTimeout(f, 300));
  // (16/10, Maxence : « un freeze quand le menu va paraître ») monter une page voisine crée sa scène (WebGL) : un
  // instant lourd. Jamais sur la page des prénoms ni pendant un geste : seulement quand la page le dit calme
  // (opts.calm), ou au premier toucher du bandeau (on va sans doute y aller)
  const preload = () => { if (opts.headerOnly) return; idle(() => { for (const d of [1, -1]) ensure(ring(cur + d).id); }); };
  let preT = 0;
  const preTry = () => { if (!opts.calm || opts.calm()) { clearInterval(preT); preload(); } };
  // (17/10, Maxence : « c'était bien de charger avant ») dès l'ouverture : l'à-coup du premier dessin se perd dans le
  // noir du chargement (opts.preAt, 7 s par défaut)
  setTimeout(() => { preTry(); if (opts.calm) preT = setInterval(preTry, 1500); }, opts.preAt ?? 7000);

  const els = (pg, all) => ((all && pg.all ? pg.all() : pg.stage ? pg.stage() : []) || []).filter(Boolean);
  const T = `translate ${DUR}ms ${EASE}, scale ${DUR}ms ${EASE}, opacity ${Math.round(DUR * 0.8)}ms ease`;
  // un élément dans l'espace : décalé de x, à l'échelle s (autour du centre de l'objet), d'opacité o
  function put(el, x, s, o, cy, anim) {
    el.style.transition = anim ? (reduced ? 'opacity .35s' : T) : 'none';
    el.style.transformOrigin = `50% ${cy.toFixed(0)}px`;
    if (!reduced) { el.style.translate = x ? `${x.toFixed(1)}px 0` : ''; el.style.scale = s !== 1 ? s.toFixed(3) : ''; }
    el.style.opacity = o === 1 ? '' : String(o);
  }
  const clearT = el => { el.style.transition = 'none'; el.style.translate = ''; el.style.scale = ''; el.style.transformOrigin = ''; };
  // ---- l'objet d'une page et le reste ----
  // obj : ce qui voyage dans l'espace (l'enveloppe, le livre, la feuille, la carte du jeu) ; objRect() : où il est au
  // repos quand l'élément est plus grand que lui (une scène plein écran) ; rest : tout le reste de la page (textes,
  // boutons), qui s'efface et paraît à sa place, sans voyager ; layer : ce qu'on montre / cache
  const objOf = pg => (pg.obj ? pg.obj() : []).filter(Boolean);
  const restOf = pg => (pg.rest ? pg.rest() : pg.obj ? [] : els(pg, true)).filter(Boolean);
  const layerOf = pg => els(pg, true);
  const fadeTo = (el, o, ms, delay = 0) => { el.style.transition = `opacity ${ms}ms ease ${delay}ms`; el.style.opacity = o === 1 ? '' : String(o); };
  const clearAll = el => { clearT(el); el.style.opacity = ''; };
  // ---- aller à une page voisine (d : ±1, ±2, ±3) ----
  // (12/10) la page en cours glisse du côté d'où l'on part, la page d'arrivée la suit, collée à elle (une largeur
  // d'écran plus loin) ; le fil du bandeau coulisse avec elles. Rien d'autre ne paraît à l'écran (plus d'aperçus).
  // (12/10, Maxence : « changer de page même pendant une animation ») une transition en cours se termine d'un coup
  // (fin()) et la suivante part de là ; pendant qu'une page se monte, la demande attend (pending)
  let fin = null, pending = null;
  // l'onglet porte le nom de la page où l'on est (la page ne se recharge pas : le titre restait celui du poème)
  const TITLES = { poeme: 'ETERNEL — un prénom, un poème', livres: 'ETERNEL — mes livres', lettre: 'ETERNEL — un poème par mois' };
  const setTitle = id => { if (TITLES[id]) document.title = TITLES[id]; };
  async function go(d, opt = {}) {
    if (!d) return;
    if (busy) { if (fin) fin(); else { pending = { d, opt }; return; } }
    stopReveal();
    const target = ring(cur + d), dir = Math.sign(d), fromId = ring(cur).id, from = pages[fromId] || {};
    count('nav/' + target.id);
    const inDoc = !!(pages[target.id] || MOUNTABLE[target.id]);
    busy = true;
    // la page d'arrivée est prête avant que rien ne bouge (montée maintenant si besoin)
    const pg = inDoc ? await ensure(target.id) : null;
    if (inDoc && !pg) { busy = false; location.href = url(target); return; }
    // le fil coulisse : le nom suivant vient au centre
    if (centers[C + d] != null) setX(centers[C + d], true);
    items.forEach((a, i) => { const k = i - C - d; a.classList.toggle('cur', k === 0); a.classList.remove('far', 'd2', 'd3'); if (Math.abs(k) > 1) a.classList.add('far', 'd' + Math.min(3, Math.abs(k))); });

    // ---- ce qui part (un objet qui a suivi le doigt part d'où il est) ----
    // (12/10, Maxence : « un objet bave sur l'autre en fondu, c'est cheap ») les pages sont côte à côte dans le même
    // espace, à une largeur d'écran l'une de l'autre : l'objet qui part et celui qui arrive glissent ENSEMBLE, de la
    // même distance (W), à la même allure, opaques — ils ne se chevauchent jamais et rien ne fond ; seuls les textes
    // s'effacent sur place (vite) et paraissent une fois l'objet arrivé
    const s = S(), c0 = objC(), W = innerWidth;
    const outLayer = layerOf(from), outObj = objOf(from), outRest = restOf(from);
    const outDrag = els(from, false).filter(el => !outLayer.includes(el) && !outObj.includes(el));
    from.leave?.();
    for (const el of outRest) fadeTo(el, 0, 200);
    for (const el of outObj) put(el, -dir * W, 1, 1, c0.y, true);
    for (const el of outDrag) put(el, -dir * s, 1, 0, c0.y, true);
    if (!inDoc) {
      try { sessionStorage.setItem(K_NAV, JSON.stringify({ to: target.id, dir, at: Date.now() })); } catch { /* */ }
      setTimeout(() => { location.href = url(target); }, 420);
      return;
    }
    cur = mod(cur + d, PAGES.length); wandered = true;
    setTitle(target.id);

    // ---- ce qui arrive ----
    const inLayer = layerOf(pg), inObj = objOf(pg), inRest = restOf(pg);
    for (const el of els(pg, false)) if (!inObj.includes(el)) clearT(el);
    for (const el of inLayer) { el.style.visibility = ''; clearAll(el); }
    for (const el of inRest) { el.style.transition = 'none'; el.style.opacity = '0'; }
    pg.back?.();
    const c1 = objC();
    for (const el of inObj) put(el, dir * W, 1, 1, c1.y, false);
    void document.body.offsetWidth;
    for (const el of inObj) put(el, 0, 1, 1, c1.y, true);
    for (const el of inRest) fadeTo(el, 1, 460, inObj.length ? Math.round(DUR * 0.7) : 160);

    if (!opt.pop) { try { history.pushState({ sgPage: target.id }, '', STANDALONE ? location.href : url(target)); depth++; } catch { /* */ } } else depth = Math.max(0, depth - 1);
    // la fin : à son heure, ou d'un coup si l'on va déjà ailleurs (tout se pose à sa place, le bandeau sur son nom)
    let timer = 0;
    const done = () => {
      if (fin !== done) return;
      fin = null; clearTimeout(timer);
      for (const el of outLayer) { el.style.visibility = 'hidden'; }
      for (const el of [...outLayer, ...outObj, ...outRest, ...outDrag]) clearAll(el);
      for (const el of inObj) { el.style.transition = 'none'; el.style.transformOrigin = ''; el.style.translate = ''; el.style.scale = ''; el.style.opacity = ''; }
      for (const el of inRest) { el.style.transition = ''; el.style.opacity = ''; }
      if (from.transient) delete pages[fromId];
      build(); layout();
      busy = false; tick();
    };
    fin = done;
    timer = setTimeout(() => { done(); if (pending) { const q = pending; pending = null; go(q.d, q.opt); } }, DUR + SPAN.length * LAG + 30);
    if (pending) { const q = pending; pending = null; go(q.d, q.opt); }
  }
  // aller à une page par son nom (le chemin le plus court sur la boucle)
  function goTo(id) { const t = idx(id); if (t < 0) return; let d = mod(t - cur, PAGES.length); if (d > PAGES.length / 2) d -= PAGES.length; if (d) go(d); }
  // le bouton retour du navigateur : la page d'avant
  try { history.replaceState({ ...(history.state || {}), sgPage: opts.current }, ''); } catch { /* */ }
  addEventListener('popstate', e => {
    const id = e.state && e.state.sgPage; if (!id) return;
    const t = idx(id); if (t < 0 || t === cur) return;
    let d = mod(t - cur, PAGES.length); if (d > PAGES.length / 2) d -= PAGES.length;
    go(d, { pop: true });
  });
  // (17/10, Maxence) ordinateur : ← → ne changent plus de page — ils vont d'un point de navigation à l'autre (offre.js, lettre/page.js) ;
  // les pages : le bandeau, qu'on touche ou qu'on glisse
  // revenu par le bouton retour après un rechargement (page rendue par le cache) : tout reprend sa place
  addEventListener('pageshow', e => {
    if (!e.persisted || !busy) return;
    busy = false;
    for (const el of els(pgOf(ring(cur).id), true)) { el.style.transition = 'none'; el.style.translate = ''; el.style.scale = ''; el.style.opacity = ''; el.style.visibility = ''; }
    build(); layout(); tick();
  });

  // ---- (12/10, Maxence : « il faut pouvoir slide sur le menu du haut ») le bandeau suit le doigt (ou la souris tenue) ;
  //      au lâcher, le nom le plus proche du centre (élan compris) = la page ; aucun : le fil revient. Au-delà des noms
  //      posés, il résiste. Sur la page des prénoms (seulement UN PRENOM UN POEME), les voisins paraissent en glissant. ----
  inner.addEventListener('pointerenter', e => { if (shown && e.pointerType === 'mouse') { clearInterval(preT); preload(); } });
  const rubber = r => 46 * (1 - Math.exp(-r / 110));
  inner.addEventListener('pointerdown', e => {
    if (!shown || (e.pointerType === 'mouse' && e.button !== 0)) return;
    stopReveal(); clearInterval(preT); preload();
    if (busy && fin) fin();
    if (busy) return;                                   // (une page se monte : un instant)
    const now = performance.now(), x0 = nameX(C, now);
    slide = null; X = x0;
    drag = { id: e.pointerId, x: e.clientX, X0: x0, moved: false, v: 0, lx: e.clientX, lt: now };
  });
  addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved) {
      if (Math.abs(dx) < 6) return;
      drag.moved = true; root.classList.add('drag'); root.classList.remove('solo');
      try { inner.setPointerCapture(drag.id); } catch { /* */ }
    }
    const now = performance.now(), dt = Math.max(1, now - drag.lt);
    drag.v = 0.7 * drag.v + 0.3 * ((e.clientX - drag.lx) / dt); drag.lx = e.clientX; drag.lt = now;
    const lo = centers[0], hi = centers[centers.length - 1];
    let x = drag.X0 - dx;
    if (x < lo) x = lo - rubber(lo - x); else if (x > hi) x = hi + rubber(x - hi);
    X = x; wake();
  }, { passive: true });
  const endDrag = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dd = drag; drag = null; root.classList.remove('drag');
    if (!dd.moved) return;                              // un simple toucher : le nom touché fait le reste
    swallow = true; setTimeout(() => { swallow = false; }, 80);
    const still = performance.now() - dd.lt > 120 ? 0 : dd.v;
    const proj = X - still * 200;                       // l'élan : où le bandeau irait
    let best = C;
    centers.forEach((c, i) => { if (Math.abs(c - proj) < Math.abs(centers[best] - proj)) best = i; });
    const d = e.type === 'pointercancel' ? 0 : best - C;
    if (d) go(d); else setX(centers[C], true);
    tick();
  };
  addEventListener('pointerup', endDrag);
  addEventListener('pointercancel', endDrag);

  // ---- une fois par visite, sur la page de la feuille (sur l'accueil, le bandeau ne montre que UN PRENOM UN POEME) :
  //      le fil coulisse tout seul jusqu'à lire MES LIVRES en entier (la page ne bouge pas), revient ; puis de l'autre
  //      côté (UN POEME PAR MOIS, tenu un peu plus) — on comprend que le bandeau se fait glisser. Le moindre geste
  //      arrête tout. ----
  function stopReveal() {
    if (!revealing) return;
    revealing = false; rvT.forEach(clearTimeout); rvT = [];
    removeEventListener('pointerdown', stopReveal, true); removeEventListener('keydown', stopReveal, true);
    if (!busy && !drag) setX(centers[C], true);
    revealDone = true;
  }
  function reveal() {
    revealing = true;
    try { sessionStorage.setItem(K_REVEAL, '1'); } catch { /* */ }
    addEventListener('pointerdown', stopReveal, true); addEventListener('keydown', stopReveal, true);
    const at = (ms, f) => rvT.push(setTimeout(() => { if (revealing && !busy) f(); }, ms));
    // jusqu'où glisser : le voisin lisible en entier, juste avant le fondu du bord (marge du masque)
    const shift = d => {
      const A = (mobile() ? 0.12 : 0.07) * innerWidth + 6, bx = boxes[C + d];
      if (!bx) return 0;
      return d > 0 ? Math.max(0, bx.r - innerWidth / 2 + A - centers[C]) : Math.min(0, innerWidth / 2 + bx.l - A - centers[C]);
    };
    // (12/10, Maxence : « trop long, ça distrait ») MES LIVRES à droite, puis directement l'autre côté, puis le centre
    at(600, () => setX(centers[C] + shift(1), true));
    at(600 + DUR + 900, () => setX(centers[C] + shift(-1), true));
    at(600 + 2 * DUR + 900 + 1100, () => setX(centers[C], true));
    at(600 + 3 * DUR + 900 + 1100 + 300, () => { revealing = false; removeEventListener('pointerdown', stopReveal, true); removeEventListener('keydown', stopReveal, true); revealDone = true; });
  }

  // ---- l'arrivée par rechargement : la page entre du côté d'où l'on vient ----
  function enter(list) {
    if (!arrived) return;
    const c = objC(), l = list.filter(Boolean);
    for (const el of l) put(el, arrived * S(), 1, 0, c.y, false);
    void document.body.offsetWidth;
    for (const el of l) put(el, 0, 1, 1, c.y, true);
  }
  const api = { go, goTo, enter, layout, openSection, preload: () => { clearInterval(preT); preload(); }, get arrived() { return arrived; }, get wandered() { return wandered; }, get busy() { return busy; }, get page() { return ring(cur).id; },
    home: () => goTo(opts.current) };
  return api;
}
