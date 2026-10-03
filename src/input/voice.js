// Saisie à la voix (?saisie=voix, essai) : « dis ou écris ton prénom ».
// Le micro n'est demandé qu'à l'apparition de l'invitation. Refus → le curseur apparaît (clavier).
// Accord → spectre audio en direct (analyse locale) + reconnaissance vocale du navigateur, qui écrit
// le prénom. ATTENTION : la reconnaissance du navigateur (Safari, Chrome) passe par les serveurs
// d'Apple ou de Google — contraire à « zéro appel réseau » ; essai seulement.

const PREFIX = /^(?:euh+\s+)?(?:je m'?\s?appelle|moi c'?\s?est|mon (?:pr[ée]nom|nom) (?:c'?\s?est|est)|c'?\s?est|je suis)\s+/i;

// garde le prénom dit, sans « je m'appelle… » ; 3 mots au plus
export function cleanSpoken(t) {
  const s = t.trim().replace(PREFIX, '');
  return s.split(/\s+/).filter(Boolean).slice(-3).join(' ');
}

export function createVoice({ onText, lang = 'fr-FR' }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const st = { state: 'idle', ctx: null, analyser: null, data: null, rec: null, stream: null, restarts: 0, blocked: false, stopped: false };

  async function start() {
    if (st.state !== 'idle') return;
    if (!navigator.mediaDevices?.getUserMedia) { st.state = 'unsupported'; return; }
    st.state = 'asking';                                  // la demande d'autorisation du navigateur s'affiche
    try {
      st.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch { st.state = 'denied'; return; }
    if (st.stopped) { st.stream.getTracks().forEach((t) => t.stop()); return; }
    st.state = 'listening';
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      st.ctx = new AC();
      const src = st.ctx.createMediaStreamSource(st.stream);
      st.analyser = st.ctx.createAnalyser();
      st.analyser.fftSize = 1024; st.analyser.smoothingTimeConstant = 0.7;
      src.connect(st.analyser);
      st.data = new Uint8Array(st.analyser.frequencyBinCount);
      if (st.ctx.state === 'suspended') st.ctx.resume().catch(() => {});
    } catch { /* pas de spectre, la reconnaissance peut quand même marcher */ }
    startRec();
  }

  function startRec() {
    if (!SR || st.stopped) return;
    const r = new SR();
    r.lang = lang; r.interimResults = true; r.continuous = true; r.maxAlternatives = 1;
    r.onresult = (e) => {
      let t = '';
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      onText(cleanSpoken(t), e.results[e.results.length - 1].isFinal);
    };
    r.onerror = (e) => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') st.blocked = true; };
    r.onend = () => {   // l'écoute s'interrompt d'elle-même : on la relance tant qu'on attend
      if (st.state === 'listening' && !st.stopped && !st.blocked && st.restarts++ < 30) { try { r.start(); } catch { /* */ } }
    };
    try { r.start(); st.rec = r; } catch { st.blocked = true; }
  }

  // certains navigateurs (iOS) exigent un geste pour démarrer l'audio / la reconnaissance
  function gesture() {
    if (st.ctx && st.ctx.state === 'suspended') st.ctx.resume().catch(() => {});
    if (st.blocked && st.state === 'listening') { st.blocked = false; startRec(); }
  }

  function stop() {
    st.stopped = true;
    try { st.rec?.abort(); } catch { /* */ }
    st.stream?.getTracks().forEach((t) => t.stop());
    st.ctx?.close?.().catch(() => {});
    if (st.state === 'listening' || st.state === 'asking') st.state = 'stopped';
  }

  // n bandes de 90 Hz à 4 kHz (voix), répartition logarithmique, 0…1
  function levels(n) {
    if (!st.analyser || !st.data) return null;
    st.analyser.getByteFrequencyData(st.data);
    const bin = st.ctx.sampleRate / st.analyser.fftSize, lo = 90 / bin, hi = 4000 / bin, out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = Math.floor(lo * Math.pow(hi / lo, i / n)), b = Math.max(a, Math.floor(lo * Math.pow(hi / lo, (i + 1) / n)));
      let m = 0;
      for (let k = a; k <= b && k < st.data.length; k++) m = Math.max(m, st.data[k]);
      out[i] = m / 255;
    }
    return out;
  }

  return { start, stop, gesture, levels, get state() { return st.state; }, get canRecognize() { return !!SR; } };
}
