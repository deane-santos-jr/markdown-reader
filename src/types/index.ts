export type ViewMode = 'write' | 'preview' | 'split';

export type DocumentFormat = 'neutral' | 'markdown' | 'text';

export type LineEnding = 'lf' | 'crlf';

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'conflict' | 'error';

export interface WriterDocument {
  content: string;
  title: string;
  fileName?: string;
  path?: string;
  handle?: unknown;
  format: DocumentFormat;
  lineEnding: LineEnding;
  hasBom: boolean;
  modifiedTime?: number;
  isDirty: boolean;
  saveStatus: SaveStatus;
  recovered?: boolean;
}

export interface RecentDocument {
  name: string;
  path: string;
  format: Exclude<DocumentFormat, 'neutral'>;
  openedAt: number;
}

export type ThemeId = 'typora-classic' | 'academic' | 'nord-night' | 'solarized-sepia' | 'monochrome' | 'cyber-dark';

export type FontFamily = 'inter' | 'newsreader' | 'jetbrains-mono' | 'system';

export interface TypographySettings {
  fontFamily: FontFamily;
  fontSize: number; // in px, e.g. 16
  lineHeight: number; // e.g. 1.6
  maxWidth: number; // in px, e.g. 860, or 0 for 100% full
  textAlign: 'left' | 'justify';
}

export interface DocumentMetadata {
  id: string;
  title: string;
  path?: string;
  lastModified: number;
  isDirty?: boolean;
}

export interface OutlineHeading {
  id: string;
  text: string;
  level: number;
  line?: number;
}

export interface DocumentStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  readingTimeMinutes: number;
  lines: number;
  headingsCount: number;
  linksCount: number;
  imagesCount: number;
  tablesCount: number;
  codeBlocksCount: number;
}

export interface WorkspaceFile {
  id: string;
  name: string;
  path: string;
  content?: string;
  isDir: boolean;
  children?: WorkspaceFile[];
  handle?: unknown;
}

export interface SearchMatch {
  index: number;
  text: string;
}
