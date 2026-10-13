// Les écrans de texte de la version alternative (10/10) : ce qui flotte au-dessus des objets (Garamond), sur le noir —
// partagés par alt.html (payé dans la page), merci.html (retour de Stripe) et pour.html (la personne offerte).
import './offre.css';

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
// (12/10, Maxence) payé : un écran noir, le prénom, « à toi de jouer maintenant » tapé — puis le jeu (rend le temps qu'il
// tient, ms)
export function playScreen(name, line = 'à toi de jouer maintenant') {
  const d = screen(`<h1 class="mc-name">${esc(name)}</h1><p class="mc-line mc-type"></p>`);
  d.classList.add('fin', 'play');
  const done = typeInto(d.querySelector('.mc-type'), line, { at: 900 });
  return { el: d, done };
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
    ${order.reserve ? '<p class="small">rien n’a été débité.</p>' : ''}
    <div class="mc-jeu">
      <div class="mc-deck" role="button" tabindex="0" aria-label="Tirer une carte du jeu SINGULIES"></div>
      <button class="mc-share" type="button" aria-label="Poser une question du jeu à quelqu’un"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M6 11H5v10h14V11h-1" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <span class="mc-jeu-t">pose une question à quelqu’un</span>
    </div>
    ${home ? `<a class="mc-sign mc-retour" href="${esc(home)}">RETOUR</a>` : ''}`);
  d.classList.add('fin');
  typeInto(d.querySelector('.mc-type'), 'je te tiens au courant', { at: 900 });
  // le paquet en direct (sans WebGL2 : le signe et le lien suffisent)
  const deckBox = d.querySelector('.mc-deck');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const base = new URL('./', document.baseURI).href;
  const jeuUrl = id => { const u = new URL('./jeu', document.baseURI), k = new URLSearchParams(); if (id != null) k.set('q', id); u.search = k.toString(); return u.href; };
  let deck = null, jeu = null, inJeu = false;
  const toJeu = id => { location.href = jeuUrl(id); };
  // la page du jeu, préparée d'avance par-dessus (transparente) : au toucher, elle prend le paquet là où il est
  const prep = () => import('../jeu/jeu.js').then(m => m.mountJeu({ base, reduced, relay: true, portal: () => deck,
    onBack: () => { inJeu = false; d.classList.remove('away'); },
    onReturned: () => deck?.takeDeck() })).then(j => { jeu = j; }).catch(e => console.warn('jeu', e));
  import('../jeu/deck3d.js').then(m => m.mountDeck(deckBox, { base, reduced, onDraw: toJeu })).then(r => { deck = r; if (!r) { deckBox.classList.add('flat'); return; } setTimeout(prep, 1800); }).catch(() => deckBox.classList.add('flat'));
  const open = () => {
    if (inJeu) return;
    if (deck && jeu) { inJeu = true; d.classList.add('away'); jeu.takeOver(); return; }
    if (deck) deck.pull(); else toJeu(null);
  };
  d.querySelector('.mc-share').addEventListener('click', open);
  deckBox.addEventListener('click', open);
  deckBox.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  return d;
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
