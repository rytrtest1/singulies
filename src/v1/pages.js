// Les pages à part, V1 : de vraies pages, classiques (décision 10). À propos, Questions, Contact ; et — seulement une fois
// la commande faite — un poème par mois, mes livres, le jeu.
import { AUTEUR } from '../menu/auteur.js';
import { QUESTIONS as FAQ } from '../alt/questions.js';
import { PORTRAIT } from '../alt/config.js';
import { sendNote } from '../app/send.js';
import { EMAIL_RE, knownEmail } from '../app/storage.js';
import { inscrireAttente } from '../core/attente.js';
import { count } from '../core/stats.js';
import { etat, maj, questions } from './etat.js';
import { esc } from './vues.js';

const IG = 'https://www.instagram.com/e.t.ernel/';
const IG_LIEN = `<a href="${IG}" target="_blank" rel="noopener" aria-label="Instagram @e.t.ernel (s’ouvre dans un nouvel onglet)">@e.t.ernel ↗</a>`;

export function creerPages({ main, annonce }) {
  const $ = (s, r = main) => r.querySelector(s);
  const url = p => new URL(p, document.baseURI).href;

  function aPropos() {
    main.className = '';
    main.innerHTML = `<h1 id="titre" tabindex="-1">à propos</h1>
      <div class="qui">${PORTRAIT ? `<img src="${esc(url(PORTRAIT))}" alt="Portrait d’Eternel" width="120" height="150">` : ''}
        <div>${AUTEUR.map(p => `<p>${esc(p)}</p>`).join('')}
        <p>retrouve mes poèmes de rue sur Instagram : ${IG_LIEN}</p></div></div>
      <p class="actions"><a class="bouton" href="#/apercu">écrire un prénom</a><a class="bouton second" href="#/contact">me contacter</a></p>`;
  }

  function questionsPage() {
    main.className = '';
    main.innerHTML = `<h1 id="titre" tabindex="-1">questions</h1>
      <p class="doux">ce qu’on se demande avant de commander.</p>
      ${FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a.replace('(menu en haut à droite, CONTACT)', '(page contact)'))}</p></details>`).join('')}
      <p style="margin-top:22px">une autre question ? <a href="#/contact">écris-moi</a>. les <a href="./conditions.html" target="_blank" rel="noopener">conditions de vente ↗</a>.</p>`;
    for (const d of main.querySelectorAll('details')) d.addEventListener('toggle', () => { if (d.open) { count('aide/' + String(FAQ.findIndex(([q]) => q === d.querySelector('summary').textContent)).slice(0, 3)); for (const x of main.querySelectorAll('details')) if (x !== d) x.open = false; } });
  }

  function contact() {
    const E = etat();
    main.className = '';
    main.innerHTML = `<h1 id="titre" tabindex="-1">contact</h1>
      <p>une question, une date précise, un mot ? écris-moi ici, je te réponds par email. ou sur Instagram : ${IG_LIEN}</p>
      <form id="f-contact" novalidate>
        <div class="champ-groupe"><label for="c-message">ton message</label><textarea id="c-message" rows="6" maxlength="2000">${esc(E.prefillContact || '')}</textarea><p class="erreur" id="e-c-message"></p></div>
        <div class="champ-groupe"><label for="c-email">ton email, pour te répondre</label><input id="c-email" type="email" inputmode="email" autocomplete="email" autocapitalize="none" spellcheck="false" value="${esc(E.email || knownEmail() || '')}"><p class="erreur" id="e-c-email"></p></div>
        <input type="text" name="site" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">
        <p class="erreur" id="c-err" role="alert"></p>
        <div class="actions"><button class="bouton" type="submit">envoyer</button></div>
        <p class="aide" id="c-ok" role="status" style="color:var(--ok)"></p>
      </form>`;
    if (E.prefillContact) maj({ prefillContact: '' });
    let dernier = 0;
    $('#f-contact').addEventListener('submit', e => {
      e.preventDefault();
      const m = $('#c-message'), mail = $('#c-email'), em = $('#e-c-message'), ee = $('#e-c-email');
      em.textContent = m.value.trim() ? '' : 'écris ton message.'; ee.textContent = EMAIL_RE.test(mail.value.trim()) ? '' : 'cet email ne semble pas complet.';
      m.setAttribute('aria-invalid', String(!!em.textContent)); mail.setAttribute('aria-invalid', String(!!ee.textContent));
      if (em.textContent) { m.focus(); return; } if (ee.textContent) { mail.focus(); return; }
      if (e.target.site.value) return;                                  // le piège à robots
      if (Date.now() - dernier < 30000) { $('#c-err').textContent = 'un instant : un message à la fois.'; return; }
      dernier = Date.now();
      const ok = sendNote({ kind: 'message', email: mail.value.trim(), text: m.value.trim(), name: etat().prenom || '' });
      $('#c-err').textContent = ''; $('#c-ok').textContent = ok === false ? 'reçu (essai : rien n’est parti). je te réponds.' : 'reçu. je te réponds par email.';
      count('contact/envoye'); m.value = '';
    });
  }

  // une liste d'attente en ligne dans la page (email, bouton, message)
  function formAttente({ liste, bouton, texte }) {
    return `<form class="attente" data-liste="${liste}" novalidate>
      <div class="champ-groupe"><label for="w-${liste}">${esc(texte)}</label><input id="w-${liste}" type="email" inputmode="email" autocomplete="email" autocapitalize="none" spellcheck="false" value="${esc(knownEmail() || '')}"></div>
      <p class="erreur" role="alert"></p>
      <div class="actions"><button class="bouton" type="submit">${esc(bouton)}</button></div>
      <p class="aide ok" role="status" style="color:var(--ok)"></p></form>`;
  }
  function brancherAttente() {
    for (const f of main.querySelectorAll('form.attente')) f.addEventListener('submit', async e => {
      e.preventDefault();
      const inp = f.querySelector('input'), err = f.querySelector('.erreur'), ok = f.querySelector('.ok'), b = f.querySelector('button');
      err.textContent = ''; ok.textContent = ''; b.disabled = true;
      const r = await inscrireAttente({ email: inp.value, liste: f.dataset.liste });
      b.disabled = false;
      if (!r.ok) { err.textContent = r.message; inp.setAttribute('aria-invalid', 'true'); inp.focus(); return; }
      inp.removeAttribute('aria-invalid'); ok.textContent = 'c’est noté : je te préviens, et c’est tout.'; count('attente-' + f.dataset.liste);
    });
  }

  function lettre() {
    main.className = '';
    main.innerHTML = `<h1 id="titre" tabindex="-1">un poème par mois</h1>
      <p class="doux">correspondance entre singuliés.</p>
      <ul class="recu">
        <li>un poème inédit chaque mois, tapé une seule fois à la machine, puis imprimé</li>
        <li>au dos, mes pensées pendant qu’il s’écrivait</li>
        <li>le tout dans une enveloppe noire, scellée à la cire</li>
        <li>chaque mois, l’original part chez un membre tiré au sort</li>
      </ul>
      <div class="boite"><p class="prix-ligne"><b>9 €</b> par mois, envoi compris · résiliable</p>
        <p>pas encore ouvert : laisse ton email, je te préviens à l’ouverture. rien n’est débité.</p>
        ${formAttente({ liste: 'lettre', bouton: 'rejoindre la liste d’attente', texte: 'ton email' })}</div>`;
    brancherAttente();
  }

  function livres() {
    main.className = 'large';
    main.innerHTML = `<h1 id="titre" tabindex="-1">mes livres</h1>
      <div class="livres">
        <article class="livre"><img src="${esc(url('livres/couverture.jpg'))}" alt="Couverture de PENSEES POETIQUES : titre blanc sur fond noir" width="360" height="560" loading="lazy">
          <h2>PENSEES POETIQUES</h2><p class="doux">de l’ombre à la lumière, une danse introspective entre âme et chair, entre amour et trahison.</p>
          <p class="petit doux">broché · 12,7 × 20,3 cm · encre blanche sur papier noir</p>
          <p><b>9,90 €</b></p>
          <p><a class="bouton" href="https://www.amazon.fr/dp/B0DS8RF83H" target="_blank" rel="noopener" aria-label="Acheter PENSEES POETIQUES sur Amazon (s’ouvre dans un nouvel onglet)">acheter sur Amazon ↗</a></p></article>
        <article class="livre"><img src="${esc(url('livres/journal-encre.png'))}" alt="Couverture de JOURNAL : titre blanc sur fond noir" width="360" height="560" loading="lazy" style="background:#0a0a0a">
          <h2>JOURNAL</h2><p class="doux">chaque pensée de chaque jour d’une année, du cœur gelé à la floraison sentimentale, l’art exutoire dans la solitude noire.</p>
          <p class="petit doux">broché · 15,2 × 22,9 cm · encre blanche sur papier noir</p>
          <p><b>18,99 €</b></p>
          <p><a class="bouton" href="https://www.amazon.fr/dp/B0BYGNDTWB" target="_blank" rel="noopener" aria-label="Acheter JOURNAL sur Amazon (s’ouvre dans un nouvel onglet)">acheter sur Amazon ↗</a></p></article>
      </div>`;
    for (const a of main.querySelectorAll('a[href*="amazon"]')) a.addEventListener('click', () => count('livres/amazon-' + (a.href.includes('B0DS8RF83H') ? 'recueil' : 'journal')));
  }

  function jeu() {
    main.className = '';
    const qs = questions;
    main.innerHTML = `<h1 id="titre" tabindex="-1">le jeu SINGULIES</h1>
      <p>un jeu de cartes noires, écrites à la machine : chaque carte pose une question, pour soi ou pour quelqu’un d’autre. c’est le jeu dont tu tires une question avant ton poème.</p>
      <div class="boite" aria-live="polite"><p class="doux petit">une question, pour goûter :</p><p class="question" id="j-q" style="margin:8px 0 0"></p>
        <div class="actions"><button class="bouton second" type="button" id="j-autre">une autre question</button></div></div>
      <div class="boite"><h2 style="margin-top:0">il sort bientôt</h2>
        ${formAttente({ liste: 'jeu', bouton: 'me prévenir', texte: 'ton email, pour être prévenu à la sortie' })}</div>`;
    const q = $('#j-q'), tire = () => { q.textContent = qs[Math.floor(Math.random() * qs.length)].q.replace(/'/g, '’'); };
    tire(); $('#j-autre').addEventListener('click', tire);
    brancherAttente();
  }

  return { 'a-propos': aPropos, questions: questionsPage, contact, lettre, livres, jeu };
}
