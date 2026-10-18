// Les étapes de la commande, V1 : une page par étape, des libellés, tout est dit (décisions 1 à 8).
//   accueil (prénom, pour moi / pour offrir) → aperçu (ce qu'on reçoit, prix, exemples) → question → adresse → paiement → confirmation
import { PRIX } from '../alt/config.js';
import { analysePrenom } from '../core/prenom.js';
import { validerCodePostal } from '../core/adresse.js';
import { lierAdresse } from '../core/suggestions.js';
import { etatPaiement, LIGNE_PAIEMENT } from '../core/paiement.js';
import { etape as stat, count, erreur } from '../core/stats.js';
import { lire as lireOffre, ecrire as ecrireOffre, effacer as effacerOffre, analyserDate, MOT_MAX, DELA_MAX } from '../core/offrir.js';
import { QUESTIONS as FAQ } from '../alt/questions.js';
import { AUTEUR } from '../menu/auteur.js';
import { EMAIL_RE, rememberEmail, knownEmail } from '../app/storage.js';
import { send, setOrder } from '../app/send.js';
import { stripeDispo, creerSession, adresseVersStripe } from '../core/stripe.js';
import { etat, maj, majAdr, tirerQuestion, questionDe, titreCase, refDe, recommencer, noterCommande } from './etat.js';

