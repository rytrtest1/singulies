// Une ligne de parole, à l'écran : ce que la page dit à la personne (« la machine ne tape pas les accents… »,
// « le code postal : cinq chiffres »). Tapée à la machine, discrète, lisible (≥ 14 px, contraste > 7:1 sur le noir),
// annoncée aux lecteurs d'écran (role="status"). Une seule ligne à la fois : une nouvelle remplace la précédente.
//   const note = creerNote(); note.dire('le code postal : cinq chiffres.', { haut: 480 }); note.taire();
const CSS = `
.sg-note { position: fixed; left: 50%; transform: translateX(-50%); width: min(92vw, 30em); box-sizing: border-box; padding: 0 8px;
  text-align: center; z-index: 14; pointer-events: none; opacity: 0; transition: opacity .5s ease;
  font: 14px/1.5 'SG Machine', 'Courier New', monospace; letter-spacing: .02em; color: rgb(226, 222, 214); }
.sg-note.on { opacity: .86; }
`;

export function creerNote({ parent = document.body } = {}) {
  if (!document.getElementById('sg-note-style')) {
    const st = document.createElement('style'); st.id = 'sg-note-style'; st.textContent = CSS; document.head.appendChild(st);
  }
  const el = document.createElement('div');
  el.className = 'sg-note'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
  parent.appendChild(el);
  const calme = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
  let frappe = 0, retrait = 0, courant = '';

  function taire() {
    clearTimeout(frappe); clearTimeout(retrait); courant = '';
    el.classList.remove('on');
  }
  // haut : position verticale (px) ; duree : ms avant que la ligne s'efface (0 = elle reste)
  function dire(texte, { haut, duree = 7000 } = {}) {
    if (!texte) { taire(); return; }
    if (typeof haut === 'number') el.style.top = Math.max(8, haut) + 'px';
    if (texte === courant && el.classList.contains('on')) { clearTimeout(retrait); if (duree) retrait = setTimeout(taire, duree); return; }
    clearTimeout(frappe); clearTimeout(retrait);
    courant = texte;
    el.classList.add('on');
    if (calme()) el.textContent = texte;
    else {
      el.textContent = '';
      let k = 0;
      const pas = () => { el.textContent = texte.slice(0, ++k); if (k < texte.length) frappe = setTimeout(pas, 28 + Math.random() * 34); };
      pas();
    }
    // les lecteurs d'écran reçoivent la phrase entière tout de suite (le texte tapé le serait lettre à lettre)
    el.setAttribute('aria-label', texte);
    if (duree) retrait = setTimeout(taire, duree);
  }
  return { el, dire, taire };
}
