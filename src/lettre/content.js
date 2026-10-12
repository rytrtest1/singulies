// « un poème par mois » (11/10) : le contenu de la page, monté soit seul (lettre.html), soit dans la page du poème
// (src/nav/pages.js : on y glisse depuis le bandeau, sans rechargement). En attendant le SIRET (et donc l'abonnement
// Stripe), une liste d'attente : l'email part chez Maxence (sendNote, modèle des demandes), rien n'est débité.
// L'email déjà connu (donné ailleurs sur le site) est déjà écrit.
// (12/10, Maxence) la même grammaire que la page du poème (page.js) : l'enveloppe A5 en direct, dans le monde commun ;
// dessous, le texte tapé à la machine, une étape à la fois (points), jamais sous REJOINDRE.
import { sendNote } from '../app/send.js';
import { knownEmail, EMAIL_RE } from '../app/storage.js';
import { count } from '../app/count.js';
import { buildStagePage } from './page.js';

const STEPS = [
  'reçois un poème\nexclusif aux membres',
  'je l’écris une fois à la machine\nl’imprime et le glisse à la main\ndans une enveloppe noire',
  'avec une lettre au dos contenant\nmes pensées liées au poème\npendant sa création',
  'une personne tirée au sort\nrecevra l’original',
].map(txt => ({ txt }));

const FORM = `<form class="lt-wait" novalidate autocomplete="on" hidden>
    <input class="lt-mail" type="email" name="email" autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false" enterkeyhint="send" placeholder="ton email" aria-label="ton email">
    <input class="lt-trap" name="site" tabindex="-1" autocomplete="off" aria-hidden="true">
    <p class="lt-note">les premières lettres partent bientôt. je t’écris quand la première est prête. rien n’est débité.</p>
  </form>`;

// host : l'élément où poser la page ; rend la page (page.js : { main, obj(), rest(), center() … })
export function buildLettre(host, base = './') {
  const pg = buildStagePage(host, {
    base, steps: STEPS, fallback: () => 'simple/enveloppe-dos.jpg', extra: FORM, aspectLabel: 'Une enveloppe noire fermée par un cachet de cire argenté.',
    sign: { label: 'REJOINDRE' }, price: () => '<b>9 €</b> par mois',
    make: gl => import('./env3d.js').then(m => m.createEnvelope(gl, base)),
  });
  const { main, sign } = pg;
  const form = main.querySelector('.lt-wait'), mail = form.querySelector('.lt-mail'), trap = form.querySelector('.lt-trap');
  const bar = main.querySelector('.lt-bar'), done = main.querySelector('.lt-done');
  const known = knownEmail();
  if (known) mail.value = known;
  const ok = () => EMAIL_RE.test(mail.value.trim());
  let sent = false;
  // REJOINDRE : la liste d'attente prend la place du texte (en attendant l'abonnement), puis, l'email écrit, l'envoie
  sign.addEventListener('click', () => {
    if (sent) return;
    if (form.hidden) {
      count('lettre/rejoindre');
      form.hidden = false; main.classList.add('waiting');
      requestAnimationFrame(() => mail.focus({ preventScroll: true }));
      return;
    }
    if (ok()) form.requestSubmit(); else mail.focus();
  });
  mail.addEventListener('keydown', e => {
    if (e.key === 'Escape') { form.hidden = true; main.classList.remove('waiting'); mail.blur(); return; }
    if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); if (ok()) form.requestSubmit(); }
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (sent || !ok()) return;
    sent = true;
    if (!trap.value) sendNote({ kind: 'club', email: mail.value.trim() });
    count('lettre/reservee');
    mail.blur();
    form.classList.add('sent'); bar.classList.add('sent'); main.classList.add('done');
    // « c'est noté. » tapé à la machine, à la place du texte
    const msg = 'c’est noté.\nje t’écris pour la première lettre.';
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let i = 0;
    const strike = () => { if (i <= msg.length) { done.textContent = msg.slice(0, i++); setTimeout(strike, reduced ? 0 : 55 + Math.random() * 90); } };
    strike();
  });
  return pg;
}
