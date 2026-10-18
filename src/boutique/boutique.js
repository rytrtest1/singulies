// Version boutique (18/10, Maxence : « une version plus classique, type boutique en ligne — l'idée de la forme de
// navigation et de l'expérience utilisateur, pas copier le design — avec mes rendus, ma qualité graphique, mon univers »).
// Une seule page, des adresses par vue (#/, #/boutique, #/produit/poeme, #/a-propos, #/questions, #/contact) : le retour du
// navigateur ramène à la vue d'avant, rien ne se recharge. En-tête et menu toujours visibles, accueil (bannière, les quatre
// produits, comment ça se passe, des prénoms), une fiche par produit (galerie, titre, prix, un bouton, ce qu'on reçoit),
// pied de page. Commander un poème : le prénom s'écrit sur la fiche, COMMANDER ouvre la cérémonie du site (la carte, la
// réponse, la feuille, l'enveloppe, le cachet). Sans commande dans la page : pas de panier (un seul produit à la fois).
import './boutique.css';
import { siteFonts } from '../app/fonts.js';
import { count, installCount } from '../app/count.js';
import { sendNote, installSend } from '../app/send.js';
import { knownEmail, EMAIL_RE, saveSessionName } from '../app/storage.js';
import { stitch } from '../alt/stitch.js';
import { analysePrenom } from '../core/prenom.js';
import { vk } from '../core/version.js';
import { QUESTIONS as FAQ } from '../alt/questions.js';
import { AUTEUR } from '../menu/auteur.js';
import { PORTRAIT } from '../alt/config.js';
import { PRODUITS, produit, PRIX, DELAI_COURT } from './produits.js';
import { mountFeuille } from './feuille.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const url = p => new URL(p, document.baseURI).href;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const INSTAGRAM = 'https://www.instagram.com/e.t.ernel/';
const EXEMPLES = ['isabelle', 'anais', 'marysol', 'julie'];
const NAV = [['ACCUEIL', '#/'], ['BOUTIQUE', '#/boutique'], ['QUESTIONS', '#/questions'], ['A PROPOS', '#/a-propos'], ['CONTACT', '#/contact']];

const fonts = siteFonts('./');
installCount('boutique');
installSend();
document.documentElement.style.setProperty('--feuille', `url(${url('simple/feuille.jpg')})`);

const app = $('#app');
let cleanup = [];                   // ce que la vue en cours doit défaire en la quittant
const onLeave = f => cleanup.push(f);

// ——— le cadre : bandeau d'annonce, en-tête, menu, pied ———
$('#bar').innerHTML = `tapé à la machine · posté dans la semaine<span class="bar-p"> · ${esc(PRIX)} tout compris</span>`;
$('#nav').innerHTML = NAV.map(([t, h]) => `<a href="${h}">${t}</a>`).join('');
$('#drawerNav').innerHTML = NAV.map(([t, h]) => `<a href="${h}">${t}</a>`).join('');
$('#ft').innerHTML = `<div class="ft-in">
  <div class="ft-b"><span class="sig sew">SINGULIES</span><p>le nom que je donne à tout ça : les poèmes, le jeu de cartes, le fil noir qui relie les singuliés.</p></div>
  <div><h4>BOUTIQUE</h4>${PRODUITS.map(p => `<a href="#/produit/${p.id}">${esc(p.titre)}</a>`).join('')}</div>
  <div><h4>INFOS</h4><a href="#/questions">QUESTIONS</a><a href="#/a-propos">A PROPOS</a><a href="#/contact">CONTACT</a><a href="${INSTAGRAM}" target="_blank" rel="noopener">@e.t.ernel ↗</a></div>
  <div><h4>LEGAL</h4><a href="./conditions.html">CONDITIONS</a><a href="./mentions.html">MENTIONS</a><a href="./confidentialite.html">CONFIDENTIALITE</a></div>
</div><div class="ft-c"><span>© ETERNEL</span><span>un prénom, un poème, par la poste</span></div>`;
fonts.then(() => { stitch($('.logo'), { seed: 41 }); $$('.sew', $('#ft')).forEach((e, i) => stitch(e, { seed: 70 + i })); });

