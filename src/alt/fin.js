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

// la fin (12/10, Maxence) : le prénom, à sa taille de toujours ; « merci » ; ce que je fais maintenant ; la référence ;
// ACCUEIL. En bas, le paquet du jeu (SINGULIES / le jeu, en direct : src/jeu/deck3d.js) invite à tirer une carte —
// « pose une question à quelqu'un », un signe partager : la carte tirée, l'écran du jeu avec cette question.
// (rechargée : la même, pas une seconde demande)
export function finalScreen(order, home) {
  const n = esc(order.name), s = esc(said(order.name));
  const line = order.lien ? `dès que ${s} aura répondu, je lis ses mots, écris son poème<br>et l’envoie par la poste.`
    : order.reserve ? `je t’écris pour le paiement, puis je lis tes mots, écris ton poème<br>et l’envoie par la poste.`
    : order.gift ? `je lis tes mots, écris son poème<br>et l’envoie par la poste.`
    : `je lis tes mots, écris ton poème<br>et l’envoie par la poste.`;
  const jeuUrl = id => { const u = new URL('./jeu', document.baseURI), k = new URLSearchParams(); if (id != null) k.set('q', id); u.search = k.toString(); return u.href; };
  const d = screen(`<h1 class="mc-name">${n}</h1>
    <p class="mc-merci">merci</p>
    <p class="mc-line">${line}</p>
    ${order.reserve ? '<p class="small">rien n’a été débité.</p>' : ''}
    ${order.ref ? `<div class="ref">réf. ${esc(order.ref)}</div>` : ''}
    ${home ? `<a class="mc-sign" href="${esc(home)}">ACCUEIL</a>` : ''}
    <div class="mc-jeu">
      <div class="mc-deck" role="button" tabindex="0" aria-label="Tirer une carte du jeu SINGULIES"></div>
      <div class="mc-jeu-row"><span class="mc-jeu-t">pose une question à quelqu’un</span>
        <button class="mc-share" type="button" aria-label="Partager une question du jeu"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M6 11H5v10h14V11h-1" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>
    </div>`);
  d.classList.add('fin');
  const sign = d.querySelector('.mc-sign');
  if (sign) import('./stitch.js').then(m => m.stitch(sign, { seed: 'ACCUEIL'.length * 13 })).catch(() => {});
  // le paquet en direct (sans WebGL2 : le signe et le lien suffisent)
  const deckBox = d.querySelector('.mc-deck');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let deck = null;
  const toJeu = id => { location.href = jeuUrl(id); };
  import('../jeu/deck3d.js').then(m => m.mountDeck(deckBox, { base: new URL('./', document.baseURI).href, reduced, onDraw: toJeu })).then(r => { deck = r; if (!r) deckBox.classList.add('flat'); }).catch(() => deckBox.classList.add('flat'));
  // partager : la carte se tire, puis l'écran du jeu (où PARTAGER envoie la question)
  d.querySelector('.mc-share').addEventListener('click', () => { if (deck) deck.pull(); else toJeu(null); });
  deckBox.addEventListener('click', () => { if (!deck) toJeu(null); });
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
