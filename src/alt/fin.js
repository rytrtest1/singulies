// Les écrans de texte de la version alternative (10/10) : ce qui flotte au-dessus des objets (Garamond), sur le noir —
// partagés par alt.html (payé dans la page), merci.html (retour de Stripe) et pour.html (la personne offerte).
import './offre.css';
import { ENVOI } from './config.js';

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

// la fin : c'est noté (rechargée : la même, pas une seconde demande)
export function finalScreen(order, home) {
  const n = esc(order.name), s = esc(said(order.name));
  const line = order.lien ? `c’est noté. dès que ${s} aura répondu, je tape son poème et je le poste.`
    : order.pour ? `merci. je tape ton poème le ${esc(ENVOI)}, et il arrive chez toi par la poste.`
    : order.gift ? `c’est noté. je tape le poème de ${s} le ${esc(ENVOI)}, et je le poste.`
    : `c’est noté. je tape ton poème le ${esc(ENVOI)}, et je le poste chez toi.`;
  return screen(`<h1>${n}</h1><p>${line}</p>
    ${order.pour ? '' : '<p class="small">stripe t’a envoyé le reçu par email.</p>'}
    ${order.ref ? `<div class="ref">réf. ${esc(order.ref)}</div>` : ''}
    <p class="small" style="margin-top:26px"><a href="${esc(new URL('./jeu', document.baseURI).href)}">pose une de mes questions à quelqu’un</a></p>
    ${home ? `<p class="small" style="margin-top:6px"><a href="${esc(home)}">retour</a></p>` : ''}`);
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
      try { await navigator.clipboard.writeText(msg); d.querySelector('[data-share]').textContent = 'COPIÉ'; } catch { /* */ }
    });
    d.querySelector('[data-done]').addEventListener('click', e => { e.preventDefault(); leave(d); res(); });
  });
}