const burger = $('#burger'), drawer = $('#drawer');
function drawerSet(on) {
  drawer.hidden = !on; burger.setAttribute('aria-expanded', String(on));
  document.body.style.overflow = on ? 'hidden' : '';
  if (on) $('a', drawer)?.focus(); else if (document.activeElement && drawer.contains(document.activeElement)) burger.focus();
}
burger.addEventListener('click', () => drawerSet(drawer.hidden));
$('.drawer-x').addEventListener('click', () => drawerSet(false));
drawer.addEventListener('click', e => { if (e.target === drawer || e.target.closest('a')) drawerSet(false); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !drawer.hidden) drawerSet(false); });

// ——— petits outils ———
function typeText(el, text, { delay = 0 } = {}) {
  const tok = (el._tt = (el._tt || 0) + 1);
  el.textContent = '';
  if (REDUCED) { el.textContent = text; return; }
  const box = el.appendChild(document.createElement('span'));
  let i = 0;
  const step = () => {
    if (el._tt !== tok || i >= text.length) return;
    const c = text[i++];
    if (c === '\n') box.appendChild(document.createElement('br'));
    else { const s = document.createElement('span'); s.textContent = c; s.style.opacity = (0.8 + Math.random() * 0.2).toFixed(2); box.appendChild(s); }
    setTimeout(step, c === ' ' ? 26 : /[,.:]/.test(c) ? 160 : 30 + Math.random() * 46);
  };
  setTimeout(step, delay);
}
function zoom(src, alt) {
  const z = document.createElement('div'); z.className = 'zoom'; z.setAttribute('role', 'dialog'); z.setAttribute('aria-label', alt || 'image');
  z.innerHTML = `<img src="${esc(src)}" alt="${esc(alt || '')}"><button type="button" aria-label="fermer">×</button>`;
  const close = () => { z.remove(); removeEventListener('keydown', key, true); };
  const key = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  addEventListener('keydown', key, true);
  z.addEventListener('click', close);
  document.body.appendChild(z);
  $('button', z).focus();
}
const prixCarte = p => `<b>${esc(p.depuis ? 'à partir de ' + p.prix : p.prix)}</b>${p.unite ? ' <small>' + esc(p.unite) + '</small>' : ''}`;
const carte = p => `<a class="pc" href="#/produit/${p.id}">
  <span class="pc-m"><img class="pc-1" src="${url(p.cartes[0])}" alt="" loading="lazy" decoding="async"><img class="pc-2" src="${url(p.cartes[1] || p.cartes[0])}" alt="" loading="lazy" decoding="async"></span>
  <span class="pc-t">${esc(p.titre)}</span><span class="pc-p">${prixCarte(p)}</span></a>`;

// un petit dialogue pour laisser son email (liste d'attente) : même mécanisme que « un poème par mois » du site
function emailDialog({ titre, texte, bouton, kind, fait }) {
  const veil = document.createElement('div'); veil.className = 'zoom'; veil.style.cursor = 'default'; veil.setAttribute('role', 'dialog'); veil.setAttribute('aria-label', titre);
  veil.innerHTML = `<form class="ed" novalidate style="width:min(92vw,420px);padding:26px 22px 22px;background:#0b0b0b;border:1px solid rgba(255,255,255,.2);position:relative;text-align:left">
    <button type="button" class="ed-x" aria-label="fermer" style="position:absolute;top:2px;right:2px;width:48px;height:48px;font:300 30px/1 var(--gar);color:#fff">×</button>
    <h3 style="margin:0 0 12px;font:500 14px/1.5 var(--gar);letter-spacing:.3em;color:#f0f0f0;padding-right:40px">${esc(titre)}</h3>
    <p class="ed-t" style="margin:0 0 16px;font-size:14px;color:#c8c8c8">${esc(texte)}</p>
    <label style="display:block;margin:0 0 6px;font:500 11.5px/1.6 var(--gar);letter-spacing:.3em;color:rgba(255,255,255,.7)" for="ed-m">TON EMAIL</label>
    <input id="ed-m" type="email" name="email" autocomplete="email" inputmode="email" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="send" style="display:block;width:100%;min-height:52px;padding:8px 14px;font:16px var(--mono);color:#ececec;background:transparent;border:1px solid rgba(255,255,255,.3);border-radius:0">
    <input name="site" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;opacity:0">
    <p class="ed-e hint" role="status" style="margin:8px 0 6px"></p>
    <button class="btn full" type="submit">${esc(bouton)}</button></form>`;
  document.body.appendChild(veil);
  const form = $('form', veil), mail = $('#ed-m', veil), err = $('.ed-e', veil), trap = $('[name=site]', veil);
  if (knownEmail()) mail.value = knownEmail();
  const close = () => { veil.remove(); removeEventListener('keydown', key, true); };
  const key = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  addEventListener('keydown', key, true);
  $('.ed-x', veil).addEventListener('click', close);
  veil.addEventListener('click', e => { if (e.target === veil) close(); });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const m = mail.value.trim();
    if (!EMAIL_RE.test(m)) { err.textContent = 'cet email ne semble pas complet.'; mail.focus(); return; }
    if (!trap.value) sendNote({ kind, email: m });
    count('boutique/' + kind);
    form.innerHTML = `<button type="button" class="ed-x" aria-label="fermer" style="position:absolute;top:2px;right:2px;width:48px;height:48px;font:300 30px/1 var(--gar);color:#fff">×</button><p class="ed-ok" role="status" style="margin:0;white-space:pre-line;color:#ececec"></p>`;
    $('.ed-x', form).addEventListener('click', close);
    typeText($('.ed-ok', form), fait);
    fait && setTimeout(() => $('.ed-x', form)?.focus(), 50);
  });
  setTimeout(() => mail.focus(), 60);
}

