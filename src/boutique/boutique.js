// Version boutique (18/10, Maxence : « une version plus classique, type boutique en ligne — l'idée de la forme de
// navigation et de l'expérience utilisateur, pas copier le design — avec mes rendus, ma qualité graphique, mon univers »).
// Une seule page, des adresses par vue (#/, #/boutique, #/produit/poeme, #/a-propos, #/questions, #/contact) : le retour du
// navigateur ramène à la vue d'avant, rien ne se recharge. L'en-tête est celui du site (entete.js : ETERNEL sur son fil, ←,
// ≡) ; l'accueil est la feuille où l'on écrit son prénom — le prix et COMMANDER paraissent une fois le prénom écrit :
// on voit l'objet qu'on achète avant son prix — puis les quatre produits ; une fiche par produit (galerie, un seul bouton) ;
// toucher un poème le montre de plus près (visionneuse : gauche / droite). Commander un poème : la cérémonie du site
// (la carte, la réponse, la feuille, l'enveloppe, le cachet), où RECEVOIR part tout seul. Pas de panier.
import './boutique.css';
import { siteFonts } from '../app/fonts.js';
import { count, installCount } from '../app/count.js';
import { sendNote, installSend } from '../app/send.js';
import { knownEmail, EMAIL_RE, saveSessionName, sessionName } from '../app/storage.js';
import { stitch } from '../alt/stitch.js';
import { analysePrenom } from '../core/prenom.js';
import { vk } from '../core/version.js';
import { QUESTIONS as FAQ } from '../alt/questions.js';
import { AUTEUR } from '../menu/auteur.js';
import { PORTRAIT } from '../alt/config.js';
import { PRODUITS, POEMES, produit, PRIX, DELAI_COURT } from './produits.js';
import { mountFeuille } from './feuille.js';
import { installEntete } from './entete.js';
import { ouvrirVisionneuse } from './visionneuse.js';
import { mountDefile } from './defile.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const url = p => new URL(p, document.baseURI).href;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TOUCH = matchMedia('(pointer: coarse)').matches;
const INSTAGRAM = 'https://www.instagram.com/e.t.ernel/';
const LEGAL = [['MENTIONS', './mentions.html'], ['CONDITIONS', './conditions.html'], ['CONFIDENTIALITE', './confidentialite.html']];
const poemeItems = () => POEMES.map(n => ({ src: url(`boutique/poeme-${n}.jpg`), alt: `Un poème pour ${n.toUpperCase()}, tapé à la machine.` }));

const fonts = siteFonts('./');
installCount('boutique');
installSend();
document.documentElement.style.setProperty('--feuille', `url(${url('simple/feuille.jpg')})`);

const app = $('#app');
let cleanup = [];                   // ce que la vue en cours doit défaire en la quittant
const onLeave = f => cleanup.push(f);

// ——— le pied : les liens, puis SINGULIES sur son fil d'un bord à l'autre (comme en bas du site) ———
$('#ft').innerHTML = `<div class="ft-in">
  <div><h4>BOUTIQUE</h4>${PRODUITS.map(p => `<a href="#/produit/${p.id}">${esc(p.titre)}</a>`).join('')}</div>
  <div><h4>INFOS</h4><a href="#/questions">QUESTIONS</a><a href="#/a-propos">A PROPOS</a><a href="#/contact">CONTACT</a><a href="${INSTAGRAM}" target="_blank" rel="noopener">@e.t.ernel ↗</a></div>
  <div><h4>LEGAL</h4>${LEGAL.map(([l, h]) => `<a href="${h}">${l}</a>`).join('')}</div>
</div>
<div class="ft-sig" id="ft-sig"><canvas aria-hidden="true"></canvas><button type="button" aria-label="SINGULIES, ce que c’est">SINGULIES</button></div>
<p class="ft-c">© ETERNEL · un prénom un poème par la poste</p>`;

