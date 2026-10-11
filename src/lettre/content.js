// « un poème par mois » (11/10) : le contenu de la page, monté soit seul (lettre.html), soit dans la page du poème
// (src/nav/pages.js : on y glisse depuis le bandeau, sans rechargement). En attendant le SIRET (et donc l'abonnement
// Stripe), une liste d'attente : l'email part chez Maxence (sendNote, modèle des demandes), rien n'est débité.
// L'email déjà connu (donné ailleurs sur le site) est déjà écrit.
import { sendNote } from '../app/send.js';
import { knownEmail, EMAIL_RE } from '../app/storage.js';
import { count } from '../app/count.js';

const HTML = `<main class="lt">
  <img class="lt-env" src="BASEsimple/enveloppe-dos.jpg" alt="Une enveloppe noire fermée par un cachet de cire argenté." width="1000" height="760">
  <h1 class="lt-h">un poème par mois</h1>
  <p class="lt-sub">la correspondance des singuliers</p>
  <div class="lt-txt">
    <p>chaque mois, j’écris un poème pour les singuliers.</p>
    <p>je le tape une fois à la machine, il est imprimé, et je le glisse à la main dans une enveloppe noire, avec une lettre : comment il est né, à quoi je pensais, ce que j’ai rayé.</p>
    <p>chaque mois, l’original tapé part chez l’un de vous, tiré au sort.</p>
    <p class="lt-price">9 € par mois, par la poste.<br>tu arrêtes quand tu veux.</p>
    <p>pour toi, ou pour quelqu’un.</p>
  </div>
  <form class="lt-wait" novalidate autocomplete="on">
    <p>les premières lettres partent bientôt.<br>laisse ton email : je t’écris quand la première est prête.</p>
    <input class="lt-mail" type="email" name="email" autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false" enterkeyhint="send" placeholder="ton email" aria-label="ton email">
    <input class="lt-trap" name="site" tabindex="-1" autocomplete="off" aria-hidden="true">
    <button class="lt-go" type="submit">RESERVER MA PLACE</button>
    <p class="lt-note">rien n’est débité. je t’écris, c’est tout.</p>
  </form>
  <p class="lt-done" role="status" aria-live="polite"></p>
</main>`;

// host : l'élément où poser la page ; rend { main }
export function buildLettre(host, base = './') {
  host.innerHTML = HTML.replace(/BASE/g, base);
  const main = host.querySelector('.lt');
  const form = main.querySelector('.lt-wait'), mail = form.querySelector('.lt-mail'), trap = form.querySelector('.lt-trap');
  const go = form.querySelector('.lt-go'), done = main.querySelector('.lt-done');
  const known = knownEmail();
  if (known) mail.value = known;
  const check = () => go.classList.toggle('on', EMAIL_RE.test(mail.value.trim()));
  mail.addEventListener('input', check); check();
  let sent = false;
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (sent || !go.classList.contains('on')) return;
    sent = true;
    if (!trap.value) sendNote({ kind: 'club', email: mail.value.trim() });
    count('lettre/reservee');
    mail.blur();
    form.classList.add('sent');
    // « c'est noté. » tapé à la machine
    const msg = 'c’est noté.\nje t’écris pour la première lettre.';
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let i = 0;
    const strike = () => { if (i <= msg.length) { done.textContent = msg.slice(0, i++); setTimeout(strike, reduced ? 0 : 55 + Math.random() * 90); } };
    strike();
  });
  return { main };
}
