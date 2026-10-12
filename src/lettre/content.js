// « un poème par mois » (11/10) : le contenu de la page, monté soit seul (lettre.html), soit dans la page du poème
// (src/nav/pages.js : on y glisse depuis le bandeau, sans rechargement). En attendant le SIRET (et donc l'abonnement
// Stripe), une liste d'attente : l'email part chez Maxence (sendNote, modèle des demandes), rien n'est débité.
// L'email déjà connu (donné ailleurs sur le site) est déjà écrit.
import { sendNote } from '../app/send.js';
import { knownEmail, EMAIL_RE } from '../app/storage.js';
import { count } from '../app/count.js';
import { stitch } from '../alt/stitch.js';

const HTML = `<main class="lt">
  <div class="lt-env lt-live"><img src="BASEsimple/enveloppe-dos.jpg" alt="Une enveloppe noire fermée par un cachet de cire argenté." width="1000" height="760"></div>
  <h1 class="lt-h caps">UN POEME PAR MOIS</h1>
  <p class="lt-sub">correspondance entre singuliés</p>
  <div class="lt-txt">
    <p>chaque mois, j’écris un poème pour les singuliers.</p>
    <p>je le tape une fois à la machine, il est imprimé, et je le glisse à la main dans une enveloppe noire, avec une lettre : comment il est né, à quoi je pensais, ce que j’ai rayé.</p>
    <p>chaque mois, l’original tapé part chez l’un de vous, tiré au sort.</p>
    <p>par la poste. tu arrêtes quand tu veux.</p>
    <p>pour toi, ou pour quelqu’un.</p>
  </div>
  <form class="lt-wait" novalidate autocomplete="on" hidden>
    <p>les premières lettres partent bientôt.<br>laisse ton email : je t’écris quand la première est prête.</p>
    <input class="lt-mail" type="email" name="email" autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false" enterkeyhint="send" placeholder="ton email" aria-label="ton email">
    <input class="lt-trap" name="site" tabindex="-1" autocomplete="off" aria-hidden="true">
    <p class="lt-note">rien n’est débité. je t’écris, c’est tout.</p>
  </form>
  <p class="lt-done" role="status" aria-live="polite"></p>
  <div class="lt-bar"><button class="lt-sign" type="button">REJOINDRE</button><div class="lt-pr"><b>9 €</b> par mois</div></div>
</main>`;

// host : l'élément où poser la page ; rend { main }
export function buildLettre(host, base = './') {
  host.innerHTML = HTML.replace(/BASE/g, base);
  const main = host.querySelector('.lt');
  const form = main.querySelector('.lt-wait'), mail = form.querySelector('.lt-mail'), trap = form.querySelector('.lt-trap');
  const go = main.querySelector('.lt-sign'), bar = main.querySelector('.lt-bar'), done = main.querySelector('.lt-done');
  const known = knownEmail();
  if (known) mail.value = known;
  const ok = () => EMAIL_RE.test(mail.value.trim());
  // (12/10, Maxence) la même grammaire que RECEVOIR : REJOINDRE, cousu, le prix dessous ; le toucher ouvre la liste
  // d'attente (en attendant l'abonnement), puis, l'email écrit, l'envoie
  stitch(go, { seed: 'REJOINDRE'.length * 13 });
  const live = mountLiveEnv(main.querySelector('.lt-live'), base);
  void live;
  let sent = false;
  go.addEventListener('click', () => {
    if (sent) return;
    if (form.hidden) {
      count('lettre/rejoindre');
      form.hidden = false;
      requestAnimationFrame(() => { form.scrollIntoView({ behavior: 'smooth', block: 'center' }); mail.focus({ preventScroll: true }); });
      return;
    }
    if (ok()) form.requestSubmit(); else mail.focus();
  });
  mail.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); if (ok()) form.requestSubmit(); } });
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (sent || !ok()) return;
    sent = true;
    if (!trap.value) sendNote({ kind: 'club', email: mail.value.trim() });
    count('lettre/reservee');
    mail.blur();
    form.classList.add('sent'); bar.classList.add('sent');
    // « c'est noté. » tapé à la machine
    const msg = 'c’est noté.\nje t’écris pour la première lettre.';
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let i = 0;
    const strike = () => { if (i <= msg.length) { done.textContent = msg.slice(0, i++); setTimeout(strike, reduced ? 0 : 55 + Math.random() * 90); } };
    strike();
  });
  return { main };
}

// l'enveloppe en direct (env3d.js) ; sans WebGL2, son image
function mountLiveEnv(box, base) {
  if (!box) return null;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  return import('./env3d.js').then(m => m.mountEnvelope(box, base, { reduced })).then(r => { if (!r) box.classList.add('flat'); return r; }).catch(() => { box.classList.add('flat'); return null; });
}