// retour : la page d'avant dans la boutique, sinon l'accueil
const stack = [];
const entete = installEntete({
  produits: PRODUITS.map(p => ({ id: p.id, titre: p.titre })), legal: LEGAL,
  onBack: () => { if (stack.length) history.back(); else location.hash = '#/'; },
  onSingulies: () => import('../menu/singulies.js').then(m => m.openSingulies({ base: './', reduced: REDUCED })),
});

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
const prixCarte = p => `<b>${esc(p.depuis ? 'à partir de ' + p.prix : p.prix)}</b>${p.unite ? ' <small>' + esc(p.unite) + '</small>' : ''}`;
const carte = p => `<a class="pc" href="#/produit/${p.id}">
  <span class="pc-m"><img class="pc-1" src="${url(p.cartes[0])}" alt="" loading="lazy" decoding="async"><img class="pc-2" src="${url(p.cartes[1] || p.cartes[0])}" alt="" loading="lazy" decoding="async"></span>
  <span class="pc-t">${esc(p.titre)}</span><span class="pc-p">${prixCarte(p)}</span></a>`;
const prenomAffiche = nom => nom.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase());

// COMMANDER (le poème) : le prénom suit dans l'onglet, puis la cérémonie du site (index.html) l'écrit, les lettres volent,
// la feuille se pose, RECEVOIR part tout seul ; ← ramène à la fiche (homeUrl, storage.js)
function commander(nom) {
  count('boutique/commander');
  saveSessionName(nom);
  try { sessionStorage.setItem(vk('sg.depuis'), 'boutique'); sessionStorage.setItem(vk('sg.retour'), 'boutique.html#/produit/poeme'); } catch { /* */ }
  document.body.classList.add('leaving');
  setTimeout(() => { location.href = url('index.html') + location.search; }, REDUCED ? 0 : 340);   // (les réglages d'essai — ?envoi=0… — suivent)
}

// un petit dialogue pour laisser son email (liste d'attente) : même mécanisme que « un poème par mois » du site
function emailDialog({ titre, texte, bouton, kind, fait }) {
  const veil = document.createElement('div'); veil.className = 'dlg'; veil.setAttribute('role', 'dialog'); veil.setAttribute('aria-modal', 'true'); veil.setAttribute('aria-label', titre);
  veil.innerHTML = `<form class="dlg-b" novalidate>
    <button type="button" class="dlg-x" aria-label="fermer">×</button>
    <h3>${esc(titre)}</h3>
    <p class="dlg-t">${esc(texte)}</p>
    <label for="ed-m">ADRESSE EMAIL</label>
    <input id="ed-m" type="email" name="email" autocomplete="email" inputmode="email" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="send">
    <input class="trap" name="site" tabindex="-1" autocomplete="off" aria-hidden="true">
    <p class="hint dlg-e" role="status"></p>
    <button class="btn full" type="submit">${esc(bouton)}</button></form>`;
  document.body.appendChild(veil);
  const opener = document.activeElement;
  requestAnimationFrame(() => veil.classList.add('on'));
  const form = $('form', veil), mail = $('#ed-m', veil), err = $('.dlg-e', veil), trap = $('.trap', veil);
  if (knownEmail()) mail.value = knownEmail();
  const close = () => { removeEventListener('keydown', key, true); veil.classList.remove('on'); setTimeout(() => veil.remove(), 250); opener?.focus?.({ preventScroll: true }); };
  const key = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  addEventListener('keydown', key, true);
  $('.dlg-x', veil).addEventListener('click', close);
  veil.addEventListener('click', e => { if (e.target === veil) close(); });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const m = mail.value.trim();
    if (!EMAIL_RE.test(m)) { err.textContent = 'cette adresse ne semble pas complète.'; mail.focus(); return; }
    if (!trap.value) sendNote({ kind, email: m });
    count('boutique/' + kind);
    form.innerHTML = `<button type="button" class="dlg-x" aria-label="fermer">×</button><p class="dlg-ok" role="status"></p>`;
    $('.dlg-x', form).addEventListener('click', close);
    typeText($('.dlg-ok', form), fait);
    setTimeout(() => $('.dlg-x', form)?.focus(), 50);
  });
  setTimeout(() => mail.focus(), 80);
}

