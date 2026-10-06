// Le lien de la demande (léger : l'envoi l'importe sans charger le moteur des cartes).
// lien : base64url(JSON { n: prénom, k: genre, i: id question, t: texte, m: mode, a: [adresse], d: date (ms) })
export function encodeDemande(d) {
  const j = JSON.stringify({ n: d.name || '', k: d.kind || '', i: d.id ?? null, t: d.text || '', m: d.mode || '', a: d.address || [], d: d.time || Date.now() });
  const b = btoa(unescape(encodeURIComponent(j)));
  return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function decodeDemande(h) {
  try {
    const b = h.replace(/^#/, '').replace(/-/g, '+').replace(/_/g, '/');
    const o = JSON.parse(decodeURIComponent(escape(atob(b + '==='.slice((b.length + 3) % 4)))));
    return { name: String(o.n || '').toUpperCase().replace(/[^A-Z ]/g, '').slice(0, 22), kind: o.k, id: o.i, text: String(o.t || ''), mode: o.m, address: (o.a || []).map(String).slice(0, 5),
      date: o.d ? new Date(o.d).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) : '' };
  } catch { return null; }
}

