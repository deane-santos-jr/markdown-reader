import type {
  DocumentFormat,
  LineEnding,
  RecentDocument,
  SaveStatus,
  WriterDocument,
} from '../types';

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const RECOVERY_STORAGE_KEY = 'writer_recovery_v1';
export const RECENTS_STORAGE_KEY = 'writer_recents_v1';
export const LEGACY_CONTENT_STORAGE_KEY = 'typora_doc_content';

const MARKDOWN_EXTENSIONS = new Set(['md', 'markdown', 'mdown', 'mkd']);

export interface RecoverySnapshot {
  content: string;
  title: string;
  fileName?: string;
  path?: string;
  format: DocumentFormat;
  lineEnding: LineEnding;
  hasBom: boolean;
  modifiedTime?: number;
  capturedAt: number;
}

export function formatFromName(name: string): DocumentFormat {
  const extension = name.split('.').pop()?.toLowerCase();
  if (extension === 'txt') return 'text';
  if (extension && MARKDOWN_EXTENSIONS.has(extension)) return 'markdown';
  return 'neutral';
}

export function titleFromName(name: string): string {
  const title = name.replace(/\.[^/.]+$/, '').replace(/[\r\n\t]/g, '').trim();
  return title.slice(0, 200) || 'Untitled';
}

export function detectLineEnding(content: string): LineEnding {
  return content.includes('\r\n') ? 'crlf' : 'lf';
}

export function normalizeContent(content: string): string {
  return content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
}

export function createUntitledDocument(): WriterDocument {
  return {
    content: '',
    title: 'Untitled',
    format: 'neutral',
    lineEnding: 'lf',
    hasBom: false,
    isDirty: false,
    saveStatus: 'saved',
  };
}

export function createOpenedDocument(input: {
  name: string;
  path?: string;
  content: string;
  handle?: unknown;
  modifiedTime?: number;
}): WriterDocument {
  return {
    content: normalizeContent(input.content),
    title: titleFromName(input.name),
    fileName: input.name,
    path: input.path,
    handle: input.handle,
    format: formatFromName(input.name),
    lineEnding: detectLineEnding(input.content),
    hasBom: input.content.startsWith('\uFEFF'),
    modifiedTime: input.modifiedTime,
    isDirty: false,
    saveStatus: 'saved',
  };
}

export function createRecoveredDocument(snapshot: RecoverySnapshot): WriterDocument {
  return {
    content: snapshot.content,
    title: snapshot.title,
    fileName: snapshot.fileName,
    path: snapshot.path,
    format: snapshot.format,
    lineEnding: snapshot.lineEnding,
    hasBom: snapshot.hasBom,
    modifiedTime: snapshot.modifiedTime,
    isDirty: true,
    saveStatus: 'unsaved',
    recovered: true,
  };
}

export function editDocument(document: WriterDocument, content: string): WriterDocument {
  if (content === document.content) return document;
  return {
    ...document,
    content,
    isDirty: true,
    saveStatus: 'unsaved',
  };
}

export function beginSaving(document: WriterDocument): WriterDocument {
  return { ...document, saveStatus: 'saving' };
}

export function finishSaving(
  document: WriterDocument,
  saved: { path: string; name: string; format: Exclude<DocumentFormat, 'neutral'>; handle?: unknown; modifiedTime?: number },
): WriterDocument {
  return {
    ...document,
    title: titleFromName(saved.name),
    fileName: saved.name,
    path: saved.path,
    handle: saved.handle ?? document.handle,
    format: saved.format,
    modifiedTime: saved.modifiedTime,
    isDirty: false,
    saveStatus: 'saved',
    recovered: false,
  };
}

export function failSaving(document: WriterDocument, status: Extract<SaveStatus, 'conflict' | 'error'>): WriterDocument {
  return { ...document, isDirty: true, saveStatus: status };
}

export function serializeDocument(document: WriterDocument): string {
  const content = document.lineEnding === 'crlf'
    ? document.content.replace(/\r?\n/g, '\r\n')
    : document.content.replace(/\r\n/g, '\n');
  return document.hasBom ? `\uFEFF${content}` : content;
}

export function needsSaveBeforeReplace(document: WriterDocument | null): boolean {
  if (!document) return false;
  return document.isDirty || document.saveStatus === 'conflict' || document.saveStatus === 'error';
}

export function createRecoverySnapshot(document: WriterDocument, capturedAt = Date.now()): RecoverySnapshot {
  return {
    content: document.content,
    title: document.title,
    fileName: document.fileName,
    path: document.path,
    format: document.format,
    lineEnding: document.lineEnding,
    hasBom: document.hasBom,
    modifiedTime: document.modifiedTime,
    capturedAt,
  };
}

export function addRecentDocument(
  recents: RecentDocument[],
  recent: RecentDocument,
  limit = 10,
): RecentDocument[] {
  return [recent, ...recents.filter((item) => item.path !== recent.path)]
    .sort((left, right) => right.openedAt - left.openedAt)
    .slice(0, limit);
}

export function extensionForFormat(format: Exclude<DocumentFormat, 'neutral'>): '.md' | '.txt' {
  return format === 'markdown' ? '.md' : '.txt';
}

export function ensureFormatExtension(
  name: string,
  format: Exclude<DocumentFormat, 'neutral'>,
): string {
  const extension = extensionForFormat(format);
  const withoutKnownExtension = name.replace(/\.(md|markdown|mdown|mkd|txt)$/i, '');
  return `${withoutKnownExtension || 'Untitled'}${extension}`;
}