// ——— la galerie d'un produit ———
// Des images, un film, la feuille où l'on écrit, ou un objet EN DIRECT (le livre, l'enveloppe, le paquet) : une image à la
// fois, qui se fond dans la suivante ; flèches, points, vignettes, glisser du doigt, ← →. Un seul canvas pour tous les
// états d'un même objet (le livre d'un livre à l'autre, l'enveloppe d'une étape à l'autre). Rien ne bouge tout seul.
// Toucher un poème (une image) : la visionneuse, de plus près, gauche / droite pour changer.
function galerie(host, media, { onSlide = () => {}, start = 0 } = {}) {
  const live = media.find(m => m.t === 'live');
  const zoomable = media.map((m, i) => (m.t === 'img' && m.zoom !== false ? i : -1)).filter(i => i >= 0);
  host.innerHTML = `<div class="gal-main">
      <div class="gal-stage" tabindex="0" role="region" aria-roledescription="carrousel" aria-label="images du produit">${media.map((m, i) => `<figure class="gal-s ${m.t}${zoomable.includes(i) ? ' z' : ''}" data-i="${i}" aria-label="${i + 1} sur ${media.length}">${
        m.t === 'img' ? `<img src="${url(m.src)}" alt="${esc(m.alt)}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async" draggable="false">`
        : m.t === 'video' ? `<video muted loop playsinline preload="metadata" disablepictureinpicture poster="${url(m.poster)}" src="${url(m.src)}" data-from="${m.from || 0}" aria-label="${esc(m.alt)}"></video>`
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
  // (19/10, Maxence : « enlève la vidéo des mains, garde juste le mécanisme ») le film commence (et reboucle) à `from` : après les mains
  for (const v of $$('video[data-from]', host)) {
    const from = +v.dataset.from || 0; if (!from) continue;
    const seek = () => { try { if (v.currentTime < from) v.currentTime = from; } catch { /* */ } };
    v.addEventListener('loadedmetadata', seek); v.addEventListener('play', seek); v.addEventListener('timeupdate', seek);
  }

  // l'objet en direct : un canvas pour tout le stage ; chaque état est une étape (p)
  function mountObject() {
    if (!live || liveBox) return;
    liveBox = import('./objet3d.js').then(m => m.mountLive(stage, m.SCENES[live.scene].make('./'), { reduced: REDUCED, p: live.p, zoom: m.SCENES[live.scene].zoom, lift: m.SCENES[live.scene].lift })).then(r => { if (dead) r?.destroy(); return r; });
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
  // glisser de côté : l'image voisine (le défilement vertical de la page reste libre) ; un toucher sur un poème : la visionneuse
  let sx = null, sy = 0, moved = false;
  stage.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.button !== 0) return; sx = e.clientX; sy = e.clientY; moved = false; });
  stage.addEventListener('pointerup', e => {
    if (sx == null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
    if (Math.abs(dx) > 44 && Math.abs(dx) > 1.5 * Math.abs(dy)) { moved = true; go(cur + (dx < 0 ? 1 : -1)); }
  });
  stage.addEventListener('pointercancel', () => { sx = null; });
  slides.forEach((s, i) => {
    if (!zoomable.includes(i)) return;
    s.addEventListener('click', () => {
      if (moved) { moved = false; return; }
      count('boutique/zoom');
      ouvrirVisionneuse(zoomable.map(k => ({ src: url(media[k].src), alt: media[k].alt })), zoomable.indexOf(i));
    });
  });
  go(start, { instant: true });
  return {
    go, get index() { return cur; }, sheetHost: $('[data-sheet]', host), sheetIndex: media.findIndex(m => m.t === 'feuille'),
    destroy() { dead = true; liveBox?.then(r => r?.destroy()); },
  };
}

