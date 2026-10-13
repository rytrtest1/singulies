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
import '../app/pay.css';

// (12/10, Maxence) l'objet raconte chaque étape (env3d.js) ; plus de titre UN POEME PAR MOIS (le bandeau le dit déjà)
const STEPS = [
  'une lettre mensuelle\nexclusive aux membres',
  'un poème inédit au recto\nmes pensées de création au verso',
  'le tout dans une enveloppe\nscellée à la cire',
  'chaque mois une personne tirée au sort\nreçoit l’original',
].map(txt => ({ txt }));

// (12/10, Maxence : « la cohérence du paiement entre toutes les pages ») REJOINDRE ouvre le même panneau que RECEVOIR
// (src/app/pay.css) : il monte du bandeau, l'objet remonte au-dessus et reste visible ; en attendant l'abonnement, on y
// laisse son email (liste d'attente), RESERVER, rien n'est débité.
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PRICE = '9 €', PER = 'par mois';

// host : l'élément où poser la page ; rend la page (page.js : { main, obj(), rest(), center() … })
export function buildLettre(host, base = './') {
  const pg = buildStagePage(host, {
    base, steps: STEPS, fallback: () => 'simple/enveloppe-dos.jpg', aspectLabel: 'Une feuille, un poème tapé à la machine, glissée dans une enveloppe noire fermée par un cachet de cire argenté.',
    sign: { label: 'REJOINDRE' }, price: () => `<b>${PRICE}</b> ${PER}`,
    make: gl => import('./env3d.js').then(m => m.createEnvelope(gl, base)),
  });
  const { main, sign, grab } = pg;
  const bar = main.querySelector('.lt-bar'), done = main.querySelector('.lt-done');
  let panel = null, sent = false;
  // l'objet remonte au-dessus du panneau (comme la feuille du poème : liftSheet), entier
  const lift = on => {
    const cv = host.querySelector('.lt-cv');
    main.classList.toggle('paying', on);
    if (!cv) return;
    cv.style.transition = 'transform .6s cubic-bezier(.2,.7,.3,1), opacity .6s ease';
    cv.style.transformOrigin = '50% 0';
    if (!on || !panel) { cv.style.transform = ''; return; }
    const r = grab.getBoundingClientRect(), room = innerHeight - panel.root.getBoundingClientRect().height - 16, top = 52;
    if (!r.height) return;
    const k = Math.min(1, (room - top) / r.height), ty = top - r.top * k;
    cv.style.transform = `translateY(${ty.toFixed(1)}px) scale(${k.toFixed(3)})`;
  };
  const close = () => { if (!panel) return; panel.root.classList.remove('on'); panel.veil.classList.remove('on'); panel.mail.blur(); lift(false); };
  function open() {
    if (!panel) {
      const veil = document.createElement('div'); veil.className = 'of-pay-veil';
      const root = document.createElement('form'); root.className = 'of-pay'; root.noValidate = true; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Rejoindre');
      root.innerHTML = `<button class="of-pay-x" type="button" aria-label="Fermer">×</button>
        <div class="of-pay-body">
          <div class="of-pay-title"><span class="of-pay-sub">un poème par mois</span><span class="of-pay-p">${esc(PRICE)} ${esc(PER)}</span></div>
          <label class="of-pf"><span>ton email</span>
            <input class="of-pin" type="email" name="email" autocomplete="email" inputmode="email" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="send"></label>
          <input class="lt-trap" name="site" tabindex="-1" autocomplete="off" aria-hidden="true">
          <button class="of-go of-pay-go" type="submit" disabled>RESERVER MA PLACE</button>
          <p class="of-pay-legal">les premières lettres partent bientôt :<br>je t’écris quand la première est prête.<br>rien n’est débité.</p>
        </div>`;
      document.body.append(veil, root);
      const mail = root.querySelector('.of-pin'), go = root.querySelector('.of-pay-go'), trap = root.querySelector('.lt-trap');
      const known = knownEmail(); if (known) mail.value = known;
      const ok = () => EMAIL_RE.test(mail.value.trim());
      const upd = () => { go.disabled = !ok(); };
      mail.addEventListener('input', upd); upd();
      mail.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
      veil.addEventListener('click', close);
      root.querySelector('.of-pay-x').addEventListener('click', close);
      addEventListener('resize', () => { if (root.classList.contains('on')) lift(true); });
      root.addEventListener('submit', e => {
        e.preventDefault();
        if (sent || !ok()) return;
        sent = true;
        if (!trap.value) sendNote({ kind: 'club', email: mail.value.trim() });
        count('lettre/reservee');
        close();
        bar.classList.add('sent'); main.classList.add('done');
        // « c'est noté. » tapé à la machine, à la place du texte
        const msg = 'c’est noté.\nje t’écris pour la première lettre.';
        const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
        let i = 0;
        const strike = () => { if (i <= msg.length) { done.textContent = msg.slice(0, i++); setTimeout(strike, reduced ? 0 : 55 + Math.random() * 90); } };
        setTimeout(strike, 500);
      });
      panel = { root, veil, mail };
    }
    void panel.root.offsetWidth;
    requestAnimationFrame(() => { panel.root.classList.add('on'); panel.veil.classList.add('on'); requestAnimationFrame(() => lift(true)); });
    if (!panel.mail.value) setTimeout(() => panel.mail.focus({ preventScroll: true }), 450);
  }
  sign.addEventListener('click', () => { if (sent) return; count('lettre/rejoindre'); open(); });
  // (quittée par le bandeau des pages : le panneau se range)
  pg.close = close;
  return pg;
}
