// Modèle de saisie : source de vérité (texte canonique, sélection, historique).
// Le champ natif ne fait que transmettre les intentions ; il est réécrit d'après ce modèle.
import { MAX_LEN, cleanFragment } from '../text/normalize.js';

const collapse = (s) => s.replace(/ {2,}/g, ' ').replace(/^ /, '');
const COALESCE_MS = 1000;

export class NameModel {
  constructor(text = '') {
    this.text = collapse(cleanFragment(text)).slice(0, MAX_LEN);
    this.selStart = this.selEnd = this.text.length;
    this.undoStack = [];
    this.redoStack = [];
    this._group = null; // { at, caret } pour fusionner une frappe continue
  }

  snapshot() { return { text: this.text, selStart: this.selStart, selEnd: this.selEnd }; }
  _restore(s) { this.text = s.text; this.selStart = s.selStart; this.selEnd = s.selEnd; }

  _record(kind, now) {
    const g = this._group;
    const merge = kind === 'type' && g && now - g.at < COALESCE_MS && g.caret === this.selStart && this.selStart === this.selEnd;
    if (!merge) this.undoStack.push(this.snapshot());
    if (this.undoStack.length > 200) this.undoStack.shift();
    this.redoStack.length = 0;
    return merge;
  }

  setSelection(start, end = start) {
    const n = this.text.length;
    const a = Math.max(0, Math.min(n, start | 0)), b = Math.max(0, Math.min(n, end | 0));
    const lo = Math.min(a, b), hi = Math.max(a, b);
    // resynchronisation sans changement (keyup, selectionchange) : ne coupe pas le groupe de frappe
    if (lo !== this.selStart || hi !== this.selEnd) this._group = null;
    this.selStart = lo; this.selEnd = hi;
  }

  // Remplace [start,end) par raw (non normalisé). Retourne { changed, truncated }.
  replace(start, end, raw, { kind = 'edit', now = performance.now() } = {}) {
    const before = this.text.slice(0, start), after = this.text.slice(end);
    let ins = cleanFragment(raw);
    let truncated = false;
    if (collapse(before + ins + after).length > MAX_LEN) {
      truncated = true;
      while (ins.length && collapse(before + ins + after).length > MAX_LEN) ins = ins.slice(0, -1);
      // cas limite : le texte restant dépasse déjà (ne devrait pas arriver, texte toujours normalisé)
    }
    const next = collapse(before + ins + after).slice(0, MAX_LEN);
    const caret = Math.min(next.length, collapse(before + ins).length);
    if (next === this.text && caret === this.selStart && caret === this.selEnd) return { changed: false, truncated };
    this._record(ins.includes(' ') ? 'edit' : kind, now);
    this.text = next;
    this.selStart = this.selEnd = caret;
    this._group = kind === 'type' && !ins.includes(' ') ? { at: now, caret } : null;
    return { changed: true, truncated };
  }

  insert(raw, opts) { return this.replace(this.selStart, this.selEnd, raw, opts); }

  deleteBackward() {
    if (this.selStart !== this.selEnd) return this.replace(this.selStart, this.selEnd, '');
    if (this.selStart === 0) return { changed: false, truncated: false };
    return this.replace(this.selStart - 1, this.selStart, '');
  }

  deleteForward() {
    if (this.selStart !== this.selEnd) return this.replace(this.selStart, this.selEnd, '');
    if (this.selEnd >= this.text.length) return { changed: false, truncated: false };
    return this.replace(this.selEnd, this.selEnd + 1, '');
  }

  // Réconciliation après une modification native (IME, dictée, autocorrection…).
  fromNative(value, selStart, selEnd = selStart) {
    const cleaned = collapse(cleanFragment(value));
    const truncated = cleaned.length > MAX_LEN;
    const next = cleaned.slice(0, MAX_LEN);
    const map = (i) => Math.min(next.length, collapse(cleanFragment(value.slice(0, i))).length);
    const s = map(selStart), e = map(selEnd);
    if (next !== this.text) { this._record('edit', 0); this._group = null; }
    this.text = next;
    this.selStart = Math.min(s, e); this.selEnd = Math.max(s, e);
    return { changed: true, truncated };
  }

  undo() {
    if (!this.undoStack.length) return false;
    this.redoStack.push(this.snapshot());
    this._restore(this.undoStack.pop());
    this._group = null;
    return true;
  }

  redo() {
    if (!this.redoStack.length) return false;
    this.undoStack.push(this.snapshot());
    this._restore(this.redoStack.pop());
    this._group = null;
    return true;
  }

  clear() { if (this.text) { this._record('edit', 0); } this.text = ''; this.selStart = this.selEnd = 0; this._group = null; }
}