// ——— le champ du prénom : l'accueil et la fiche du poème ———
// input : le champ ; indice : le texte sous la feuille ; rend { nom, vide }
function brancherPrenom(input, hint, { onChange = () => {} } = {}) {
  let t = 0;
  const maj = () => {
    const a = analysePrenom(input.value);
    hint.className = 'hint' + (a.messages.length ? '' : ' ok');
    hint.textContent = a.messages.length ? a.messages[0].texte : (a.vide ? '' : 'sur la feuille : ' + prenomAffiche(a.nom) + '.');
    clearTimeout(t); t = setTimeout(() => { if (!a.vide) saveSessionName(a.nom); }, 400);   // (retenu le temps de la visite : la fiche, la cérémonie)
    onChange(a);
  };
  input.addEventListener('input', maj);
  input.addEventListener('keydown', e => { if (e.key === 'Escape') input.blur(); });
  return { maj, get a() { return analysePrenom(input.value); } };
}

// ——— les vues ———
const VIEWS = {
  accueil() {
    app.innerHTML = `<div class="wrap">
      <section class="hero" aria-label="un prénom un poème">
        <h1 class="hero-h">UN PRENOM<br>UN POEME</h1>
        <div class="hero-s" id="stage"><div class="hero-sheet" id="hs"></div></div>
        <form class="hero-f" id="hf" novalidate autocomplete="on">
          <label class="sr" for="hp">un prénom</label>
          <input class="hero-in" id="hp" name="given-name" type="text" autocomplete="given-name" autocapitalize="characters" autocorrect="off" spellcheck="false" maxlength="40" enterkeyhint="done" inputmode="text" placeholder="entre un prénom">
          <p class="hint" id="hh" role="status" aria-live="polite"></p>
          <div class="hero-r" id="hr" aria-hidden="true"><div>
            <p class="hero-pr"><b>${esc(PRIX)}</b> tout compris <span>· ${esc(DELAI_COURT)}</span></p>
            <button class="btn full" type="submit" tabindex="-1">COMMANDER</button>
            <a class="hero-d" href="#/produit/poeme" tabindex="-1">voir le détail</a>
          </div></div>
        </form>
        <p class="hero-p">j’écris un poème avec un prénom, je le tape à la machine à écrire et je l’envoie par la poste.</p>
      </section>
      <section class="sec" aria-labelledby="t-b"><h2 class="h2 sew" id="t-b">LA BOUTIQUE</h2><div class="grid">${PRODUITS.map(carte).join('')}</div></section>
      <section class="sec" aria-labelledby="t-c"><h2 class="h2 sew" id="t-c">COMMENT CA SE PASSE</h2>
        <div class="steps">${[['simple/feuille.jpg', 'ECRIRE LE PRENOM'], ['simple/dos.jpg', 'REPONDRE A UNE QUESTION'], ['simple/enveloppe-dos.jpg', 'JE L’ECRIS JE LE POSTE']].map(([im, ti], i) => `<div class="step"><div class="step-m"><img src="${url(im)}" alt="" loading="lazy"></div><h3><i>${i + 1}.</i> ${esc(ti)}</h3><p>${esc(produit('poeme').etapes[i][1])}</p></div>`).join('')}</div>
      </section>
      <section class="sec" aria-labelledby="t-e"><h2 class="h2 sew" id="t-e">DES PRENOMS DES POEMES</h2>
        <div class="ex">${POEMES.map((e, i) => `<button type="button" data-i="${i}" aria-label="voir de plus près le poème pour ${e.toUpperCase()}"><img src="${url('boutique/poeme-' + e + '.jpg')}" alt="Un poème pour ${e.toUpperCase()}" loading="lazy" decoding="async" draggable="false"></button>`).join('')}</div>
        <p class="ex-c">chaque poème est écrit pour une seule personne.</p>
      </section>
      <section class="sec" aria-labelledby="t-a"><h2 class="h2 sew" id="t-a">QUI ECRIT</h2>
        <div class="txt">${AUTEUR.slice(0, 2).map(p => `<p>${esc(p)}</p>`).join('')}<a class="btn ghost" href="#/a-propos">EN SAVOIR PLUS</a></div>
      </section></div>`;
    // la feuille où l'on écrit : le prénom s'y pose en colonne ; le prix et COMMANDER paraissent une fois écrit
    const input = $('#hp'), hint = $('#hh'), reveal = $('#hr');
    const f = mountFeuille($('#hs'), input, { invite: 'entre un prénom' });
    const df = mountDefile($('#stage'), POEMES.map(n => ({ src: url(`boutique/poeme-${n}-s.jpg`), alt: n })), { onOpen: i => { count('boutique/zoom'); ouvrirVisionneuse(poemeItems(), i); } });
    const shown = a => {
      const on = !a.vide;
      reveal.classList.toggle('on', on); reveal.setAttribute('aria-hidden', String(!on));
      df.gather(on);   // le premier prénom : les poèmes se regroupent sous la feuille ; effacé, ils repartent
      $$('button, a', reveal).forEach(x => { x.tabIndex = on ? 0 : -1; });
      if (on && !shown.once) { shown.once = true; count('boutique/prenom'); }
    };
    const b = brancherPrenom(input, hint, { onChange: shown });
    const known = sessionName(); if (known) { input.value = known; f.refresh(); b.maj(); df.gather(true, true); }
    // Entrée ne commande pas : elle ferme le clavier et montre le prix et COMMANDER (on voit l'objet, puis son prix, puis on choisit)
    input.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (analysePrenom(input.value).vide) return;
      input.blur();
      setTimeout(() => reveal.scrollIntoView({ block: 'center', behavior: REDUCED ? 'auto' : 'smooth' }), 120);
    });
    $('#hf').addEventListener('submit', e => {
      e.preventDefault();
      const a = analysePrenom(input.value);
      if (a.vide) { input.focus(); return; }
      commander(a.nom);
    });
    if (!TOUCH) setTimeout(() => input.focus({ preventScroll: true }), 300);   // (ordinateur : on écrit tout de suite ; téléphone : le clavier ne sort qu'au toucher)
    onLeave(() => { f.destroy(); df.destroy(); });
    $$('.ex button', app).forEach(bt => bt.addEventListener('click', () => { count('boutique/zoom'); ouvrirVisionneuse(poemeItems(), +bt.dataset.i); }));
    return { titre: 'ETERNEL — un prénom un poème', stat: 'accueil', id: null };
  },

  boutique() {
    app.innerHTML = `<div class="wrap page"><h1 class="h1 sew">LA BOUTIQUE</h1><div class="grid">${PRODUITS.map(carte).join('')}</div></div>`;
    return { titre: 'la boutique — ETERNEL', stat: 'boutique', id: null };
  },

  questions() {
    app.innerHTML = `<div class="wrap page"><h1 class="h1 sew">QUESTIONS</h1><div class="qlist">${FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a.replace('(menu en haut à droite, CONTACT)', '(page CONTACT)'))}</p></details>`).join('')}</div>
      <p class="qlist-c">une autre question ? <a href="#/contact">écris-moi</a>.</p></div>`;
    const ds = $$('.qlist details', app);
    for (const d of ds) d.addEventListener('toggle', () => { if (d.open) for (const o of ds) if (o !== d) o.open = false; });
    return { titre: 'questions — ETERNEL', stat: 'questions', id: null };
  },

  'a-propos'() {
    app.innerHTML = `<div class="wrap page"><h1 class="h1 sew">A PROPOS</h1><div class="txt">
      ${PORTRAIT ? `<img class="au-ph" src="${url(PORTRAIT)}" alt="Eternel">` : ''}
      ${AUTEUR.map(p => `<p>${esc(p)}</p>`).join('')}
      <p class="gap">singuliés, c’est le nom que je donne à tout ça : les poèmes, le jeu de cartes, le fil noir qui relie les singuliés.</p>
      <a class="btn" href="#/contact">ECRIS-MOI</a>
      <p class="gap"><a href="${INSTAGRAM}" target="_blank" rel="noopener" class="lk">@e.t.ernel ↗</a></p></div></div>`;
    return { titre: 'à propos — ETERNEL', stat: 'a-propos', id: null };
  },

  contact() {
    app.innerHTML = `<div class="wrap page"><h1 class="h1 sew">CONTACT<small>écrire un message sur la carte : je réponds.</small></h1><div class="ct-wrap" id="ct"></div></div>`;
    import('../menu/contact.js').then(m => { if (document.getElementById('ct')) m.mountContact($('#ct'), { base: './' }); });
    return { titre: 'contact — ETERNEL', stat: 'contact', id: null };
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
      <section class="sec" aria-labelledby="t-r"><h2 class="h2 sew" id="t-r">AUSSI</h2><div class="grid trois">${PRODUITS.filter(x => x.id !== p.id).map(carte).join('')}</div></section></div>
      <div class="buy" id="buy" aria-hidden="true"></div>`;
    let gal = null, feuille = null, input = null, perso = null, io = null;
    const info = $('#info'), buy = $('#buy');
    const media = p.media;

    const ctaHtml = () => {
      if (p.id === 'livres') return `<a class="btn full" id="cta" href="${esc(V().href)}" target="_blank" rel="noopener">${esc(p.cta)} ↗</a>`;
      return `<button class="btn full" id="cta" type="${p.id === 'poeme' ? 'submit' : 'button'}">${esc(p.cta)}</button>`;
    };
    const acc = () => `<div class="acc">
      <details${p.id === 'poeme' ? ' open' : ''}><summary>CE QUI EST DANS L’ENVELOPPE</summary><div class="in"><ul>${p.recoit.map(r => `<li>${esc(r)}</li>`).join('')}</ul></div></details>
      ${p.etapes.length ? `<details><summary>COMMENT CA SE PASSE</summary><div class="in"><ol>${p.etapes.map(([a, b]) => `<li><b>${esc(a)}</b> — ${esc(b)}</li>`).join('')}</ol></div></details>` : ''}
      <details><summary>LIVRAISON ET PAIEMENT</summary><div class="in"><p>${esc(p.livraison)}</p><p>${esc(p.paiement)}</p></div></details>
      ${p.id === 'poeme' ? '<details><summary>UNE QUESTION</summary><div class="in"><p>ce qu’on me demande le plus : <a class="lk" href="#/questions">QUESTIONS</a>.</p></div></details>' : ''}
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
          <input id="prenom" name="given-name" type="text" autocomplete="given-name" autocapitalize="characters" autocorrect="off" spellcheck="false" maxlength="40" enterkeyhint="go" inputmode="text" placeholder="le sien, ou celui de quelqu’un d’autre">
          <p class="hint" id="hint" role="status" aria-live="polite"></p>
          ${ctaHtml()}</form>
          <p class="micro">${esc(DELAI_COURT)} · si l’enveloppe se perd, je refais le poème · <a href="./conditions.html">conditions</a><br>${esc(p.paiement)}</p>`;
      } else if (p.id === 'jeu') {
        body = `${ctaHtml()}<div class="row2"><a class="btn ghost" href="${p.essai}">TIRER UNE CARTE</a></div><p class="micro">le jeu n’est pas encore en vente : un email suffit, je préviens quand il sort.</p>`;
      } else {
        body = `${ctaHtml()}<p class="micro">${esc(p.paiement)}</p>`;
      }
      info.innerHTML = head + body + acc();
      // (un livre = une image de la galerie : choisir le livre ou feuilleter la galerie, c'est la même chose)
      $$('.var', info).forEach(b => b.addEventListener('click', () => { const k = media.findIndex(m => m.variant === +b.dataset.v); if (k >= 0) gal ? gal.go(k) : (vi = +b.dataset.v); }));
      watchCta();
      wire();
    }

    function renderGal() {
      gal?.destroy();
      const start = vi >= 0 ? Math.max(0, media.findIndex(m => m.variant === vi)) : 0;
      gal = galerie($('#gal'), media, { start, onSlide: (i, m) => {
        if (m.variant != null && m.variant !== vi && vi >= 0) { vi = m.variant; history.replaceState(history.state, '', '#/produit/livres?v=' + V().id); document.title = `${titre().toLowerCase()} — ETERNEL`; renderInfo(); wireBuy(); }
      } });
      if (p.id === 'poeme' && gal.sheetHost && input) { feuille?.destroy(); feuille = mountFeuille(gal.sheetHost, input, { invite: 'entre un prénom' }); }
    }

    function wire() {
      const cta = $('#cta', info);
      if (p.id === 'poeme') {
        input = $('#prenom', info);
        const hint = $('#hint', info);
        const known = sessionName(); if (known && !input.value) input.value = known;
        perso = brancherPrenom(input, hint, { onChange: () => { if (gal && gal.sheetIndex >= 0 && gal.index !== gal.sheetIndex) gal.go(gal.sheetIndex); } });
        if (input.value) perso.maj();
        input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } });
        $('#perso', info).addEventListener('submit', e => {
          e.preventDefault();
          const a = analysePrenom(input.value);
          if (a.vide) { hint.className = 'hint'; hint.textContent = 'entrer d’abord un prénom : il se posera sur la feuille.'; input.focus(); gal?.go(gal.sheetIndex); return; }
          commander(a.nom);
        });
        onLeave(() => feuille?.destroy());
      } else if (p.id === 'mois') {
        cta.addEventListener('click', () => { count('boutique/rejoindre'); emailDialog({ titre: 'UN POEME PAR MOIS', texte: 'les premières lettres partent bientôt : un email suffit, j’écris quand la première est prête. rien n’est débité.', bouton: 'RESERVER MA PLACE', kind: 'club', fait: 'c’est noté.\nj’écris pour la première lettre.' }); });
      } else if (p.id === 'jeu') {
        cta.addEventListener('click', () => { count('boutique/jeu-prevenir'); emailDialog({ titre: 'LE JEU', texte: 'le jeu n’est pas encore en vente : un email suffit, je préviens quand il sort.', bouton: 'ME PREVENIR', kind: 'jeu', fait: 'c’est noté.\nj’écris quand le jeu sort.' }); });
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
    function watchCta() {
      if (!('IntersectionObserver' in window)) return;
      io?.disconnect();
      io = new IntersectionObserver(([en]) => { const on = !en.isIntersecting && en.boundingClientRect.top < 0; buy.classList.toggle('on', on); buy.setAttribute('aria-hidden', String(!on)); });
      const c = $('#cta', info); if (c) io.observe(c);
    }
    renderInfo(); renderGal(); wireBuy();
    onLeave(() => { io?.disconnect(); gal?.destroy(); });
    return { titre: `${titre().toLowerCase()} — ETERNEL`, stat: 'produit/' + id, id };
  },

  introuvable() {
    app.innerHTML = `<div class="wrap page"><h1 class="h1">INTROUVABLE</h1><div class="txt"><p>cette page n’existe pas.</p><a class="btn" href="#/">ACCUEIL</a></div></div>`;
    return { titre: 'introuvable — ETERNEL', stat: 'introuvable', id: null };
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
  entete.closeMenu();
  const [path, q = ''] = location.hash.replace(/^#\/?/, '').split('?');
  const qs = new URLSearchParams(q), parts = path.split('/').filter(Boolean);
  const key = '/' + parts.join('/');
  // la pile des vues (pour ←) : en avant on empile, en arrière on dépile
  if (curKey != null && curKey !== key) {
    if (pushed) stack.push(curKey);
    else if (stack.length && stack[stack.length - 1] === key) stack.pop();
    else stack.push(curKey);
  }
  let v;
  if (!parts.length) v = VIEWS.accueil();
  else if (parts[0] === 'produit' && parts[1]) v = VIEWS.produit(parts[1], qs);
  else if (VIEWS[parts[0]] && !['produit', 'introuvable', 'accueil'].includes(parts[0])) v = VIEWS[parts[0]]();
  else v = VIEWS.introuvable();
  document.title = v.titre;
  entete.set({ id: v.id, back: parts.length > 0 });
  app.classList.remove('in'); void app.offsetWidth; app.classList.add('in');
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
