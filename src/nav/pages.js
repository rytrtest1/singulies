// Les pages que le document monte lui-même (11/10) : on y glisse depuis le bandeau sans rechargement (nav.js).
// Chacune rend { stage() (l'objet : il suit le doigt), all() (ce qui part et entre sur le côté), foot (SINGULIES en
// bas), side() (les objets voisins), leave(), back(), transient (démontée une fois quittée) }.
import '../lettre/lettre.css';
import { siteFonts } from '../app/fonts.js';

function layer(cls) {
  const host = document.createElement('div'); host.className = 'ltp pg ' + cls;
  host.style.visibility = 'hidden';
  document.body.appendChild(host);
  return host;
}

export async function mountPage(id, { base = './', reduced = false, nav }) {
  await siteFonts(base);
  if (id === 'lettre' || id === 'livres') {
    const host = layer('pg-' + id);
    const m = id === 'lettre' ? await import('../lettre/content.js') : await import('../livres/content.js');
    const { main } = (id === 'lettre' ? m.buildLettre : m.buildLivres)(host, base);
    main.classList.add('on');
    const obj = main.querySelector('.lt-env'), others = () => [...main.children].filter(e => e !== obj);
    // l'objet (l'enveloppe, le livre) voyage ; le reste de la page paraît sur place
    return { stage: () => [obj, ...others()], all: () => [host], obj: () => [obj], rest: others, foot: true, side: () => host.scrollTop < 40,
      center: () => { const r = obj.getBoundingClientRect(); return r.height ? { y: r.top + r.height / 2, h: r.height } : null; },
      back: () => { host.scrollTop = 0; } };
  }
  return null;
}
