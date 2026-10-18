// Version 2 (équilibrée) : la couche explicite posée sur le moteur de V3. Elle ne touche pas au moteur : elle le LIT
// (window.__sg : l'état de la page, les cartes) et pose par-dessus ce qui dit chaque étape — la ligne « écris un prénom »,
// « continuer → », les quatre repères, le « ? » de l'étape. Les endroits où le moteur lui-même change (PASSER, envoyer,
// récapitulatif, confirmation) sont gardés par EST_V2 dans mount.js, offre.js, fin.js : ils appellent les modules de ce dossier.
import './v2.css';
import { creerNote } from '../core/note.js';
import { etape as stat, count } from '../core/stats.js';
import { fenetre, esc } from './fenetre.js';
import { aideDe, NOMS } from './faq.js';

const sansAccent = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

export function installerCouche() {
  const g = window.__sg;
  if (!g) return;
  const { S, model } = g;
  const note = creerNote();
  const nom = () => (model.text || '').trim();
  const vv = window.visualViewport;
  const basVisible = () => (vv ? vv.offsetTop + vv.height : innerHeight);

  // ---- « continuer → » : dès la première lettre, jamais de validation automatique
  const go = document.createElement('button'); go.type = 'button'; go.className = 'v2-go'; go.textContent = 'continuer →'; go.setAttribute('aria-label', 'Continuer avec ce prénom');
  go.addEventListener('pointerdown', e => e.preventDefault());   // le clavier ne se ferme pas sous le doigt
  go.addEventListener('click', () => { stat('prenom-valide'); g.startTransition(); });
  document.body.appendChild(go);

  // ---- quatre repères de progression + l'aide de l'étape
  const rep = document.createElement('div'); rep.className = 'v2-etapes'; rep.setAttribute('role', 'img');
  rep.innerHTML = '<i></i><i></i><i></i><i></i>'; document.body.appendChild(rep);
  const q = document.createElement('button'); q.type = 'button'; q.className = 'v2-q'; q.setAttribute('aria-label', 'Aide pour cette étape'); q.innerHTML = '<span aria-hidden="true">?</span>';
  document.body.appendChild(q);

  const etapeActuelle = () => {
    if (document.querySelector('.of-pay.on, .v2-rec')) return 4;
    if (!S.paid) return 1;
    const c = g.cardsApi && g.cardsApi !== 'failed' && g.cardsApi.level ? g.cardsApi.level() : 2;
    return c <= 3 ? 2 : c <= 5 ? 3 : 4;
  };
  let courant = 0, premier = false, reprise = false;
  q.addEventListener('click', () => {
    const e = etapeActuelle(), liste = aideDe(e);
    count('aide/' + sansAccent(NOMS[e - 1]));
    const f = fenetre({ label: 'Aide : ' + NOMS[e - 1], classe: 'v2-aide' });
    f.contenu(`<h2>une question ?</h2>${liste.map(([a, r], i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(a)}</summary><p>${esc(r)}</p></details>`).join('')}`);
  });

  function tic() {
    if (document.hidden) return;
    const input = document.getElementById('in');
    const sur = S.phase === 'input' && S.trans == null && !document.querySelector('#offre.on');
    const fin = !!document.querySelector('.mc.fin');
    const ouvert = !!document.querySelector('.v2-voile');
    document.documentElement.classList.toggle('v2-dim', sur && !fin);

    // la ligne tapée d'arrivée : « écris un prénom » (ou la reprise), tant qu'il n'y a rien d'écrit
    if (sur && S.introOff && !g.portal) {
      if (!nom() && !S.typed) note.dire('écris un prénom', { haut: Math.min(innerHeight * 0.5 + 52, basVisible() - 120), duree: 0 });
      else if (!nom()) note.taire();
      if (nom() && !S.typed && !reprise) {
        reprise = true;
        note.dire('on reprend avec ' + nom().toUpperCase() + ' ? continue, ou change le prénom.', { haut: Math.min(innerHeight * 0.5 + 52, basVisible() - 120), duree: 7000 });
      }
    }
    if (nom() && !premier && S.phase === 'input') { premier = true; stat('prenom-commence'); if (!reprise) note.taire(); }

    // continuer →
    const veut = sur && !!nom() && !(window.__sg.bridge && window.__sg.bridge.composing) && !g.portal && !ouvert;
    go.classList.toggle('on', veut);
    if (veut) go.style.bottom = Math.max(14, innerHeight - basVisible() + 14) + 'px';

    // repères et « ? » : dès l'intro finie, pas sur l'écran de fin
    const montre = (S.introOff || S.phase !== 'input' || S.paid) && !fin;
    const e = etapeActuelle();
    rep.classList.toggle('on', montre);
    if (e !== courant) {
      courant = e;
      rep.querySelectorAll('i').forEach((el, i) => { el.className = i + 1 < e ? 'fait' : i + 1 === e ? 'ici' : ''; });
      rep.setAttribute('aria-label', 'Étape ' + e + ' sur 4 : ' + NOMS[e - 1]);
    }
    q.classList.toggle('on', montre && !ouvert && !(input && document.activeElement === input && innerHeight - basVisible() > 80));
  }
  setInterval(tic, 250);
  tic();
}
