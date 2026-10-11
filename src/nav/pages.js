// Les pages que le document monte lui-même (11/10) : on y glisse depuis le bandeau sans rechargement (nav.js).
// Chacune rend { stage() (l'objet : il suit le doigt), all() (ce qui part et entre sur le côté), foot (SINGULIES en
// bas), side() (les objets voisins), leave(), back(), transient (démontée une fois quittée) }.
import '../lettre/lettre.css';
import { menuFonts } from '../menu/menu.js';

function layer(cls) {
  const host = document.createElement('div'); host.className = 'ltp pg ' + cls;
  host.style.visibility = 'hidden';
  document.body.appendChild(host);
  return host;
}

export async function mountPage(id, { base = './', reduced = false, nav }) {
  await menuFonts(base);
  if (id === 'lettre' || id === 'livres') {
    const host = layer('pg-' + id);
    const m = id === 'lettre' ? await import('../lettre/content.js') : await import('../livres/content.js');
    const { main } = (id === 'lettre' ? m.buildLettre : m.buildLivres)(host, base);
    main.classList.add('on');
    nav.swipe(host, id);
    const obj = main.querySelector('.lt-env');
    return { stage: () => [main], all: () => [host], foot: true, side: () => host.scrollTop < 40,
      center: () => { const r = obj.getBoundingClientRect(); return r.height ? { y: r.top + r.height / 2, h: r.height } : null; },
      back: () => { host.scrollTop = 0; } };
  }
  if (id === 'jeu') {
    // la scène du jeu (sa propre flèche retour est masquée : le bandeau la remplace) ; démontée une fois quittée
    if (!document.getElementById('nv-jeu')) { const st = document.createElement('style'); st.id = 'nv-jeu'; st.textContent = '#jeu .jeu-back { display: none !important; } #jeu { z-index: 24; }'; document.head.appendChild(st); }
    const { mountJeu } = await import('../jeu/jeu.js');
    let gone = false;
    const j = await mountJeu({ base, reduced, onBack: () => { if (!gone) nav.home(); } });
    if (!j) return null;
    j.root.style.visibility = 'hidden';
    nav.swipe(j.root, 'jeu');
    return { stage: () => [j.root], all: () => [j.root], foot: false, side: () => false, transient: true,
      center: () => ({ y: innerHeight * 0.42, h: Math.min(innerWidth * 0.8, 420) * 52 / 87 }),
      leave: () => { gone = true; setTimeout(() => j.leave(), 650); } };
  }
  return null;
}
