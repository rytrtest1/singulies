import { describe, it, expect } from 'vitest';
import { NameModel } from '../../src/input/model.js';

const mk = (t, s, e = s) => { const m = new NameModel(t); m.setSelection(s, e); return m; };

describe('NameModel', () => {
  it('insertion au milieu', () => {
    const m = mk('LA', 1); m.insert('E', { kind: 'type', now: 0 });
    expect([m.text, m.selStart, m.selEnd]).toEqual(['LEA', 2, 2]);
  });
  it('sélection + frappe remplace', () => {
    const m = mk('CLEA', 1, 3); m.insert('o', { kind: 'type', now: 0 });
    expect([m.text, m.selStart]).toEqual(['COA', 2]);
  });
  it('deleteBackward / deleteForward', () => {
    let m = mk('LEA', 2); m.deleteBackward(); expect([m.text, m.selStart]).toEqual(['LA', 1]);
    m = mk('LEA', 1); m.deleteForward(); expect([m.text, m.selStart]).toEqual(['LA', 1]);
    m = mk('LEA', 0); expect(m.deleteBackward().changed).toBe(false);
    m = mk('LEA', 3); expect(m.deleteForward().changed).toBe(false);
    m = mk('ABCDE', 1, 4); m.deleteBackward(); expect([m.text, m.selStart, m.selEnd]).toEqual(['AE', 1, 1]);
    m = mk('ABCDE', 1, 4); m.deleteForward(); expect([m.text, m.selStart]).toEqual(['AE', 1]);
  });
  it('collage 26 lettres -> 22 + truncated', () => {
    const m = new NameModel(); const r = m.insert('ABCDEFGHIJKLMNOPQRSTUVWXYZ', { kind: 'paste' });
    expect(m.text).toBe('ABCDEFGHIJKLMNOPQRSTUV'); expect(r.truncated).toBe(true);
  });
  it('dépassement au milieu : texte après le curseur conservé', () => {
    const m = mk('ABCDEFGHIJKLMNOPQRSTUV'.slice(0, 20), 5);
    const r = m.insert('XXXXX', { kind: 'paste' });
    expect(r.truncated).toBe(true);
    expect(m.text.length).toBe(22);
    expect(m.text).toBe('ABCDEXXFGHIJKLMNOPQRST');
    expect(m.text.endsWith('FGHIJKLMNOPQRST')).toBe(true);
    expect(m.selStart).toBe(7);
  });
  it('espace à côté d\'un espace -> fusion', () => {
    const m = mk('JEAN PIERRE', 5); m.insert(' ', { kind: 'type', now: 0 });
    expect(m.text).toBe('JEAN PIERRE');
    const m2 = mk('JEAN PIERRE', 4); m2.insert(' ');
    expect(m2.text).toBe('JEAN PIERRE');
  });
  it('annuler / rétablir', () => {
    const m = new NameModel();
    m.insert('A', { kind: 'type', now: 0 }); m.insert(' ', { kind: 'type', now: 10 }); m.insert('B', { kind: 'type', now: 20 });
    expect(m.text).toBe('A B');
    m.undo(); expect(m.text).toBe('A ');
    m.undo(); expect(m.text).toBe('A');
    m.undo(); expect(m.text).toBe('');
    expect(m.undo()).toBe(false);
    m.redo(); expect(m.text).toBe('A');
    m.redo(); m.redo(); expect(m.text).toBe('A B');
    expect(m.redo()).toBe(false);
  });
  it('frappe continue < 1 s fusionnée', () => {
    const m = new NameModel();
    'LEA'.split('').forEach((c, i) => m.insert(c, { kind: 'type', now: i * 200 }));
    expect(m.undoStack.length).toBe(1);
    m.undo(); expect(m.text).toBe('');
  });
  it('espace ou pause > 1 s coupe le groupe', () => {
    const m = new NameModel();
    m.insert('A', { kind: 'type', now: 0 }); m.insert('B', { kind: 'type', now: 100 });
    m.insert('C', { kind: 'type', now: 1500 });
    expect(m.undoStack.length).toBe(2);
    m.undo(); expect(m.text).toBe('AB');
    const n = new NameModel();
    n.insert('A', { kind: 'type', now: 0 }); n.insert(' ', { kind: 'type', now: 100 }); n.insert('B', { kind: 'type', now: 200 });
    n.undo(); expect(n.text).toBe('A ');
  });
  it('fromNative (IME) accent, curseur au milieu', () => {
    const m = new NameModel('LA');
    m.fromNative('Léa', 2);
    expect([m.text, m.selStart, m.selEnd]).toEqual(['LEA', 2, 2]);
    m.fromNative('Clémence', 3, 3);
    expect([m.text, m.selStart]).toEqual(['CLEMENCE', 3]);
  });
});

describe('NameModel : resynchronisation de sélection', () => {
  it('setSelection identique (keyup) ne coupe pas le groupe de frappe', () => {
    const m = new NameModel();
    'LEA'.split('').forEach((c, i) => { m.insert(c, { kind: 'type', now: i * 100 }); m.setSelection(m.selStart, m.selEnd); });
    expect(m.undoStack.length).toBe(1);
  });
});
