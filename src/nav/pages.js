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
    const pg = (id === 'lettre' ? m.buildLettre : m.buildLivres)(host, base);
    pg.main.classList.add('on');
    // (12/10) l'objet (dans le monde commun : le canvas transparent et sa prise) voyage ; le reste paraît sur place
    return { stage: () => [...pg.obj(), ...pg.rest()], all: () => [host], obj: pg.obj, rest: pg.rest, foot: true, side: () => true,
      center: pg.center, back: () => { host.scrollTop = 0; }, leave: () => pg.close?.() };
  }
  return null;
}
