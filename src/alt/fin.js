// Les écrans de texte de la version alternative (10/10) : ce qui flotte au-dessus des objets (Garamond), sur le noir —
// partagés par alt.html (payé dans la page), merci.html (retour de Stripe) et pour.html (la personne offerte).
import './offre.css';
import { knownEmail } from '../app/storage.js';

export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const K_ORDER = 'singulies.order';
export function readOrder() { try { return JSON.parse(localStorage.getItem(K_ORDER) || 'null'); } catch { return null; } }
export function saveOrder(o) { try { localStorage.setItem(K_ORDER, JSON.stringify(o)); } catch { /* */ } }

// over : posé sur la scène (fond transparent, voile léger) ; sinon sur le noir
export function screen(html, { over = false } = {}) {
  const d = document.createElement('div'); d.className = 'mc' + (over ? ' over' : ''); d.innerHTML = html;
  document.body.appendChild(d);
  void d.offsetWidth; setTimeout(() => d.classList.add('on'), 20);   // (pas de requestAnimationFrame : suspendu si la page est en arrière-plan)
  return d;
}
export const leave = d => { d.classList.remove('on'); setTimeout(() => d.remove(), 1000); };

// le prénom tel qu'on l'écrit dans une phrase : Léa → LEA dans le poème, mais « Lea » ici (capitale initiale)
const said = n => String(n).toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase());

// (12/10, Maxence) une ligne tapée à la machine dans el (rend une promesse : la frappe finie)
export function typeInto(el, text, { at = 300, step = 58 } = {}) {
  el.setAttribute('aria-label', text);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) { el.textContent = text; return Promise.resolve(); }
  // les lettres à venir sont déjà là, invisibles : rien ne bouge pendant la frappe
  el.innerHTML = '<span class="tw">' + [...text].map(ch => `<b>${esc(ch)}</b>`).join('') + '</span>';
  const ks = [...el.querySelectorAll('b')];
  return new Promise(res => {
    let n = 0;
    const strike = () => { if (!el.isConnected || n >= ks.length) { res(); return; } ks[n++].classList.add('on'); setTimeout(strike, (ks[n - 1].textContent === ' ' ? 80 : step * 0.6) + Math.random() * step * 0.8); };
    setTimeout(strike, at);
  });
}
// la fin (12/10, Maxence) : le prénom ; la référence ; MERCI ; « je te tiens au courant » tapé. Au milieu, le paquet du
// jeu (SINGULIES / le jeu, en direct : src/jeu/deck3d.js), le signe partager juste dessous, « pose une question à
// quelqu'un » ; le toucher : la carte se retourne et devient l'écran du jeu (la même carte, aucun changement de page :
// mountJeu en relais, comme du portail) — on y glisse, on change de question, on la partage ; son retour ramène ici.
// RETOUR, en bas, à la place des signes d'action (RECEVOIR). (rechargée : la même, pas une seconde demande)
export function finalScreen(order, home) {
  const n = esc(order.name);
  const d = screen(`<h1 class="mc-name">${n}</h1>
    ${order.ref ? `<div class="ref">réf. ${esc(order.ref)}</div>` : ''}
    <p class="mc-merci">merci</p>
    <p class="mc-line mc-type"></p>
    <button class="mc-sign mc-home" type="button" aria-label="Accueil">ACCUEIL</button>
    <div class="mc-jeu">
      <div class="mc-deck" role="button" tabindex="0" aria-label="Tirer une carte du jeu SINGULIES"></div>
      <div class="mc-jeu-row"><button class="mc-share" type="button" aria-label="Poser une question du jeu à quelqu’un"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M6 11H5v10h14V11h-1" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <span class="mc-jeu-t">pose une question à quelqu’un</span></div>
    </div>`);   // (17/10 : plus de RETOUR en bas — la flèche du haut, ETERNEL et le bandeau sont là)
  d.classList.add('fin');
  // (17/10, Maxence : « juste prénom, réf, MERCI et récapitulatif envoyé par email, avec le jeu en dessous ») rien d'autre
  typeInto(d.querySelector('.mc-type'), 'le récapitulatif t’est envoyé par email.', { at: 900, step: 46 }).then(() => setTimeout(() => d.querySelector('.mc-home')?.classList.add('on'), 500));
  // (17/10, Maxence : « à la fin de la commande, au récap, un bouton ACCUEIL est logique » — en haut à gauche, c'est toujours une flèche)
  d.querySelector('.mc-home').addEventListener('click', () => { location.href = new URL('./', document.baseURI).href; });
  const sign = d.querySelector('.mc-sign');
  if (sign) import('./stitch.js').then(m => m.stitch(sign, { seed: 'RETOUR'.length * 13 })).catch(() => {});
  // le paquet en direct (sans WebGL2 : le signe et le lien suffisent)
  const deckBox = d.querySelector('.mc-deck');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const base = new URL('./', document.baseURI).href;
  const jeuUrl = id => { const u = new URL('./jeu.html', document.baseURI), k = new URLSearchParams(); if (id != null) k.set('q', id); u.search = k.toString(); return u.href; };
  let deck = null, game = null, inGame = false;
  const toJeu = id => { location.href = jeuUrl(id); };
  // (17/10, Maxence : « quand la carte se retourne ») le paquet en direct ; au toucher, la page du jeu — préparée d'avance par-dessus,
  // en relais (game.js) — prend la carte du dessus là où elle est et la retourne sur une question, qui vient au centre : aucune coupure.
  // Le retour (←) la repose sur le paquet. Sans relais (WebGL2 absent) : la page du jeu.
  import('../jeu/deck3d.js').then(m => m.mountDeck(deckBox, { base, reduced, onDraw: id => { if (!game) toJeu(id); } })).then(r => {
    deck = r; if (!r) { deckBox.classList.add('flat'); return; }
    setTimeout(() => { if (d.isConnected) import('../jeu/game.js').then(m => m.mountGame({ base, reduced, relay: true, deck: () => deck,
      onReturned: () => { inGame = false; d.classList.add('back'); d.classList.remove('away'); } })).then(g => { if (g && d.isConnected) game = g; else g?.root.remove(); }).catch(e => console.warn('jeu (relais)', e)); }, 1800);
  }).catch(() => deckBox.classList.add('flat'));
  const open = () => {
    if (inGame) return;
    if (deck && game) { inGame = true; d.classList.add('away'); game.takeOver(); return; }
    if (deck) deck.pull(); else toJeu(null);
  };
  d.querySelector('.mc-share').addEventListener('click', open);
  deckBox.addEventListener('click', open);
  deckBox.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  return d;
}

