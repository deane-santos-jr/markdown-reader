import { describe, expect, it } from 'vitest';
import {
  addRecentDocument,
  createOpenedDocument,
  createRecoverySnapshot,
  createRecoveredDocument,
  createUntitledDocument,
  editDocument,
  ensureFormatExtension,
  failSaving,
  finishSaving,
  formatFromName,
  needsSaveBeforeReplace,
  serializeDocument,
} from './documentLifecycle';


describe('document lifecycle', () => {
  it('creates a neutral clean draft', () => {
    expect(createUntitledDocument()).toMatchObject({
      content: '',
      title: 'Untitled',
      format: 'neutral',
      isDirty: false,
      saveStatus: 'saved',
    });
  });

  it('recognizes supported document formats', () => {
    expect(formatFromName('draft.txt')).toBe('text');
    expect(formatFromName('draft.markdown')).toBe('markdown');
    expect(formatFromName('draft.json')).toBe('neutral');
  });

  it('normalizes editing content while retaining file fidelity', () => {
    const document = createOpenedDocument({
      name: 'draft.txt',
      path: '/draft.txt',
      content: '\uFEFFfirst\r\nsecond\r\n',
    });

    expect(document.content).toBe('first\nsecond\n');
    expect(document.lineEnding).toBe('crlf');
    expect(document.hasBom).toBe(true);
    expect(serializeDocument(document)).toBe('\uFEFFfirst\r\nsecond\r\n');
  });

  it('marks edits as unsaved and completed saves as clean', () => {
    const edited = editDocument(createUntitledDocument(), 'A first line');
    const saved = finishSaving(edited, {
      path: '/A first line.txt',
      name: 'A first line.txt',
      format: 'text',
      modifiedTime: 12,
    });

    expect(needsSaveBeforeReplace(edited)).toBe(true);
    expect(saved).toMatchObject({
      title: 'A first line',
      format: 'text',
      isDirty: false,
      saveStatus: 'saved',
      modifiedTime: 12,
    });
  });

  it('restores recovery as an unsaved draft associated with the disk version', () => {
    const original = editDocument(createOpenedDocument({
      name: 'draft.md',
      path: '/draft.md',
      content: '# Draft',
      modifiedTime: 7,
    }), '# Recovered');
    const recovered = createRecoveredDocument(createRecoverySnapshot(original, 10));

    expect(recovered).toMatchObject({
      path: '/draft.md',
      content: '# Recovered',
      isDirty: true,
      saveStatus: 'unsaved',
      recovered: true,
    });
    expect(recovered.modifiedTime).toBe(7);
  });

  it('keeps conflicted content dirty until the user resolves it', () => {
    const edited = editDocument(createOpenedDocument({
      name: 'draft.md',
      path: '/draft.md',
      content: '# Original',
      modifiedTime: 4,
    }), '# Local edit');

    expect(failSaving(edited, 'conflict')).toMatchObject({
      content: '# Local edit',
      isDirty: true,
      saveStatus: 'conflict',
      modifiedTime: 4,
    });
  });

  it('enforces the extension selected in Save As', () => {
    expect(ensureFormatExtension('draft.txt', 'markdown')).toBe('draft.md');
    expect(ensureFormatExtension('draft', 'text')).toBe('draft.txt');
  });

  it('deduplicates and limits recent files', () => {
    const recents = addRecentDocument([
      { name: 'Old', path: '/same.md', format: 'markdown', openedAt: 1 },
      { name: 'Other', path: '/other.txt', format: 'text', openedAt: 2 },
    ], { name: 'New', path: '/same.md', format: 'markdown', openedAt: 3 }, 2);

    expect(recents.map((recent) => recent.name)).toEqual(['New', 'Other']);
  });
});
