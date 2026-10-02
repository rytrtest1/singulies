// Pont entre le champ natif (unique élément focalisable) et le NameModel.
// Règles : le modèle fait foi ; pendant une composition IME on ne réécrit jamais le champ,
// on se contente d'un aperçu normalisé ; on normalise à la fin de la composition.
import { displayCase, MAX_LEN, normalizeName } from '../text/normalize.js';

const HANDLED = new Set(['insertText', 'insertFromPaste', 'insertFromDrop', 'deleteContentBackward', 'deleteContentForward', 'deleteByCut', 'historyUndo', 'historyRedo']);

export function createBridge(input, model, { caseMode, onChange, onSubmit, onEscape, announce }) {
  let composing = false;
  let preview = null; // texte canonique affiché pendant une composition

  const view = (s) => displayCase(s, caseMode);

  function writeBack() {
    if (composing) return;
    const v = view(model.text);
    if (input.value !== v) input.value = v;
    if (document.activeElement === input) {
      try { input.setSelectionRange(model.selStart, model.selEnd); } catch {}
    }
  }

  function changed(res, source) {
    if (res && res.truncated) announce(`${MAX_LEN} lettres au maximum`);
    writeBack();
    onChange({ source });
  }

  function syncSelection() {
    if (composing) return;
    const s = input.selectionStart ?? model.text.length, e = input.selectionEnd ?? s;
    model.setSelection(s, e);
  }

  input.addEventListener('beforeinput', (e) => {
    if (composing || e.isComposing || /Composition/.test(e.inputType)) return;
    if (!HANDLED.has(e.inputType)) return; // laissé au natif, réconcilié sur 'input'
    e.preventDefault();
    syncSelection();
    let res;
    switch (e.inputType) {
      case 'insertText': res = model.insert(e.data ?? '', { kind: 'type' }); break;
      case 'insertFromPaste':
      case 'insertFromDrop': res = model.insert(e.dataTransfer?.getData('text/plain') ?? e.data ?? '', { kind: 'paste' }); break;
      case 'deleteContentBackward': res = model.deleteBackward(); break;
      case 'deleteContentForward': res = model.deleteForward(); break;
      case 'deleteByCut': res = model.replace(model.selStart, model.selEnd, ''); break;
      case 'historyUndo': model.undo(); break;
      case 'historyRedo': model.redo(); break;
    }
    changed(res, e.inputType);
  });

  // Coller : certains navigateurs n'envoient pas dataTransfer dans beforeinput.
  input.addEventListener('paste', (e) => {
    if (composing) return;
    const t = e.clipboardData?.getData('text/plain');
    if (t == null) return;
    e.preventDefault();
    syncSelection();
    changed(model.insert(t, { kind: 'paste' }), 'paste');
  });

  // Tout ce qui n'a pas été intercepté (autocorrection, dictée, suppression par mot…)
  input.addEventListener('input', (e) => {
    if (composing || e.isComposing) {
      preview = normalizeName(input.value);
      onChange({ source: 'composition' });
      return;
    }
    const res = model.fromNative(input.value, input.selectionStart ?? input.value.length, input.selectionEnd ?? input.value.length);
    changed(res, 'native');
  });

  input.addEventListener('compositionstart', () => { composing = true; preview = model.text; });
  input.addEventListener('compositionupdate', () => { preview = normalizeName(input.value); onChange({ source: 'composition' }); });
  input.addEventListener('compositionend', () => {
    composing = false; preview = null;
    // la valeur finale arrive parfois après compositionend : on réconcilie au microtask suivant
    queueMicrotask(() => {
      const res = model.fromNative(input.value, input.selectionStart ?? input.value.length, input.selectionEnd ?? input.value.length);
      changed(res, 'compositionend');
    });
  });

  input.addEventListener('keydown', (e) => {
    if (e.isComposing || e.keyCode === 229) return; // Entrée/Échap pendant une composition : ignorés
    const mod = e.ctrlKey || e.metaKey;
    if (mod && !e.altKey && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault(); syncSelection();
      e.shiftKey ? model.redo() : model.undo();
      changed(null, e.shiftKey ? 'redo' : 'undo'); return;
    }
    if (mod && !e.altKey && (e.key === 'y' || e.key === 'Y')) {
      e.preventDefault(); model.redo(); changed(null, 'redo'); return;
    }
    if (e.key === 'Enter') { e.preventDefault(); onSubmit(); return; }
    if (e.key === 'Escape') { e.preventDefault(); onEscape(); return; }
  });

  for (const ev of ['select', 'keyup', 'pointerup', 'focus']) input.addEventListener(ev, syncSelection);
  document.addEventListener('selectionchange', () => { if (document.activeElement === input) syncSelection(); });

  // Soumission implicite (touche « OK » des claviers mobiles)
  input.form?.addEventListener('submit', (e) => { e.preventDefault(); if (!composing) onSubmit(); });

  return {
    get composing() { return composing; },
    // texte canonique à afficher (aperçu de composition inclus)
    get shownText() { return composing && preview != null ? preview : model.text; },
    refresh: writeBack,
  };
}