// (16/10, Maxence) dès RECEVOIR (réservation) : pour moi, ou pour offrir ? → true si offert, null si l'on revient
export function askFor() {
  return new Promise(res => {
    const d = screen(`<p class="mc-k">ce poème,<br>c’est pour toi ?</p>
      <div class="mc-how">
        <button type="button" data-for="moi">pour moi</button>
        <button type="button" data-for="offrir">pour offrir</button>
      </div>
      <p class="small"><a href="#" data-x>revenir</a></p>`, { over: true });
    const end = v => { removeEventListener('keydown', esc_); leave(d); res(v); };
    const esc_ = e => { if (e.key === 'Escape') end(null); };
    addEventListener('keydown', esc_);
    d.querySelectorAll('[data-for]').forEach(b => b.addEventListener('click', () => end(b.dataset.for === 'offrir'), { once: true }));
    d.querySelector('[data-x]').addEventListener('click', e => { e.preventDefault(); end(null); });
  });
}

// un poème offert, une fois payé : comment je l'écris ? → 'question' | 'lien' | 'blanche' | 'impro'
export function askHow(name) {
  return new Promise(res => {
    const s = esc(said(name));
    const d = screen(`<p class="mc-k">un poème pour ${s}.<br>comment je l’écris ?</p>
      <div class="mc-how">
        <button type="button" data-how="question">tu réponds à une question, pour ${s}</button>
        <button type="button" data-how="lien">${s} y répond : tu lui envoies le lien</button>
        <button type="button" data-how="blanche">tu choisis le thème</button>
        <button type="button" data-how="impro">j’improvise sur son prénom</button>
      </div>`, { over: true });
    d.querySelectorAll('[data-how]').forEach(b => b.addEventListener('click', () => { leave(d); res(b.dataset.how); }, { once: true }));
  });
}

// le lien pour la personne offerte : elle tire sa carte, elle répond (pour.html)
export function giftLink(ref) {
  const u = new URL('./pour.html', document.baseURI), k = new URLSearchParams(location.search);
  for (const x of ['session', 'simule', 'paiement', 'q']) k.delete(x);
  k.set('r', ref); u.search = k.toString();
  return u.href;
}
export function shareGift(order) {
  return new Promise(res => {
    const s = esc(said(order.name)), url = giftLink(order.ref);
    const d = screen(`<h1>${esc(order.name)}</h1>
      <p>envoie-lui ce lien. ${s} tire une carte, y répond, et je tape son poème.</p>
      <p class="small mc-url">${esc(url)}</p>
      <button class="go" type="button" data-share>PARTAGER</button>
      <p class="small"><a href="#" data-done>c’est envoyé</a></p>`);
    const msg = `${said(order.name)}, quelqu’un t’offre un poème. tire ta carte : ${url}`;
    d.querySelector('[data-share]').addEventListener('click', async () => {
      try { if (navigator.share) { await navigator.share({ text: msg }); return; } } catch { return; }
      try { await navigator.clipboard.writeText(msg); d.querySelector('[data-share]').textContent = 'COPIE'; } catch { /* */ }
    });
    d.querySelector('[data-done]').addEventListener('click', e => { e.preventDefault(); leave(d); res(); });
  });
}