// ——— la galerie d'un produit ———
// Des images, un film, la feuille qu'on écrit, ou un objet EN DIRECT (le livre, l'enveloppe, le paquet) : une image à la
// fois, qui se fond dans la suivante ; flèches, points, vignettes, glisser du doigt, ← →. Un seul canvas pour tous les
// états d'un même objet (le livre d'un livre à l'autre, l'enveloppe d'une étape à l'autre). Rien ne bouge tout seul.
function galerie(host, media, { onSlide = () => {}, start = 0 } = {}) {
  const live = media.find(m => m.t === 'live');
  host.innerHTML = `<div class="gal-main">
      <div class="gal-stage" tabindex="0" role="region" aria-roledescription="carrousel" aria-label="images du produit">${media.map((m, i) => `<figure class="gal-s ${m.t}${m.t === 'img' ? ' z' : ''}" data-i="${i}" aria-label="${i + 1} sur ${media.length}">${
        m.t === 'img' ? `<img src="${url(m.src)}" alt="${esc(m.alt)}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async">`
        : m.t === 'video' ? `<video muted loop playsinline preload="metadata" disablepictureinpicture poster="${url(m.poster)}" src="${url(m.src)}" aria-label="${esc(m.alt)}"></video>`
        : m.t === 'feuille' ? '<div class="gal-sheet" data-sheet></div>'
        : `<img class="gal-ph" src="${url(m.ph)}" alt="${esc(m.alt)}" decoding="async"><div class="gal-deck" data-deck></div>`}</figure>`).join('')}</div>
      <button class="gal-nav prev" type="button" aria-label="image précédente"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" stroke-width="1.2"/></svg></button>
      <button class="gal-nav next" type="button" aria-label="image suivante"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 5 L16 12 L9 19" fill="none" stroke="currentColor" stroke-width="1.2"/></svg></button>
    </div>
    <p class="gal-cap" aria-live="polite"></p>
    <div class="gal-dots">${media.map((m, i) => `<button class="gal-dot" type="button" data-i="${i}" aria-label="image ${i + 1}"><i></i></button>`).join('')}</div>
    <div class="gal-th">${media.map((m, i) => `<button class="gal-t" type="button" data-i="${i}" aria-label="voir l’image ${i + 1}"><img src="${url(m.thumb || m.src || m.ph)}" alt="" loading="lazy"></button>`).join('')}</div>`;
  const stage = $('.gal-stage', host), slides = $$('.gal-s', host), dots = $$('.gal-dot', host), ths = $$('.gal-t', host), prev = $('.prev', host), next = $('.next', host), cap = $('.gal-cap', host);
  let cur = -1, liveBox = null, deck = null, dead = false;

  // l'objet en direct : un canvas pour tout le stage ; chaque état est une étape (p)
  async function mountObject() {
    if (!live || liveBox) return;
    liveBox = mountLiveOnce(stage, live.scene, live.p);
  }
  function mountLiveOnce(box, scene, p) {
    return import('./objet3d.js').then(m => m.mountLive(box, m.SCENES[scene].make('./'), { reduced: REDUCED, p, zoom: m.SCENES[scene].zoom })).then(r => { if (dead) r?.destroy(); return r; });
  }

  function go(i, { instant = false } = {}) {
    i = Math.max(0, Math.min(media.length - 1, i));
    if (i === cur) return;
    const m = media[i];
    cur = i;
    slides.forEach((s, k) => { s.classList.toggle('on', k === i); s.setAttribute('aria-hidden', String(k !== i)); });
    dots.forEach((d, k) => d.setAttribute('aria-current', String(k === i)));
    ths.forEach((d, k) => d.setAttribute('aria-current', String(k === i)));
    prev.disabled = i === 0; next.disabled = i === media.length - 1;
    stage.classList.toggle('lv', m.t === 'live');
    // les films ne jouent que vus
    slides.forEach((s, k) => { const v = $('video', s); if (v) { if (k === i && !REDUCED) v.play().catch(() => {}); else v.pause(); } });
    if (m.t === 'live') { mountObject(); liveBox?.then(r => r?.setP(m.p)); }
    if (m.t === 'deck' && !deck) {
      const box = $('[data-deck]', slides[i]);
      deck = import('../jeu/deck3d.js').then(d => d.mountDeck(box, { base: './', reduced: REDUCED, onDraw: id => { count('boutique/jeu-carte'); location.href = url('jeu.html?q=' + id); } }))
        .then(r => { if (r) { slides[i].classList.add('deck-on'); box.addEventListener('click', () => { count('boutique/jeu-tirer'); r.pull(); }); box.style.cursor = 'pointer'; } return r; }).catch(() => null);
    }
    cap.textContent = '';
    if (m.cap) typeText(cap, m.cap, { delay: instant ? 0 : 250 });
    onSlide(i, m);
  }
  prev.addEventListener('click', () => go(cur - 1)); next.addEventListener('click', () => go(cur + 1));
  [...dots, ...ths].forEach(b => b.addEventListener('click', () => go(+b.dataset.i)));
  stage.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1); } });
  // glisser de côté : l'image voisine (le défilement vertical de la page reste libre)
  let sx = null, sy = 0, moved = false;
  stage.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.button !== 0) return; sx = e.clientX; sy = e.clientY; moved = false; });
  stage.addEventListener('pointerup', e => {
    if (sx == null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
    if (Math.abs(dx) > 44 && Math.abs(dx) > 1.5 * Math.abs(dy)) { moved = true; go(cur + (dx < 0 ? 1 : -1)); }
  });
  stage.addEventListener('pointercancel', () => { sx = null; });
  slides.forEach((s, i) => { if (media[i].t === 'img') s.addEventListener('click', () => { if (moved) { moved = false; return; } zoom(url(media[i].src), media[i].alt); }); });
  go(start, { instant: true });
  return {
    go, get index() { return cur; }, sheetHost: $('[data-sheet]', host), sheetIndex: media.findIndex(m => m.t === 'feuille'),
    destroy() { dead = true; liveBox?.then(r => r?.destroy()); },
  };
}

