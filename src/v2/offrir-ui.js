// V2, décision 4 : « pour offrir ? » → une carte « pour quand ? » puis une carte « de la part de qui ? un mot ? ».
// Le poème part toujours à l'adresse du destinataire ; la date, la signature et le mot voyagent avec la commande.
import { fenetre, esc } from './fenetre.js';
import { lire, ecrire, effacer, analyserDate, MOT_MAX, DELA_MAX } from '../core/offrir.js';
import { count } from '../core/stats.js';

const aujourdhui = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const frDate = iso => { const [a, m, j] = iso.split('-'); return j + '/' + m + '/' + a; };

// ouvre les deux cartes ; rend une promesse (l'état final : { offrir, quand, dela, mot }) ; auChoix : appelé à chaque changement
export function ouvrirOffrir({ nom = '', contact = null } = {}) {
  return new Promise(fini => {
    const etat0 = lire();
    const f = fenetre({ label: 'Pour offrir', classe: 'v2-offrir', auFermer: () => fini(lire()) });
    const dire = (t) => { const m = f.carte.querySelector('.v2-msg'); if (m) m.textContent = t || ''; };

    function carteQuand() {
      f.contenu(`<h2>pour quand ?</h2><p class="v2-sous">facultatif · en france</p>
        <label for="v2-quand">la date où tu voudrais qu’il arrive</label>
        <input id="v2-quand" type="date" min="${aujourdhui()}" value="${esc(etat0.quand)}" autocomplete="off">
        <p class="v2-msg" role="alert"></p>
        <div class="v2-acts"><button type="button" class="v2-btn fort" data-a="suite">continuer →</button><button type="button" class="v2-btn discret" data-a="sans">pas de date</button></div>
        <div class="v2-acts"><button type="button" class="v2-btn discret" data-a="moi">finalement, c’est pour moi</button></div>`);
      const inp = f.carte.querySelector('#v2-quand');
      let urgentVu = false;
      const aller = () => {
        const r = analyserDate(inp.value);
        if (!r.ok) { dire(r.message); return; }
        if (r.urgent && !urgentVu) {
          urgentVu = true;
          dire('dans moins de 10 jours, c’est très juste. écris-moi, on voit si c’est possible.');
          if (contact) {
            const acts = f.carte.querySelector('.v2-acts');
            const b = document.createElement('button'); b.type = 'button'; b.className = 'v2-btn'; b.textContent = 'écrire à Eternel';
            b.addEventListener('click', () => { ecrire({ offrir: true, quand: r.iso }); f.fermer('contact'); contact('ma commande pour ' + nom + ' : je voudrais que le poème arrive pour le ' + frDate(r.iso) + '. est-ce possible ?'); });
            acts.insertBefore(b, acts.firstChild);
          }
          return;
        }
        ecrire({ offrir: true, quand: r.iso }); if (r.iso) count('date-demandee');
        carteDe();
      };
      f.carte.querySelector('[data-a="suite"]').addEventListener('click', aller);
      f.carte.querySelector('[data-a="sans"]').addEventListener('click', () => { ecrire({ offrir: true, quand: '' }); carteDe(); });
      f.carte.querySelector('[data-a="moi"]').addEventListener('click', () => { effacer(); f.fermer('moi'); });
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); aller(); } });
    }

    function carteDe() {
      const e = lire();
      f.contenu(`<h2>de la part de qui ?<br>un mot ?</h2><p class="v2-sous">facultatif · le poème part chez la personne</p>
        <label for="v2-dela">ton nom, pour signer</label>
        <input id="v2-dela" type="text" maxlength="${DELA_MAX}" autocomplete="name" value="${esc(e.dela)}">
        <label for="v2-mot">un mot, qui accompagne l’envoi</label>
        <textarea id="v2-mot" maxlength="${MOT_MAX}" rows="4">${esc(e.mot)}</textarea>
        <p class="v2-cpt" aria-live="off"><span id="v2-n">${e.mot.length}</span> / ${MOT_MAX}</p>
        <div class="v2-acts"><button type="button" class="v2-btn fort" data-a="ok">enregistrer →</button><button type="button" class="v2-btn discret" data-a="passer">passer</button></div>`);
      const mot = f.carte.querySelector('#v2-mot'), n = f.carte.querySelector('#v2-n');
      mot.addEventListener('input', () => { n.textContent = mot.value.length; });
      const fin = ecrireOui => {
        if (ecrireOui) ecrire({ offrir: true, dela: f.carte.querySelector('#v2-dela').value, mot: mot.value });
        count('offrir-choisi'); f.fermer('ok');
      };
      f.carte.querySelector('[data-a="ok"]').addEventListener('click', () => fin(true));
      f.carte.querySelector('[data-a="passer"]').addEventListener('click', () => fin(false));
    }
    carteQuand();
  });
}

// le texte du signe sous RECEVOIR
export function texteSigne() {
  const e = lire();
  return e.offrir ? 'pour offrir ✓ · modifier' : 'pour offrir ?';
}