export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const frDate = iso => String(iso).split('-').reverse().join('/');
const aujourdhui = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const REDUIT = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ctx : { main, go(route), annonce(texte), base }
export function creerVues(ctx) {
  const { main, go } = ctx;
  const $ = (s, r = main) => r.querySelector(s);
  const pourOffrir = () => lireOffre().offrir;
  let champ = null;
  const arreterChamp = () => { if (champ) { champ.stop(); champ = null; } };

  // ———————————————————————— 1. l'accueil : le prénom ————————————————————————
  function accueil() {
    if (etat().fait) { recommencer(); effacerOffre(); }   // une nouvelle commande
    const E = etat(), o = lireOffre();
    main.className = '';
    main.innerHTML = `<section class="hero">
      <canvas class="champ" aria-hidden="true"></canvas>
      <h1 id="titre" tabindex="-1">un prénom, un poème</h1>
      <p class="promesse">Eternel écrit un acrostiche avec ton prénom, le tape à la machine à écrire et te l’envoie par la poste.</p>
      <p class="prix-ligne"><b>${esc(PRIX)}</b> · envoi en France compris · posté sous 7 jours</p>
      <form id="f-prenom" novalidate>
        <div class="champ-groupe">
          <label for="prenom">ton prénom</label>
          <input id="prenom" name="prenom" type="text" maxlength="40" autocomplete="given-name" autocapitalize="words" autocorrect="off" spellcheck="false" enterkeyhint="go" aria-describedby="prenom-aide" value="${esc(E.brut || titreCase(E.prenom))}">
          <p class="aide" id="prenom-aide" role="status" aria-live="polite">la machine tape en majuscules, sans accents.</p>
        </div>
        <fieldset><legend>ce poème est</legend>
          <div class="choix" role="radiogroup" aria-label="Pour qui est ce poème ?">
            <input type="radio" name="pour" id="pour-moi" value="moi" ${o.offrir ? '' : 'checked'}><label for="pour-moi">pour moi</label>
            <input type="radio" name="pour" id="pour-offrir" value="offrir" ${o.offrir ? 'checked' : ''}><label for="pour-offrir">pour offrir</label>
          </div></fieldset>
        <div id="offrir" ${o.offrir ? '' : 'hidden'}>
          <p class="doux petit">le poème part chez la personne : tu mets son adresse à l’étape suivante.</p>
          <div class="champ-groupe"><label for="quand">pour quand ? (facultatif)</label>
            <input id="quand" type="date" min="${aujourdhui()}" value="${esc(o.quand)}" aria-describedby="quand-aide">
            <p class="aide" id="quand-aide" role="status" aria-live="polite"></p></div>
          <div class="champ-groupe"><label for="dela">de la part de (facultatif)</label>
            <input id="dela" type="text" maxlength="${DELA_MAX}" autocomplete="name" value="${esc(o.dela)}"></div>
          <div class="champ-groupe"><label for="mot">un mot, qui accompagne l’envoi (facultatif)</label>
            <textarea id="mot" maxlength="${MOT_MAX}" rows="4">${esc(o.mot)}</textarea>
            <p class="compteur"><span id="mot-n">${o.mot.length}</span> / ${MOT_MAX}</p></div>
        </div>
        <p class="erreur" id="prenom-err" role="alert"></p>
        <button class="bouton" type="submit">continuer</button>
      </form></section>`;
    // le nuage de prénoms, en décor (jamais nécessaire : mouvement réduit = aucun)
    const cv = $('.champ');
    if (!REDUIT) import('../epure/champ.js').then(m => { if (!cv.isConnected) return; champ = m.mountChamp(cv, { reduced: false }); champ.start(); if (etat().prenom) champ.setName(etat().prenom); }).catch(() => {});
    else cv.remove();
    const inp = $('#prenom'), aide = $('#prenom-aide'), err = $('#prenom-err');
    let commence = !!E.prenom;
    const analyser = () => {
      const a = analysePrenom(inp.value);
      aide.textContent = a.messages.length ? a.messages[0].texte + (a.nom.trim() ? ' sur la feuille : ' + a.nom.trim() + '.' : '') : (a.nom.trim() ? 'sur la feuille : ' + a.nom.trim() + '.' : 'la machine tape en majuscules, sans accents.');
      if (a.nom && !commence) { commence = true; stat('prenom-commence'); }
      if (champ) champ.setName(a.nom.replace(/ /g, ''));
      inp.removeAttribute('aria-invalid'); err.textContent = '';
      return a;
    };
    inp.addEventListener('input', analyser);
    if (inp.value) analyser();
    // pour moi / pour offrir
    const rad = [...main.querySelectorAll('input[name="pour"]')];
    const surChoix = () => {
      const off = rad.find(r => r.checked).value === 'offrir';
      $('#offrir').hidden = !off;
      if (off) { ecrireOffre({ offrir: true }); count('offrir-choisi'); } else effacerOffre();
    };
    rad.forEach(r => r.addEventListener('change', surChoix));
    const quand = $('#quand'), qa = $('#quand-aide');
    quand.addEventListener('change', () => {
      const r = analyserDate(quand.value);
      qa.innerHTML = '';
      if (!r.ok) { qa.textContent = r.message; return; }
      if (r.urgent) {
        qa.append('dans moins de 10 jours, c’est très juste. ');
        const a = document.createElement('a'); a.href = '#/contact'; a.textContent = 'écris-moi, on voit si c’est possible.';
        a.addEventListener('click', () => maj({ prefillContact: 'ma commande pour ' + (etat().prenom || '') + ' : je voudrais que le poème arrive pour le ' + frDate(r.iso) + '. est-ce possible ?' }));
        qa.append(a);
      }
      if (r.iso) count('date-demandee');
    });
    const mot = $('#mot'); mot.addEventListener('input', () => { $('#mot-n').textContent = mot.value.length; });
    $('#f-prenom').addEventListener('submit', e => {
      e.preventDefault();
      const a = analysePrenom(inp.value);
      if (a.vide) { inp.setAttribute('aria-invalid', 'true'); err.textContent = 'écris ton prénom pour continuer.'; erreur('prenom-vide'); inp.focus(); return; }
      const d = analyserDate(quand.value);
      if (!$('#offrir').hidden && !d.ok) { quand.setAttribute('aria-invalid', 'true'); qa.textContent = d.message; quand.focus(); return; }
      if (!$('#offrir').hidden) ecrireOffre({ offrir: true, quand: d.iso || '', dela: $('#dela').value, mot: mot.value });
      maj({ prenom: a.nom, brut: inp.value.trim() });
      stat('prenom-valide');
      go('apercu');
    });
    return () => arreterChamp();
  }

  // ———————————————————————— 2. l'aperçu : ce qu'on reçoit, le prix, les exemples ————————————————————————
  function apercu() {
    const E = etat(), o = lireOffre(), nom = E.prenom;
    main.className = '';
    const lignes = [...nom].map(c => c === ' ' ? '<li class="blanc" aria-hidden="true"></li>' : `<li><span>${esc(c)}</span></li>`).join('');
    const faq = [FAQ[0], FAQ[6], FAQ[2]];
    main.innerHTML = `<h1 id="titre" tabindex="-1">${o.offrir ? 'le poème de ' + esc(nom) : 'voici ton poème'}</h1>
      <p class="doux">un acrostiche : une lettre par ligne, chaque ligne commence par une lettre de ${o.offrir ? 'son' : 'ton'} prénom. les vers sont écrits par Eternel.</p>
      <div class="feuille" role="img" aria-label="Aperçu de la feuille : le prénom ${esc(nom)}, une lettre par ligne"><ol>${lignes}</ol></div>
      <p class="legende">${esc(nom)} · <button class="lien-bouton" type="button" id="modif-prenom">modifier le prénom</button></p>
      <h2>ce que ${o.offrir ? 'la personne reçoit' : 'tu reçois'}</h2>
      <ul class="recu">
        <li>une feuille A4 noire : ${o.offrir ? 'son' : 'ton'} poème, tapé une seule fois à la machine à écrire</li>
        <li>une carte du jeu SINGULIES : la question à laquelle ${o.offrir ? 'tu réponds' : 'tu réponds'}</li>
        <li>une enveloppe noire, scellée à la cire</li>
        <li>une carte mystère et un fil, pour rester liés</li>
      </ul>
      <div class="boite">
        <p class="prix-ligne"><b>${esc(PRIX)}</b> · envoi en France compris</p>
        <p>posté sous 7 jours.</p>
        <p class="doux">${esc(LIGNE_PAIEMENT)}.</p>
        <div class="actions"><button class="bouton" type="button" id="commander">commander · ${esc(PRIX)}</button></div>
        <p class="petit doux" style="margin-top:12px">en commandant, tu acceptes les <a href="./conditions.html" target="_blank" rel="noopener">conditions de vente <span class="v-ext">↗</span></a>.</p>
      </div>
      <h2>exemples : d’autres prénoms</h2>
      <p class="doux petit">de vrais poèmes envoyés, avec l’accord des personnes.</p>
      <ul class="exemples">${['isabelle', 'anais', 'marysol', 'julie'].map(p => `<li><img src="${new URL('exemples/' + p + '.jpg', document.baseURI).href}" alt="Acrostiche ${esc(titreCase(p))}, tapé à la machine sur une feuille noire" loading="lazy" decoding="async"><span>exemple · ${esc(titreCase(p))}</span></li>`).join('')}</ul>
      <h2>qui écrit ?</h2>
      <div class="qui"><div>${AUTEUR.slice(0, 3).map(p => `<p>${esc(p)}</p>`).join('')}<p><a href="#/a-propos">en savoir plus</a> · <a href="https://www.instagram.com/e.t.ernel/" target="_blank" rel="noopener" aria-label="Instagram @e.t.ernel (s’ouvre dans un nouvel onglet)">@e.t.ernel ↗</a></p></div></div>
      <h2>trois questions</h2>
      ${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a.replace('(menu en haut à droite, CONTACT)', '(page contact)'))}</p></details>`).join('')}
      <p style="margin-top:22px"><button class="lien-bouton" type="button" data-go="">‹ modifier mon prénom</button></p>`;
    $('#modif-prenom').addEventListener('click', () => go(''));
    main.querySelector('[data-go]').addEventListener('click', () => go(''));
    $('#commander').addEventListener('click', () => { stat('recevoir'); if (!etat().qid && etat().kind === 'reponse') tirerQuestion(); go('question'); });
    stat('apercu-vu');
    for (const d of main.querySelectorAll('details')) d.addEventListener('toggle', () => { if (d.open) for (const x of main.querySelectorAll('details')) if (x !== d) x.open = false; });
  }

  // ———————————————————————— 3. la question (ou le thème, ou l'improvisation) ————————————————————————
  function question() {
    const E = etat(), o = lireOffre(), nom = E.prenom;
    if (!E.qid && E.kind === 'reponse') { tirerQuestion(); stat('question-tiree'); }
    main.className = '';
    const pour = o.offrir ? 'réponds en pensant à elle / à lui' : 'réponds avec ce qui te vient';
    const dessiner = () => {
      const e = etat(), theme = e.kind === 'theme';
      const q = questionDe(e.qid);
      main.innerHTML = `<h1 id="titre" tabindex="-1">${theme ? 'choisis le thème' : 'une question pour ' + (o.offrir ? esc(nom) : 'toi')}</h1>
        ${theme ? `<p class="doux">écris le thème de ${o.offrir ? 'son' : 'ton'} poème : un mot, une phrase, une envie.</p>`
          : `<p class="doux">cette question vient du jeu SINGULIES. ${esc(pour)} : ta réponse inspire le poème.</p>
          <div class="question" aria-live="polite"><small>question ${esc(String(e.qid ?? ''))}</small>${esc(q ? q.q.replace(/'/g, '’') : '')}</div>`}
        <form id="f-question" novalidate>
          <div class="champ-groupe"><label for="reponse">${theme ? 'le thème de ton poème' : 'ta réponse'}</label>
            <textarea id="reponse" rows="6" maxlength="1500" aria-describedby="reponse-aide">${esc(theme ? e.theme : e.texte)}</textarea>
            <p class="aide" id="reponse-aide">plusieurs lignes possibles. tu peux changer d’avis à l’étape suivante.</p></div>
          <p class="erreur" id="reponse-err" role="alert"></p>
          <div class="actions"><button class="bouton" type="submit">continuer</button></div>
          <div class="actions" role="group" aria-label="Autres choix">
            ${theme ? '<button class="bouton second" type="button" id="b-retour-q">revenir aux questions</button>' : '<button class="bouton second" type="button" id="b-autre">une autre question</button>'}
            ${theme ? '' : '<button class="bouton second" type="button" id="b-theme">je préfère choisir mon thème</button>'}
            <button class="bouton second" type="button" id="b-impro">laisse Eternel improviser</button>
          </div>
        </form>`;
      const ta = $('#reponse'), err = $('#reponse-err');
      let ecrit = !!ta.value.trim();
      ta.addEventListener('input', () => { maj(theme ? { theme: ta.value } : { texte: ta.value }); err.textContent = ''; ta.removeAttribute('aria-invalid'); if (!ecrit && ta.value.trim()) { ecrit = true; stat('reponse-donnee'); } });
      $('#f-question').addEventListener('submit', ev => {
        ev.preventDefault();
        if (!ta.value.trim()) { ta.setAttribute('aria-invalid', 'true'); err.textContent = theme ? 'écris un thème, ou laisse Eternel improviser.' : 'écris une réponse, ou choisis une autre question, ou laisse Eternel improviser.'; ta.focus(); return; }
        maj({ kind: theme ? 'theme' : 'reponse' });
        go('adresse');
      });
      if (!theme) {
        $('#b-autre').addEventListener('click', () => { count('question-retiree', { once: false }); tirerQuestion(etat().qid); ctx.annonce('nouvelle question'); dessiner(); $('#reponse').focus(); });
        $('#b-theme').addEventListener('click', () => { maj({ kind: 'theme' }); count('passer-theme'); dessiner(); $('#reponse').focus(); });
      } else $('#b-retour-q').addEventListener('click', () => { maj({ kind: 'reponse' }); if (!etat().qid) tirerQuestion(); dessiner(); $('#reponse').focus(); });
      // improviser : ce qui est écrit n'est jamais effacé (il reste là si l'on revient), il n'est simplement pas envoyé
      $('#b-impro').addEventListener('click', () => { maj({ kind: 'improvisation' }); stat('passer-improvise'); go('adresse'); });
    };
    if (E.kind === 'improvisation') maj({ kind: 'reponse' });
    dessiner();
  }

  // ———————————————————————— 4. l'adresse (et l'email) : un formulaire classique ————————————————————————
  function adresse() {
    const E = etat(), o = lireOffre();
    main.className = '';
    const a = E.adr;
    main.innerHTML = `<h1 id="titre" tabindex="-1">${o.offrir ? 'où envoyer le poème de ' + esc(E.prenom) + ' ?' : 'où t’envoyer ton poème ?'}</h1>
      <p class="doux">envoi par La Poste, en France uniquement.${o.offrir ? ' le poème part toujours à l’adresse de la personne.' : ''}</p>
      <form id="f-adresse" novalidate autocomplete="on">
        <div class="deux">
          <div class="champ-groupe"><label for="a-prenom">prénom${o.offrir ? ' du destinataire' : ''}</label><input id="a-prenom" type="text" autocomplete="${o.offrir ? 'off' : 'given-name'}" value="${esc(a.prenom || (o.offrir ? titreCase(E.prenom) : titreCase(E.prenom)))}"><p class="erreur" id="e-a-prenom"></p></div>
          <div class="champ-groupe"><label for="a-nom">nom${o.offrir ? ' du destinataire' : ''}</label><input id="a-nom" type="text" autocomplete="${o.offrir ? 'off' : 'family-name'}" value="${esc(a.nom)}"><p class="erreur" id="e-a-nom"></p></div>
        </div>
        <div class="champ-groupe"><label for="a-rue">adresse (numéro et rue)</label><input id="a-rue" type="text" autocomplete="address-line1" value="${esc(a.rue)}" aria-describedby="a-rue-aide"><p class="aide" id="a-rue-aide">on te propose ton adresse pendant que tu écris : choisis-la, ou continue d’écrire.</p><p class="erreur" id="e-a-rue"></p></div>
        <div class="champ-groupe"><label for="a-cplt">complément d’adresse (facultatif)</label><input id="a-cplt" type="text" autocomplete="address-line2" value="${esc(a.cplt)}"></div>
        <div class="deux">
          <div class="champ-groupe"><label for="a-cp">code postal</label><input id="a-cp" type="text" inputmode="numeric" maxlength="6" autocomplete="postal-code" value="${esc(a.cp)}"><p class="erreur" id="e-a-cp"></p></div>
          <div class="champ-groupe"><label for="a-ville">ville</label><input id="a-ville" type="text" autocomplete="address-level2" value="${esc(a.ville)}"><p class="erreur" id="e-a-ville"></p></div>
        </div>
        <p class="doux petit">pays : France (je n’envoie pas encore à l’étranger).</p>
        <div class="champ-groupe" style="margin-top:22px"><label for="a-email">ton email</label><input id="a-email" type="email" inputmode="email" autocomplete="email" autocapitalize="none" spellcheck="false" value="${esc(E.email || knownEmail() || '')}" aria-describedby="a-email-aide"><p class="aide" id="a-email-aide">pour la confirmation de ta commande et le suivi de l’envoi. rien d’autre.</p><p class="erreur" id="e-a-email"></p></div>
        <div class="actions"><button class="bouton" type="submit">continuer vers le paiement</button></div>
      </form>`;
    const ids = ['prenom', 'nom', 'rue', 'cplt', 'cp', 'ville'];
    const champs = Object.fromEntries([...ids.map(k => ['a-' + k, $('#a-' + k)]), ['a-email', $('#a-email')]].map(([k, el]) => [k.slice(2), el]));
    let commence = ids.some(k => (a[k] || '').trim());
    const lire = () => { majAdr(Object.fromEntries(ids.map(k => [k, champs[k].value.trim()]))); maj({ email: champs.email.value.trim() }); };
    const dire = (k, texte) => { const e = $('#e-a-' + k); if (!e) return; e.textContent = texte || ''; if (texte) champs[k].setAttribute('aria-invalid', 'true'); else champs[k].removeAttribute('aria-invalid'); };
    // vérification immédiate, à la sortie du champ
    const verif = {
      prenom: () => champs.prenom.value.trim() ? '' : 'il manque le prénom.',
      nom: () => champs.nom.value.trim() ? '' : 'il manque le nom.',
      rue: () => champs.rue.value.trim().length >= 3 ? '' : 'il manque l’adresse (numéro et rue).',
      cp: () => validerCodePostal(champs.cp.value).message,
      ville: () => champs.ville.value.trim() ? '' : 'il manque la ville.',
      email: () => EMAIL_RE.test(champs.email.value.trim()) ? '' : 'cet email ne semble pas complet.',
    };
    for (const k of Object.keys(verif)) {
      champs[k].addEventListener('blur', () => { if (champs[k].value || champs[k]._touche) dire(k, verif[k]()); });
      champs[k].addEventListener('input', () => { champs[k]._touche = true; if (champs[k].getAttribute('aria-invalid') === 'true') dire(k, verif[k]()); lire(); if (!commence) { commence = true; stat('adresse-commencee'); } });
    }
    lierAdresse(champs.rue, { ancre: () => champs.rue.getBoundingClientRect(), onChoix: s => { champs.rue.value = s.rue; champs.ville.value = s.ville; champs.cp.value = s.cp; ['rue', 'ville', 'cp'].forEach(k => dire(k, '')); lire(); champs.cplt.focus({ preventScroll: true }); } });
    $('#f-adresse').addEventListener('submit', e => {
      e.preventDefault();
      let premier = null;
      for (const k of Object.keys(verif)) { const m = verif[k](); dire(k, m); if (m && !premier) { premier = k; erreur(k === 'cp' ? 'code-postal' : 'adresse-' + k); } }
      if (premier) { champs[premier].focus(); ctx.annonce('il y a une erreur dans le formulaire'); return; }
      lire(); majAdr({ cp: validerCodePostal(champs.cp.value).cp });
      rememberEmail(champs.email.value);
      stat('adresse-valide'); stat('email-donne');
      go('paiement');
    });
  }

  // ———————————————————————— 5. le récapitulatif et le paiement ————————————————————————
  let sessionCtx = null;
  function paiement() {
    const E = etat(), o = lireOffre(), pay = etatPaiement(), a = E.adr;
    main.className = '';
    const adr = [[a.prenom, a.nom].filter(Boolean).join(' '), a.rue, a.cplt, [a.cp, a.ville].filter(Boolean).join(' ')].filter(Boolean).join('\n');
    const q = E.kind === 'reponse' ? questionDe(E.qid) : null;
    const court = (t, n) => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t; };
    const texte = E.kind === 'reponse' ? (q ? q.q.replace(/'/g, '’') + '\n' : '') + '« ' + court(E.texte, 200) + ' »' : E.kind === 'theme' ? 'ton thème : ' + court(E.theme, 200) : 'Eternel improvise à partir du prénom';
    const offert = o.offrir ? [o.quand ? 'pour arriver le ' + frDate(o.quand) : '', o.dela ? 'de la part de ' + o.dela : '', o.mot ? 'avec un mot : « ' + court(o.mot, 120) + ' »' : ''].filter(Boolean).join('\n') : '';
    main.className = '';
    main.innerHTML = `<h1 id="titre" tabindex="-1">ton récapitulatif</h1>
      <div class="boite recap"><dl>
        <dt>le poème</dt><dd><span>${esc(E.prenom)}${o.offrir ? ' · à offrir' : ''}</span><button class="lien-bouton" type="button" data-r="">modifier</button></dd>
        ${offert ? `<dt>l’envoi offert</dt><dd><span>${esc(offert)}</span><button class="lien-bouton" type="button" data-r="">modifier</button></dd>` : ''}
        <dt>${E.kind === 'reponse' ? 'la question et ta réponse' : E.kind === 'theme' ? 'le thème' : 'l’écriture'}</dt><dd><span>${esc(texte)}</span><button class="lien-bouton" type="button" data-r="question">modifier</button></dd>
        <dt>l’adresse</dt><dd><span>${esc(adr)}</span><button class="lien-bouton" type="button" data-r="adresse">modifier</button></dd>
        <dt>ton email</dt><dd><span>${esc(E.email)}</span><button class="lien-bouton" type="button" data-r="adresse">modifier</button></dd>
      </dl></div>
      <p class="bande"><span>livré par La Poste</span><span>si l’enveloppe se perd, je refais le poème</span><span>paiement sécurisé</span></p>
      <div class="payer-zone">
        <p class="prix-ligne"><b>${esc(PRIX)}</b> · envoi en France compris · posté sous 7 jours</p>
        <p class="doux">${esc(pay.panneauStripe ? 'paiement par carte, Apple Pay ou Google Pay.' + (pay.passable ? ' (mode test : rien n’est débité)' : '') : LIGNE_PAIEMENT)}.</p>
        <div class="stripe-hote" id="stripe-hote" ${pay.panneauStripe ? '' : 'hidden'}><p class="doux" id="stripe-attente">un instant…</p></div>
        <p class="erreur" id="pay-err" role="alert"></p>
        <div class="actions">
          <button class="bouton" type="button" id="payer" ${pay.panneauStripe ? 'disabled' : ''}>${pay.panneauStripe ? 'payer · ' + esc(PRIX) : 'commander · ' + esc(PRIX)}</button>
          ${pay.passable ? '<button class="bouton second" type="button" id="passer">passer (test)</button>' : ''}
        </div>
        <p class="petit doux" style="margin-top:12px">en commandant, tu acceptes les <a href="./conditions.html" target="_blank" rel="noopener">conditions de vente <span class="v-ext">↗</span></a>.</p>
      </div>`;
    for (const b of main.querySelectorAll('[data-r]')) b.addEventListener('click', () => go(b.dataset.r));
    const err = $('#pay-err'), payer = $('#payer');
    const finir = (extra = {}) => { payer.disabled = true; terminer(extra); };
    // sans paiement visible (PayPal pour l'instant) : la demande part marquée « à payer », le lien de paiement viendra par email
    if (!pay.panneauStripe) { payer.addEventListener('click', () => finir({ reserve: true })); return; }
    stat('paiement-ouvert');
    if (pay.passable) $('#passer').addEventListener('click', () => { stat('paiement-passe-test'); finir({ simule: true }); });
    if (!stripeDispo()) { $('#stripe-hote').innerHTML = '<p class="doux">le paiement ne répond pas pour l’instant : réessaie dans un instant.</p>'; return; }
    const ref = E.ref || maj({ ref: refDe(E.prenom) }).ref;
    const retour = new URL('./', document.baseURI).href;
    (sessionCtx && sessionCtx.ref === ref ? sessionCtx.p : (sessionCtx = { ref, p: creerSession({ prenom: E.prenom, ref, retour }) }).p).then(({ checkout, actions }) => {
      const hote = $('#stripe-hote'); if (!hote) return;
      hote.innerHTML = '<div id="s-express"></div><div id="s-pm"></div>';
      try {
        const ex = checkout.createExpressCheckoutElement({ buttonHeight: 48, buttonTheme: { applePay: 'white', googlePay: 'white' }, buttonType: { applePay: 'buy', googlePay: 'buy', paypal: 'buynow' }, layout: { maxColumns: 1, overflow: 'never' } });
        ex.mount('#s-express');
        ex.on('confirm', async ev => {
          err.textContent = '';
          const r = await actions.confirm({ expressCheckoutConfirmEvent: ev, redirect: 'if_required' });
          if (r && r.type === 'success') terminer({ session: r.session?.id || '' }); else if (r && r.type === 'error') err.textContent = r.error?.message || 'le paiement n’est pas passé.';
        });
      } catch (e) { console.warn('portefeuille', e); }
      checkout.createPaymentElement().mount('#s-pm');
      payer.disabled = false;
      payer.addEventListener('click', async () => {
        if (payer.disabled) return;
        payer.disabled = true; err.textContent = '';
        await adresseVersStripe(actions, checkout, etat().adr).catch(e => console.warn('adresse de livraison', e));
        const r = await actions.confirm({ email: etat().email, redirect: 'if_required' });
        if (r && r.type === 'success') { terminer({ session: r.session?.id || '' }); return; }
        err.textContent = (r && r.error && r.error.message) || 'le paiement n’est pas passé.'; payer.disabled = false;
      });
    }).catch(e => { console.warn('paiement', e); sessionCtx = null; const h = $('#stripe-hote'); if (h) h.innerHTML = '<p class="doux">le paiement ne répond pas pour l’instant : réessaie dans un instant.</p>'; });
    return () => {};
  }

  // la demande part (email à Eternel, récapitulatif à la personne, suivi des commandes) ; ?envoi=0 : rien ne part
  function terminer(extra = {}) {
    const E = etat(), o = lireOffre(), a = E.adr;
    const ref = E.ref || maj({ ref: refDe(E.prenom) }).ref;
    const order = { ref, ...extra };
    setOrder(order);
    const address = [[a.prenom, a.nom].filter(Boolean).join(' '), a.rue, a.cplt, [a.cp, a.ville].filter(Boolean).join(' ')].map(x => String(x || '').trim()).filter(Boolean);
    send({ name: E.prenom, kind: E.kind, id: E.kind === 'reponse' ? E.qid : null, text: E.kind === 'reponse' ? E.texte : E.kind === 'theme' ? E.theme : '', mode: 'poste', address, email: E.email, contact: E.email,
      dela: o.offrir ? o.dela : '', mot: o.offrir ? o.mot : '', quand: o.offrir ? o.quand : '' });
    if (extra.session) count('alt/paye');
    noterCommande();
    maj({ fait: true, mode: extra.reserve ? 'reservation' : extra.simule ? 'simule' : 'paye', loin: 5 });
    go('confirmation');
  }

  // ———————————————————————— 6. la confirmation ————————————————————————
  function confirmation() {
    const E = etat(), o = lireOffre();
    main.className = '';
    if (!E.fait) { go(''); return; }
    const reserve = E.mode === 'reservation';
    main.innerHTML = `<h1 id="titre" tabindex="-1">merci, c’est ${reserve ? 'noté' : 'payé'}</h1>
      <p>ta commande ${o.offrir ? 'pour ' + esc(E.prenom) + ' ' : ''}est enregistrée. un récapitulatif part par email à ${esc(E.email)}.</p>
      <p>ta référence :<br><span class="ref">${esc(E.ref)}</span></p>
      <h2>la suite, en trois étapes</h2>
      <ol class="etape-suite">
        <li>${reserve ? 'je t’écris par email pour le paiement : rien n’est débité maintenant.' : 'ton paiement est confirmé.'}</li>
        <li>j’écris ${o.offrir ? 'son' : 'ton'} poème et je le tape à la machine, une seule fois, sous 7 jours.</li>
        <li>il part par La Poste${o.offrir ? ' chez ' + esc(E.prenom) : ''} ; tu reçois un email quand il est posté.</li>
      </ol>
      <p>une question ? <a href="#/contact">écris-moi</a>${' · '}<a href="https://www.instagram.com/e.t.ernel/" target="_blank" rel="noopener" aria-label="Instagram @e.t.ernel (s’ouvre dans un nouvel onglet)">@e.t.ernel ↗</a></p>
      <h2>et aussi</h2>
      <ul class="recu"><li><a href="#/lettre">un poème par mois</a> : une lettre mensuelle, en liste d’attente</li><li><a href="#/livres">mes livres</a> : sur Amazon</li><li><a href="#/jeu">le jeu SINGULIES</a> : il sort bientôt</li></ul>
      <p class="actions"><a class="bouton second" href="#/">revenir à l’accueil</a></p>`;
    stat('confirmation-vue');
    effacerOffre();
  }

  return { accueil, apercu, question, adresse, paiement, confirmation, terminer };
}