// ——— les vues ———
const VIEWS = {
  accueil() {
    app.innerHTML = `<div class="wrap">
      <section class="hero" aria-label="un prénom, un poème">
        <div class="hero-m" id="hm" role="img" aria-label="Des poèmes d’Eternel : un prénom en colonne sur une feuille noire, un vers par lettre.">${EXEMPLES.map((e, i) => `<img src="${url('exemples/' + e + '.jpg')}" alt="" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} class="${i ? '' : 'on'}">`).join('')}</div>
        <div class="hero-t">
          <h1>UN PRENOM,<br>UN POEME</h1>
          <p class="hero-p">j’écris un poème avec ton prénom, je le tape à la machine à écrire et je te l’envoie par la poste.</p>
          <div class="hero-b"><a class="btn" href="#/produit/poeme">ECRIRE MON POEME</a><a class="btn ghost" href="#/boutique">LA BOUTIQUE</a></div>
        </div>
      </section>
      <section class="sec" aria-labelledby="t-b"><h2 class="h2 sew" id="t-b">LA BOUTIQUE</h2><div class="grid">${PRODUITS.map(carte).join('')}</div></section>
      <section class="sec" aria-labelledby="t-c"><h2 class="h2 sew" id="t-c">COMMENT CA SE PASSE</h2>
        <div class="steps">${[['simple/feuille.jpg', 'ecris le prenom'], ['simple/dos.jpg', 'reponds a une question'], ['simple/enveloppe-dos.jpg', 'je l’ecris, je le poste']].map(([im, ti], i) => {
          const e = produit('poeme').etapes[i];
          return `<div class="step"><div class="step-m"><img src="${url(im)}" alt="" loading="lazy"></div><h3><i>${i + 1}.</i> ${esc(['ECRIS LE PRENOM', 'REPONDS A UNE QUESTION', 'JE L’ECRIS, JE LE POSTE'][i])}</h3><p>${esc(e[1])}</p></div>`;
        }).join('')}</div>
        <p style="text-align:center;margin:34px 0 0"><a class="btn" href="#/produit/poeme">COMMENCER PAR LE PRENOM</a></p>
      </section>
      <section class="sec" aria-labelledby="t-e"><h2 class="h2 sew" id="t-e">DES PRENOMS, DES POEMES</h2>
        <div class="ex">${EXEMPLES.map(e => `<button type="button" data-e="${e}" aria-label="agrandir le poème pour ${e.toUpperCase()}"><img src="${url('exemples/' + e + '.jpg')}" alt="Un poème pour ${e.toUpperCase()}" loading="lazy"></button>`).join('')}</div>
        <p class="ex-c">des exemples : chaque poème est écrit pour une seule personne.</p>
      </section>
      <section class="sec" aria-labelledby="t-a"><h2 class="h2 sew" id="t-a">QUI T’ECRIT</h2>
        <div class="txt">${AUTEUR.slice(0, 2).map(p => `<p>${esc(p)}</p>`).join('')}<a class="btn ghost" href="#/a-propos">EN SAVOIR PLUS</a></div>
      </section></div>`;
    // la bannière : les quatre poèmes se fondent l'un dans l'autre
    const imgs = $$('#hm img');
    if (!REDUCED && imgs.length > 1) {
      let k = 0; const t = setInterval(() => { imgs[k].classList.remove('on'); k = (k + 1) % imgs.length; imgs[k].classList.add('on'); }, 4200);
      onLeave(() => clearInterval(t));
    }
    $$('.ex button', app).forEach(b => b.addEventListener('click', () => zoom(url('exemples/' + b.dataset.e + '.jpg'), 'Un poème pour ' + b.dataset.e.toUpperCase())));
    return { titre: 'ETERNEL — un prénom, un poème', stat: 'accueil' };
  },

  boutique() {
    app.innerHTML = `<div class="wrap page"><h1 class="h1 sew">LA BOUTIQUE</h1><div class="grid">${PRODUITS.map(carte).join('')}</div></div>`;
    return { titre: 'la boutique — ETERNEL', stat: 'boutique' };
  },

  questions() {
    app.innerHTML = `<div class="wrap page"><h1 class="h1 sew">QUESTIONS</h1><div class="qlist">${FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a.replace('(menu en haut à droite, CONTACT)', '(page CONTACT)'))}</p></details>`).join('')}</div>
      <p style="text-align:center;margin:34px 0 0" class="soft">une autre question ? <a href="#/contact" style="border-bottom:1px solid rgba(255,255,255,.3)">écris-moi</a>.</p></div>`;
    const ds = $$('.qlist details', app);
    for (const d of ds) d.addEventListener('toggle', () => { if (d.open) for (const o of ds) if (o !== d) o.open = false; });
    return { titre: 'questions — ETERNEL', stat: 'questions' };
  },

  'a-propos'() {
    app.innerHTML = `<div class="wrap page"><h1 class="h1 sew">A PROPOS</h1><div class="txt">
      ${PORTRAIT ? `<img src="${url(PORTRAIT)}" alt="Eternel" style="width:min(260px,64vw);aspect-ratio:4/5;object-fit:cover;margin:0 auto 28px;filter:grayscale(1) brightness(.9)">` : ''}
      ${AUTEUR.map(p => `<p>${esc(p)}</p>`).join('')}
      <p style="margin-top:26px">${esc('singuliés, c’est le nom que je donne à tout ça : les poèmes, le jeu de cartes, le fil noir qui relie les singuliés.')}</p>
      <a class="btn" href="#/contact">ECRIS-MOI</a>
      <p style="margin-top:22px"><a href="${INSTAGRAM}" target="_blank" rel="noopener" class="soft" style="border-bottom:1px solid rgba(255,255,255,.25)">@e.t.ernel ↗</a></p></div></div>`;
    return { titre: 'à propos — ETERNEL', stat: 'a-propos' };
  },

  contact() {
    app.innerHTML = `<div class="wrap page"><h1 class="h1 sew">CONTACT<small>écris ton message sur la carte, je te réponds.</small></h1><div class="ct-wrap" id="ct"></div></div>`;
    import('../menu/contact.js').then(m => { if (document.getElementById('ct')) m.mountContact($('#ct'), { base: './' }); });
    return { titre: 'contact — ETERNEL', stat: 'contact' };
  },

  produit(id, qs) {
    const p = produit(id);
    if (!p) return VIEWS.introuvable();
    let vi = p.variantes ? Math.max(0, p.variantes.findIndex(v => v.id === qs.get('v'))) : -1;
    const V = () => (vi >= 0 ? p.variantes[vi] : null);
    const titre = () => (V() ? V().nom : p.titre);
    const prix = () => (V() ? V().prix : p.prix);
    app.innerHTML = `<div class="wrap"><div class="fiche">
      <div class="gal" id="gal"></div>
      <div class="info" id="info"></div></div>
      <section class="sec" aria-labelledby="t-r"><h2 class="h2 sew" id="t-r">TU AIMERAS AUSSI</h2><div class="grid">${PRODUITS.filter(x => x.id !== p.id).map(carte).join('')}</div></section></div>
      <div class="buy" id="buy" aria-hidden="true"></div>`;
    let gal = null, feuille = null, input = null;
    const info = $('#info'), buy = $('#buy');

    const ctaHtml = (cls = '') => {
      if (p.id === 'livres') return `<a class="btn full ${cls}" id="cta" href="${esc(V().href)}" target="_blank" rel="noopener">${esc(p.cta)} ↗</a>`;
      return `<button class="btn full ${cls}" id="cta" type="${p.id === 'poeme' ? 'submit' : 'button'}">${esc(p.cta)}</button>`;
    };
    const acc = () => `<div class="acc">
      <details${p.id === 'poeme' ? ' open' : ''}><summary>CE QUE TU RECOIS</summary><div class="in"><ul>${p.recoit.map(r => `<li>${esc(r)}</li>`).join('')}</ul></div></details>
      ${p.etapes.length ? `<details><summary>COMMENT CA SE PASSE</summary><div class="in"><ol>${p.etapes.map(([a, b]) => `<li><b>${esc(a)}</b> — ${esc(b)}</li>`).join('')}</ol></div></details>` : ''}
      <details><summary>LIVRAISON ET PAIEMENT</summary><div class="in"><p>${esc(p.livraison)}</p><p>${esc(p.paiement)}</p></div></details>
      ${p.id === 'poeme' ? '<details><summary>UNE QUESTION ?</summary><div class="in"><p>les réponses à ce qu’on me demande le plus : <a href="#/questions" style="border-bottom:1px solid rgba(255,255,255,.3)">QUESTIONS</a>.</p></div></details>' : ''}
    </div>`;

    function renderInfo() {
      const v = V();
      const head = `<p class="crumb"><a href="#/">ACCUEIL</a><i>/</i><a href="#/boutique">BOUTIQUE</a><i>/</i>${esc(p.titre)}</p>
        <h1 class="ti">${esc(titre())}</h1>
        <p class="pr"><b>${esc(prix())}</b><span>${esc(p.unite)}</span></p>
        <p class="lead">${esc(v ? v.accroche : p.accroche)}</p>${v ? `<p class="fmt">${esc(v.format)}</p>` : ''}`;
      let body;
      if (p.variantes) {
        body = `<p class="vars-l" id="vl">LE LIVRE</p><div class="vars" role="group" aria-labelledby="vl">${p.variantes.map((x, i) => `<button class="var" type="button" data-v="${i}" aria-pressed="${i === vi}">${esc(x.nom)}</button>`).join('')}</div>${ctaHtml()}
          <p class="micro">vendu et expédié par amazon.</p>`;
      } else if (p.id === 'poeme') {
        body = `<form class="perso" id="perso" novalidate autocomplete="on">
          <label for="prenom">LE PRENOM</label>
          <input id="prenom" name="given-name" type="text" autocomplete="given-name" autocapitalize="characters" autocorrect="off" spellcheck="false" maxlength="40" enterkeyhint="done" inputmode="text" placeholder="le tien, ou celui de la personne à qui tu l’offres">
          <p class="hint" id="hint" role="status" aria-live="polite"></p>
          ${ctaHtml()}</form>
          <p class="micro">${esc(DELAI_COURT)} · si l’enveloppe se perd, je refais le poème · <a href="./conditions.html">conditions</a><br>${esc(p.paiement)}</p>`;
      } else if (p.id === 'jeu') {
        body = `${ctaHtml()}<div class="row2"><a class="btn ghost" href="${p.essai}">TIRER UNE CARTE</a></div><p class="micro">le jeu n’est pas encore en vente : laisse ton email, je te préviens.</p>`;
      } else {
        body = `${ctaHtml()}<p class="micro">${esc(p.paiement)}</p>`;
      }
      info.innerHTML = head + body + acc();
      // (un livre = une image de la galerie : choisir le livre ou feuilleter la galerie, c'est la même chose)
      $$('.var', info).forEach(b => b.addEventListener('click', () => { const k = media.findIndex(m => m.variant === +b.dataset.v); if (k >= 0) gal ? gal.go(k) : (vi = +b.dataset.v); }));
      watchCta();
      wire();
    }

    const media = p.media;
    function renderGal() {
      gal?.destroy();
      const start = vi >= 0 ? Math.max(0, media.findIndex(m => m.variant === vi)) : 0;
      gal = galerie($('#gal'), media, { start, onSlide: (i, m) => {
        if (m.variant != null && m.variant !== vi && vi >= 0) { vi = m.variant; history.replaceState(history.state, '', '#/produit/livres?v=' + V().id); document.title = `${titre().toLowerCase()} — ETERNEL`; renderInfo(); wireBuy(); }
      } });
      if (p.id === 'poeme' && gal.sheetHost && input) { feuille?.destroy(); feuille = mountFeuille(gal.sheetHost, input, { onChange: () => {} }); }
    }

    function wire() {
      const cta = $('#cta', info);
      if (p.id === 'poeme') {
        input = $('#prenom', info);
        const hint = $('#hint', info);
        const update = () => {
          const a = analysePrenom(input.value);
          hint.className = 'hint' + (a.messages.length ? '' : ' ok');
          hint.textContent = a.messages.length ? a.messages[0].texte : (a.vide ? '' : 'sur la feuille : ' + a.nom.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase()) + '.');
        };
        input.addEventListener('input', () => { update(); if (gal && gal.sheetIndex > 0) gal.go(gal.sheetIndex); });
        input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } });
        $('#perso', info).addEventListener('submit', e => { e.preventDefault(); commander(); });
        function commander() {
          const a = analysePrenom(input.value);
          if (a.vide) { hint.className = 'hint'; hint.textContent = 'écris d’abord le prénom : il se posera sur la feuille.'; input.focus(); gal?.go(gal.sheetIndex); return; }
          count('boutique/commander');
          // le prénom suit dans l'onglet ; la cérémonie du site (index.html) l'écrit, puis enchaîne : question, réponse, feuille, enveloppe
          saveSessionName(a.nom);
          try { sessionStorage.setItem(vk('sg.depuis'), 'boutique'); sessionStorage.setItem(vk('sg.retour'), 'boutique.html#/produit/poeme'); } catch { /* */ }
          document.body.classList.add('leaving');
          setTimeout(() => { location.href = url('index.html') + location.search; }, REDUCED ? 0 : 340);   // (les réglages d'essai — ?envoi=0… — suivent)
        }
        onLeave(() => feuille?.destroy());
      } else if (p.id === 'mois') {
        cta.addEventListener('click', () => { count('boutique/rejoindre'); emailDialog({ titre: 'UN POEME PAR MOIS', texte: 'les premières lettres partent bientôt : laisse ton email, je t’écris quand la première est prête. rien n’est débité.', bouton: 'RESERVER MA PLACE', kind: 'club', fait: 'c’est noté.\nje t’écris pour la première lettre.' }); });
      } else if (p.id === 'jeu') {
        cta.addEventListener('click', () => { count('boutique/jeu-prevenir'); emailDialog({ titre: 'LE JEU', texte: 'le jeu n’est pas encore en vente : laisse ton email, je te préviens quand il sort.', bouton: 'ME PREVENIR', kind: 'jeu', fait: 'c’est noté.\nje t’écris quand le jeu sort.' }); });
      } else if (p.id === 'livres') {
        cta.addEventListener('click', () => count('boutique/amazon-' + V().id));
      }
    }

    // la barre collante (téléphone) : le bouton reste à portée quand celui de la fiche a disparu
    function wireBuy() {
      buy.innerHTML = `<span class="buy-p">${esc(prix())}</span>${p.id === 'livres' ? `<a class="btn" href="${esc(V().href)}" target="_blank" rel="noopener">${esc(p.cta)} ↗</a>` : `<button class="btn" type="button">${esc(p.cta)}</button>`}`;
      const b = $('button.btn', buy);
      if (b) b.addEventListener('click', () => {
        if (p.id === 'poeme') { if (analysePrenom(input.value).vide) { $('#cta', info).scrollIntoView({ block: 'center', behavior: REDUCED ? 'auto' : 'smooth' }); input.focus({ preventScroll: true }); } else $('#perso', info).requestSubmit(); }
        else $('#cta', info).click();
      });
    }
    // la barre n'apparaît que lorsque le bouton de la fiche est sorti de l'écran (par le haut)
    let io = null;
    function watchCta() {
      if (!('IntersectionObserver' in window)) return;
      io?.disconnect();
      io = new IntersectionObserver(([en]) => { const on = !en.isIntersecting && en.boundingClientRect.top < 0; buy.classList.toggle('on', on); buy.setAttribute('aria-hidden', String(!on)); });
      const c = $('#cta', info); if (c) io.observe(c);
    }
    renderInfo(); renderGal(); wireBuy();
    onLeave(() => io?.disconnect());
    onLeave(() => gal?.destroy());
    return { titre: `${titre().toLowerCase()} — ETERNEL`, stat: 'produit/' + id };
  },

  introuvable() {
    app.innerHTML = `<div class="wrap page"><h1 class="h1">INTROUVABLE</h1><div class="txt"><p>cette page n’existe pas.</p><a class="btn" href="#/">ACCUEIL</a></div></div>`;
    return { titre: 'introuvable — ETERNEL', stat: 'introuvable' };
  },
};

// ——— le routeur ———
history.scrollRestoration = 'manual';
const saved = new Map();      // vue → défilement, pour le retour du navigateur
let curKey = null, pushed = false;
document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('a[href^="#/"]'); if (a) pushed = true; });
function route() {
  if (curKey != null) saved.set(curKey, scrollY);
  for (const f of cleanup) { try { f(); } catch { /* */ } }
  cleanup = [];
  const [path, q = ''] = location.hash.replace(/^#\/?/, '').split('?');
  const qs = new URLSearchParams(q), parts = path.split('/').filter(Boolean);
  const key = '/' + parts.join('/');
  let v;
  if (!parts.length) v = VIEWS.accueil();
  else if (parts[0] === 'produit' && parts[1]) v = VIEWS.produit(parts[1], qs);
  else if (VIEWS[parts[0]] && parts[0] !== 'produit' && parts[0] !== 'introuvable' && parts[0] !== 'accueil') v = VIEWS[parts[0]]();
  else v = VIEWS.introuvable();
  document.title = v.titre;
  // le lien du menu de la vue
  const cur = '#/' + (parts[0] === 'produit' ? 'boutique' : parts[0] || '');
  $$('#nav a, #drawerNav a').forEach(a => { if (a.getAttribute('href') === cur) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  fonts.then(() => $$('.sew', app).forEach((e, i) => stitch(e, { seed: 5 + i * 3 })));
  const back = !pushed && saved.has(key);
  scrollTo(0, back ? saved.get(key) : 0);
  pushed = false; curKey = key;
  if (!back) app.focus({ preventScroll: true });
  count('boutique/' + v.stat);
}
addEventListener('hashchange', route);
route();
// (retour depuis la cérémonie : la page peut revenir de la mémoire du navigateur — on la remet à plat)
addEventListener('pageshow', e => { if (e.persisted) document.body.classList.remove('leaving'); });
