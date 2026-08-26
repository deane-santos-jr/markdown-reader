import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { FileUp, X } from 'lucide-react';
import { EditorView } from './components/EditorView';
import { HeaderToolbar } from './components/HeaderToolbar';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { SearchModal } from './components/modals/SearchModal';
import { Sidebar } from './components/Sidebar';
import { StartScreen } from './components/StartScreen';
import { ConflictDialog, FormatDialog, UnsavedDialog } from './components/WriterDialogs';
import { parseFrontmatter } from './utils/frontmatterParser';
import { extractOutline } from './utils/outlineExtractor';
import { calculateDocumentStats } from './utils/statsCalculator';
import {
  addRecentDocument,
  beginSaving,
  createOpenedDocument,
  createRecoveredDocument,
  createRecoverySnapshot,
  createUntitledDocument,
  editDocument,
  failSaving,
  finishSaving,
  LEGACY_CONTENT_STORAGE_KEY,
  MAX_DOCUMENT_BYTES,
  needsSaveBeforeReplace,
  RECENTS_STORAGE_KEY,
  RECOVERY_STORAGE_KEY,
  serializeDocument,
  type RecoverySnapshot,
} from './utils/documentLifecycle';
import {
  openDirectoryPicker,
  openFilePicker,
  readBrowserFile,
  readFileHandle,
  readWorkspaceFile,
  saveAsFile,
  saveToFileHandle,
  type OpenedFileResult,
  type SaveFileResult,
} from './utils/fileSystem';
import {
  copyFormattedHtmlToClipboard,
  downloadMarkdown,
  downloadPlainText,
  exportStandaloneHTML,
  printDocument,
} from './utils/exportUtils';
import type {
  DocumentFormat,
  RecentDocument,
  ThemeId,
  TypographySettings,
  ViewMode,
  WorkspaceFile,
  WriterDocument,
} from './types';
import './styles/theme-tokens.css';
import './styles/markdown.css';
import './styles/app.css';
import './styles/writer.css';

const CommandPaletteModal = React.lazy(() =>
  import('./components/modals/CommandPaletteModal').then((module) => ({ default: module.CommandPaletteModal })),
);
const ExportModal = React.lazy(() =>
  import('./components/modals/ExportModal').then((module) => ({ default: module.ExportModal })),
);
const CustomCssModal = React.lazy(() =>
  import('./components/modals/CustomCssModal').then((module) => ({ default: module.CustomCssModal })),
);
const LightboxModal = React.lazy(() =>
  import('./components/modals/LightboxModal').then((module) => ({ default: module.LightboxModal })),
);

const MAX_CUSTOM_CSS_SIZE = 50 * 1024;

function sanitizeCustomCss(css: string): string {
  return css
    .slice(0, MAX_CUSTOM_CSS_SIZE)
    .replace(/<\/?[^>]+>/g, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/expression\s*\(/gi, '')
    .replace(/@import\s+url\s*\(\s*['"]?\s*javascript:[^)]*\)/gi, '')
    .replace(/behavior\s*:/gi, '')
    .replace(/-moz-binding\s*:/gi, '');
}

function readStoredValue<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function loadRecovery(): RecoverySnapshot | null {
  const stored = readStoredValue<RecoverySnapshot | null>(RECOVERY_STORAGE_KEY, null);
  if (stored?.content !== undefined) return stored;
  const legacyContent = localStorage.getItem(LEGACY_CONTENT_STORAGE_KEY);
  if (!legacyContent) return null;
  const snapshot: RecoverySnapshot = {
    content: legacyContent,
    title: 'Recovered document',
    format: 'neutral',
    lineEnding: legacyContent.includes('\r\n') ? 'crlf' : 'lf',
    hasBom: legacyContent.startsWith('\uFEFF'),
    capturedAt: Date.now(),
  };
  localStorage.setItem(RECOVERY_STORAGE_KEY, JSON.stringify(snapshot));
  localStorage.removeItem(LEGACY_CONTENT_STORAGE_KEY);
  return snapshot;
}

function getSearchMatches(content: string, query: string, caseSensitive: boolean): number[] {
  if (!query) return [];
  const haystack = caseSensitive ? content : content.toLocaleLowerCase();
  const needle = caseSensitive ? query : query.toLocaleLowerCase();
  const matches: number[] = [];
  let start = 0;
  while (start <= haystack.length - needle.length) {
    const match = haystack.indexOf(needle, start);
    if (match < 0) break;
    matches.push(match);
    start = match + Math.max(needle.length, 1);
  }
  return matches;
}

function downloadDocumentCopy(document: WriterDocument) {
  if (document.format === 'text') {
    downloadPlainText(serializeDocument(document), `${document.title}.txt`);
    return;
  }
  downloadMarkdown(serializeDocument(document), `${document.title}.md`);
}

export function App() {
  const [activeDocument, setActiveDocument] = useState<WriterDocument | null>(null);
  const [recovery, setRecovery] = useState<RecoverySnapshot | null>(() => loadRecovery());
  const [recents, setRecents] = useState<RecentDocument[]>(() => readStoredValue(RECENTS_STORAGE_KEY, []));
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFile[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('write');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [zenMode, setZenMode] = useState(false);
  const [fontMode, setFontMode] = useState<'proportional' | 'monospace'>('proportional');
  const [wrap, setWrap] = useState(true);
  const [selectionText, setSelectionText] = useState('');
  const [activeHeadingId, setActiveHeadingId] = useState('');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [customCssModalOpen, setCustomCssModalOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt?: string } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [formatDialogOpen, setFormatDialogOpen] = useState(false);
  const [selectedSaveFormat, setSelectedSaveFormat] = useState<Exclude<DocumentFormat, 'neutral'>>('markdown');
  const [conflictOpen, setConflictOpen] = useState(false);
  const formatResolver = useRef<((format: Exclude<DocumentFormat, 'neutral'> | null) => void) | null>(null);
  const replacementRequestRef = useRef<(action: () => void) => void>(() => undefined);
  const canvasRef = useRef<HTMLDivElement>(null);

  const [currentTheme, setCurrentTheme] = useState<ThemeId>(() =>
    (localStorage.getItem('typora_theme') as ThemeId) || 'typora-classic',
  );
  const [typography, setTypography] = useState<TypographySettings>(() => readStoredValue('typora_typography', {
    fontFamily: 'inter',
    fontSize: 16,
    lineHeight: 1.7,
    maxWidth: 860,
    textAlign: 'left',
  }));
  const [customCss, setCustomCss] = useState(() => sanitizeCustomCss(localStorage.getItem('typora_custom_css') || ''));

  const isMarkdown = activeDocument?.format === 'markdown';
  const parsedDocument = useMemo(() => {
    if (!activeDocument || !isMarkdown) return { body: activeDocument?.content || '', frontmatter: {} };
    return parseFrontmatter(activeDocument.content);
  }, [activeDocument, isMarkdown]);
  const outline = useMemo(
    () => isMarkdown ? extractOutline(parsedDocument.body) : [],
    [isMarkdown, parsedDocument.body],
  );
  const stats = useMemo(
    () => calculateDocumentStats(activeDocument?.content || ''),
    [activeDocument?.content],
  );
  const selectionStats = useMemo(() => calculateDocumentStats(selectionText), [selectionText]);
  const searchMatches = useMemo(
    () => getSearchMatches(activeDocument?.content || '', searchQuery, caseSensitive),
    [activeDocument?.content, caseSensitive, searchQuery],
  );
  const searchTarget = searchMatches.length > 0
    ? { index: searchMatches[Math.min(searchMatchIndex, searchMatches.length - 1)], length: searchQuery.length }
    : undefined;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('typora_theme', currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    localStorage.setItem('typora_typography', JSON.stringify(typography));
    document.documentElement.style.setProperty('--font-size-base', `${typography.fontSize}px`);
    document.documentElement.style.setProperty('--line-height-base', String(typography.lineHeight));
    document.documentElement.style.setProperty('--content-max-width', `${typography.maxWidth}px`);
    document.documentElement.style.setProperty('--content-text-align', typography.textAlign);
    const fonts = {
      inter: 'var(--font-sans)',
      newsreader: 'var(--font-serif)',
      'jetbrains-mono': 'var(--font-mono)',
      system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    };
    document.documentElement.style.setProperty('--font-active', fonts[typography.fontFamily]);
  }, [typography]);

  useEffect(() => {
    const sanitized = sanitizeCustomCss(customCss);
    if (sanitized !== customCss) setCustomCss(sanitized);
    else localStorage.setItem('typora_custom_css', sanitized);
  }, [customCss]);

  useEffect(() => {
    localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(recents));
  }, [recents]);

  useEffect(() => {
    if (!activeDocument?.isDirty || !activeDocument.content) return;
    const timer = window.setTimeout(() => {
      const snapshot = createRecoverySnapshot(activeDocument);
      localStorage.setItem(RECOVERY_STORAGE_KEY, JSON.stringify(snapshot));
      setRecovery(snapshot);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [activeDocument]);

  useEffect(() => {
    if (!activeDocument || activeDocument.format === 'markdown') return;
    setViewMode('write');
  }, [activeDocument]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (window.electronAPI || !needsSaveBeforeReplace(activeDocument)) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [activeDocument]);

  const clearRecovery = () => {
    localStorage.removeItem(RECOVERY_STORAGE_KEY);
    setRecovery(null);
  };

  const addRecent = (document: WriterDocument) => {
    if (!window.electronAPI || !document.path || document.format === 'neutral') return;
    const format = document.format;
    setRecents((current) => addRecentDocument(current, {
      name: document.fileName || `${document.title}.${format === 'markdown' ? 'md' : 'txt'}`,
      path: document.path!,
      format,
      openedAt: Date.now(),
    }));
  };

  const activateOpenedFile = (opened: OpenedFileResult) => {
    const document = createOpenedDocument(opened);
    setActiveDocument(document);
    setViewMode('write');
    setSelectionText('');
    setMessage(null);
    addRecent(document);
  };

  const requestFormat = (initial: Exclude<DocumentFormat, 'neutral'>) => {
    setSelectedSaveFormat(initial);
    setFormatDialogOpen(true);
    return new Promise<Exclude<DocumentFormat, 'neutral'> | null>((resolve) => {
      formatResolver.current = resolve;
    });
  };

  const resolveFormat = (format: Exclude<DocumentFormat, 'neutral'> | null) => {
    setFormatDialogOpen(false);
    formatResolver.current?.(format);
    formatResolver.current = null;
  };

  const applySaveResult = (snapshot: WriterDocument, format: Exclude<DocumentFormat, 'neutral'>, result: SaveFileResult) => {
    if (result.status === 'conflict') {
      setActiveDocument((current) => current ? failSaving(current, 'conflict') : current);
      setConflictOpen(true);
      return false;
    }
    if (result.status !== 'saved' || !result.path || !result.name) {
      if (result.status === 'error') {
        setActiveDocument((current) => current ? failSaving(current, 'error') : current);
        setMessage('The document could not be saved. Your recovery draft is still available.');
      } else {
        setActiveDocument((current) => current ? {
          ...current,
          saveStatus: current.isDirty ? 'unsaved' : 'saved',
        } : current);
      }
      return false;
    }
    const savedSnapshot = finishSaving(snapshot, {
      path: result.path,
      name: result.name,
      format,
      handle: result.handle,
      modifiedTime: result.modifiedTime,
    });
    setActiveDocument((current) => {
      if (!current || current.content === snapshot.content) return savedSnapshot;
      return { ...current, path: savedSnapshot.path, title: savedSnapshot.title, fileName: savedSnapshot.fileName, format, handle: savedSnapshot.handle, modifiedTime: savedSnapshot.modifiedTime };
    });
    clearRecovery();
    addRecent(savedSnapshot);
    return true;
  };

  const saveExisting = async (snapshot: WriterDocument, overwrite = false) => {
    if (!snapshot.path || snapshot.format === 'neutral') return false;
    setActiveDocument((current) => current ? beginSaving(current) : current);
    let result: SaveFileResult;
    if (window.electronAPI) {
      result = await window.electronAPI.saveFile({
        path: snapshot.path,
        content: serializeDocument(snapshot),
        expectedModifiedTime: snapshot.modifiedTime,
        overwrite,
      });
    } else if (snapshot.handle) {
      result = await saveToFileHandle(
        serializeDocument(snapshot),
        snapshot.handle,
        snapshot.modifiedTime,
        overwrite,
      );
    } else {
      return false;
    }
    return applySaveResult(snapshot, snapshot.format, result);
  };

  const saveAs = async (snapshot: WriterDocument) => {
    const initial = snapshot.format === 'neutral' ? 'markdown' : snapshot.format;
    const format = await requestFormat(initial);
    if (!format) return false;
    const namedSnapshot = { ...snapshot, format };
    setActiveDocument((current) => current ? beginSaving(current) : current);
    const result = window.electronAPI
      ? await window.electronAPI.saveFileAs({
          content: serializeDocument(namedSnapshot),
          format,
          suggestedName: snapshot.title,
        })
      : await saveAsFile(serializeDocument(namedSnapshot), format, snapshot.title);
    return applySaveResult(snapshot, format, result);
  };

  const handleSave = async () => {
    if (!activeDocument) return false;
    if (activeDocument.format === 'neutral' || !activeDocument.path || (!window.electronAPI && !activeDocument.handle)) {
      return saveAs(activeDocument);
    }
    return saveExisting(activeDocument);
  };

  const handleSaveAs = async () => {
    if (!activeDocument) return false;
    return saveAs(activeDocument);
  };

  useEffect(() => {
    if (!activeDocument?.isDirty || activeDocument.recovered || !activeDocument.path) return;
    if (!window.electronAPI && !activeDocument.handle) return;
    const snapshot = activeDocument;
    const timer = window.setTimeout(() => void saveExisting(snapshot), 600);
    return () => window.clearTimeout(timer);
  }, [activeDocument]);

  const requestDocumentReplacement = (action: () => void) => {
    if (needsSaveBeforeReplace(activeDocument)) {
      setPendingAction(() => action);
      return;
    }
    action();
  };
  replacementRequestRef.current = requestDocumentReplacement;

  const handleNewDocument = () => requestDocumentReplacement(() => {
    setActiveDocument(createUntitledDocument());
    setViewMode('write');
    setMessage(null);
  });

  const handleOpenFile = () => requestDocumentReplacement(() => {
    void (async () => {
      try {
        if (window.electronAPI) {
          const result = await window.electronAPI.openFileDialog();
          if (!result) return;
          if (result.error) throw new Error(result.error);
          activateOpenedFile(result);
        } else {
          const result = await openFilePicker();
          if (result) activateOpenedFile(result);
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Unable to open this file');
      }
    })();
  });

  const handleOpenRecent = (recent: RecentDocument) => requestDocumentReplacement(() => {
    void (async () => {
      if (!window.electronAPI) return;
      const result = await window.electronAPI.readFile(recent.path);
      if (result.error) {
        setRecents((current) => current.filter((item) => item.path !== recent.path));
        setMessage(result.error);
        return;
      }
      activateOpenedFile(result);
    })();
  });

  useEffect(() => {
    if (!window.electronAPI) return;
    return window.electronAPI.onFileOpened((file) => {
      replacementRequestRef.current(() => activateOpenedFile(file));
    });
  }, []);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;
    return api.onCloseRequested(() => {
      replacementRequestRef.current(() => {
        clearRecovery();
        void api.confirmClose();
      });
    });
  }, []);

  const handleOpenFolder = async () => {
    try {
      const result = window.electronAPI
        ? await window.electronAPI.openFolderDialog()
        : await openDirectoryPicker();
      if (result && !Array.isArray(result)) throw new Error(result.error);
      if (result) {
        setWorkspaceFiles(result);
        setSidebarOpen(true);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to open this folder');
    }
  };

  const handleSelectWorkspaceFile = (file: WorkspaceFile) => requestDocumentReplacement(() => {
    void (async () => {
      try {
        if (window.electronAPI) {
          const opened = await window.electronAPI.readFile(file.path);
          if (opened.error) throw new Error(opened.error);
          activateOpenedFile(opened);
        } else {
          activateOpenedFile(await readWorkspaceFile(file));
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Unable to open workspace file');
      }
    })();
  });

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = Array.from(event.dataTransfer.files).find((candidate) => /\.(md|markdown|mdown|mkd|txt)$/i.test(candidate.name));
    if (!file) {
      setMessage('Choose a Markdown or plain-text file.');
      return;
    }
    requestDocumentReplacement(() => {
      void (async () => {
        try {
          activateOpenedFile({ name: file.name, path: file.name, content: await readBrowserFile(file), modifiedTime: file.lastModified });
        } catch (error) {
          setMessage(error instanceof Error ? error.message : 'Unable to open dropped file');
        }
      })();
    });
  };

  const handleContentChange = (content: string) => {
    if (!activeDocument) return;
    if (content.includes('\0')) {
      setMessage('Binary NUL characters are not supported. The latest input was not applied.');
      return;
    }
    const mightExceedByteLimit = content.length > MAX_DOCUMENT_BYTES / 3;
    if (content.length > MAX_DOCUMENT_BYTES || (mightExceedByteLimit && new TextEncoder().encode(content).length > MAX_DOCUMENT_BYTES)) {
      setMessage('Documents are limited to 5 MB. The latest input was not applied.');
      return;
    }
    setActiveDocument(editDocument(activeDocument, content));
  };

  const handleUnsavedSave = async () => {
    const saved = await handleSave();
    if (!saved || !pendingAction) return;
    const action = pendingAction;
    setPendingAction(null);
    action();
  };

  const handleDiscard = () => {
    clearRecovery();
    const action = pendingAction;
    setPendingAction(null);
    action?.();
  };

  const reloadConflict = async () => {
    if (!activeDocument?.path) return;
    try {
      const opened = window.electronAPI
        ? await window.electronAPI.readFile(activeDocument.path)
        : await readFileHandle(activeDocument.handle, activeDocument.path);
      if ('error' in opened && opened.error) throw new Error(opened.error);
      activateOpenedFile(opened);
      setConflictOpen(false);
      clearRecovery();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to reload the file');
    }
  };

  const overwriteConflict = async () => {
    if (!activeDocument) return;
    const saved = await saveExisting(activeDocument, true);
    if (saved) setConflictOpen(false);
  };

  const saveConflictCopy = async () => {
    if (!activeDocument) return;
    const saved = await saveAs(activeDocument);
    if (saved) setConflictOpen(false);
  };

  const restoreRecovery = () => {
    if (!recovery) return;
    setActiveDocument(createRecoveredDocument(recovery));
    setViewMode('write');
  };

  const handleNextSearchMatch = () => {
    if (!searchMatches.length) return;
    setSearchMatchIndex((index) => (index + 1) % searchMatches.length);
  };

  const handlePreviousSearchMatch = () => {
    if (!searchMatches.length) return;
    setSearchMatchIndex((index) => (index - 1 + searchMatches.length) % searchMatches.length);
  };

  const replaceCurrent = () => {
    if (!activeDocument || !searchMatches.length) return;
    const index = searchMatches[Math.min(searchMatchIndex, searchMatches.length - 1)];
    handleContentChange(activeDocument.content.slice(0, index) + replacement + activeDocument.content.slice(index + searchQuery.length));
  };

  const replaceAll = () => {
    if (!activeDocument || !searchQuery) return;
    const flags = caseSensitive ? 'g' : 'gi';
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    handleContentChange(activeDocument.content.replace(new RegExp(escaped, flags), () => replacement));
    setSearchMatchIndex(0);
  };

  const openSearch = () => {
    setViewMode('write');
    setSearchModalOpen(true);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const commandKey = event.metaKey || event.ctrlKey;
      if (commandKey && event.shiftKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void handleSaveAs();
      } else if (commandKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void handleSave();
      } else if (commandKey && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        handleOpenFile();
      } else if (commandKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        handleNewDocument();
      } else if (commandKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        openSearch();
      } else if (commandKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandPaletteOpen((open) => !open);
      } else if (commandKey && event.key === '1') {
        event.preventDefault();
        setViewMode('write');
      } else if (commandKey && event.key === '2' && isMarkdown) {
        event.preventDefault();
        setViewMode('preview');
      } else if (commandKey && event.key === '3' && isMarkdown) {
        event.preventDefault();
        setViewMode('split');
      } else if (commandKey && event.key === '\\') {
        event.preventDefault();
        setSidebarOpen((open) => !open);
      } else if (event.key === 'F11') {
        event.preventDefault();
        setZenMode((enabled) => !enabled);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleHeadingClick = (id: string) => {
    const element = document.getElementById(id) || document.getElementById(`user-content-${id}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveHeadingId(id);
  };

  const handleToggleTask = (taskIndex: number) => {
    if (!activeDocument || !isMarkdown) return;
    let currentTask = 0;
    let inCodeBlock = false;
    const content = activeDocument.content.split('\n').map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inCodeBlock = !inCodeBlock;
        return line;
      }
      if (inCodeBlock || !/- \[[ xX]\]/.test(line)) return line;
      if (currentTask++ !== taskIndex) return line;
      return line.replace(/- \[[ xX]\]/, (task) => /[xX]/.test(task) ? '- [ ]' : '- [x]');
    }).join('\n');
    handleContentChange(content);
  };

  const sanitizedCss = useMemo(() => sanitizeCustomCss(customCss), [customCss]);

  if (!activeDocument) {
    return (
      <div className="app-container">
        {sanitizedCss && <style dangerouslySetInnerHTML={{ __html: sanitizedCss }} />}
        {message && <div className="app-message"><span>{message}</span><button onClick={() => setMessage(null)}><X size={14} /></button></div>}
        <StartScreen
          recents={recents}
          recovery={recovery}
          onNew={() => setActiveDocument(createUntitledDocument())}
          onOpen={handleOpenFile}
          onOpenRecent={handleOpenRecent}
          onRemoveRecent={(path) => setRecents((current) => current.filter((recent) => recent.path !== path))}
          onClearRecents={() => setRecents([])}
          onRestore={restoreRecovery}
          onDiscardRecovery={clearRecovery}
        />
      </div>
    );
  }

  return (
    <div
      className={`app-container ${zenMode ? 'zen-mode' : ''}`}
      onDragOver={(event) => { event.preventDefault(); setIsDragOver(true); }}
      onDragLeave={(event) => { event.preventDefault(); setIsDragOver(false); }}
      onDrop={handleDrop}
    >
      {sanitizedCss && <style dangerouslySetInnerHTML={{ __html: sanitizedCss }} />}
      {message && <div className="app-message"><span>{message}</span><button onClick={() => setMessage(null)}><X size={14} /></button></div>}
      {isDragOver && <div className="dropzone-overlay"><FileUp size={42} /><strong>Drop a Markdown or text file</strong></div>}

      {!zenMode && (
        <HeaderToolbar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          documentTitle={activeDocument.title}
          saveStatus={activeDocument.saveStatus}
          format={activeDocument.format}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          zenMode={zenMode}
          onToggleZenMode={() => setZenMode(!zenMode)}
          onOpenSearch={openSearch}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onNewDocument={handleNewDocument}
          onOpenFile={handleOpenFile}
          onSave={() => void handleSave()}
          onSaveAs={() => void handleSaveAs()}
          onOpenExportModal={() => setExportModalOpen(true)}
          currentTheme={currentTheme}
          onThemeChange={setCurrentTheme}
        />
      )}

      <SearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        query={searchQuery}
        onQueryChange={(query) => { setSearchQuery(query); setSearchMatchIndex(0); }}
        replacement={replacement}
        onReplacementChange={setReplacement}
        caseSensitive={caseSensitive}
        onToggleCaseSensitive={() => { setCaseSensitive(!caseSensitive); setSearchMatchIndex(0); }}
        matchIndex={searchMatchIndex}
        totalMatches={searchMatches.length}
        onNextMatch={handleNextSearchMatch}
        onPrevMatch={handlePreviousSearchMatch}
        onReplace={replaceCurrent}
        onReplaceAll={replaceAll}
      />

      <main className="app-workspace">
        {!zenMode && (
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            headings={outline}
            activeHeadingId={activeHeadingId}
            onHeadingClick={handleHeadingClick}
            stats={stats}
            files={workspaceFiles}
            activeFilePath={activeDocument.path}
            onSelectFile={handleSelectWorkspaceFile}
            onOpenFolder={handleOpenFolder}
            currentTheme={currentTheme}
            onThemeChange={setCurrentTheme}
            typography={typography}
            onTypographyChange={setTypography}
            onOpenCustomCss={() => setCustomCssModalOpen(true)}
            format={activeDocument.format}
          />
        )}

        {viewMode === 'write' && (
          <div className="canvas-wrapper">
            <EditorView
              content={activeDocument.content}
              format={activeDocument.format}
              onChange={handleContentChange}
              onSave={() => void handleSave()}
              onSelectionChange={setSelectionText}
              onToggleFont={() => setFontMode((mode) => mode === 'proportional' ? 'monospace' : 'proportional')}
              onToggleWrap={() => setWrap(!wrap)}
              fontMode={fontMode}
              wrap={wrap}
              searchTarget={searchTarget}
            />
          </div>
        )}

        {viewMode === 'preview' && isMarkdown && (
          <div ref={canvasRef} className="canvas-wrapper">
            <MarkdownRenderer
              content={parsedDocument.body}
              frontmatter={parsedDocument.frontmatter}
              onImageClick={(src, alt) => setLightboxImage({ src, alt })}
              onToggleTask={handleToggleTask}
            />
          </div>
        )}

        {viewMode === 'split' && isMarkdown && (
          <div className="split-view-container">
            <div className="split-pane-editor">
              <EditorView
                content={activeDocument.content}
                format={activeDocument.format}
                onChange={handleContentChange}
                onSave={() => void handleSave()}
                onSelectionChange={setSelectionText}
                onToggleFont={() => setFontMode((mode) => mode === 'proportional' ? 'monospace' : 'proportional')}
                onToggleWrap={() => setWrap(!wrap)}
                fontMode={fontMode}
                wrap={wrap}
                searchTarget={searchTarget}
                isSplit
              />
            </div>
            <div ref={canvasRef} className="split-pane-preview">
              <MarkdownRenderer
                content={parsedDocument.body}
                frontmatter={parsedDocument.frontmatter}
                onImageClick={(src, alt) => setLightboxImage({ src, alt })}
                onToggleTask={handleToggleTask}
              />
            </div>
          </div>
        )}
      </main>

      {activeDocument.format === 'text' && <pre className="plain-print-content">{activeDocument.content}</pre>}

      {!zenMode && (
        <footer className="app-status-bar no-print">
          <div className="status-left">
            <span>{stats.words.toLocaleString()} words</span>
            <span>•</span>
            <span>{stats.characters.toLocaleString()} characters</span>
            {selectionText && <><span>•</span><span>{selectionStats.words.toLocaleString()} selected words</span></>}
          </div>
          <div className="status-right">
            <button className="status-item status-button" onClick={() => setWrap(!wrap)}>{wrap ? 'Wrap' : 'No wrap'}</button>
            <span>•</span>
            <span>{activeDocument.lineEnding.toUpperCase()}</span>
            <span>•</span>
            <span>UTF-8{activeDocument.hasBom ? ' BOM' : ''}</span>
            <span>•</span>
            <span>{activeDocument.format === 'markdown' ? 'Markdown' : activeDocument.format === 'text' ? 'Plain text' : 'Draft'}</span>
          </div>
        </footer>
      )}

      <Suspense fallback={null}>
        {commandPaletteOpen && (
          <CommandPaletteModal
            isOpen={commandPaletteOpen}
            format={activeDocument.format}
            onClose={() => setCommandPaletteOpen(false)}
            onViewModeChange={setViewMode}
            onNewDocument={handleNewDocument}
            onOpenFile={handleOpenFile}
            onSave={() => void handleSave()}
            onSaveAs={() => void handleSaveAs()}
            onThemeChange={setCurrentTheme}
          />
        )}
        {exportModalOpen && (
          <ExportModal
            isOpen={exportModalOpen}
            format={activeDocument.format}
            onClose={() => setExportModalOpen(false)}
            onPrint={printDocument}
            onExportHtml={() => exportStandaloneHTML(activeDocument.content, activeDocument.title)}
            onCopyFormatted={() => copyFormattedHtmlToClipboard(activeDocument.content)}
            onCopyPlain={async () => {
              try {
                await navigator.clipboard.writeText(activeDocument.content);
                return true;
              } catch {
                return false;
              }
            }}
            onDownload={() => downloadDocumentCopy(activeDocument)}
          />
        )}
        {customCssModalOpen && (
          <CustomCssModal
            isOpen={customCssModalOpen}
            onClose={() => setCustomCssModalOpen(false)}
            customCss={customCss}
            onSaveCss={setCustomCss}
          />
        )}
        {lightboxImage && (
          <LightboxModal
            isOpen
            onClose={() => setLightboxImage(null)}
            imageSrc={lightboxImage.src}
            imageAlt={lightboxImage.alt}
          />
        )}
      </Suspense>

      {pendingAction && (
        <UnsavedDialog
          title={activeDocument.title}
          onSave={() => void handleUnsavedSave()}
          onDiscard={handleDiscard}
          onCancel={() => setPendingAction(null)}
        />
      )}
      {formatDialogOpen && (
        <FormatDialog
          selected={selectedSaveFormat}
          onSelect={setSelectedSaveFormat}
          onConfirm={() => resolveFormat(selectedSaveFormat)}
          onCancel={() => resolveFormat(null)}
        />
      )}
      {conflictOpen && (
        <ConflictDialog
          onReload={() => void reloadConflict()}
          onOverwrite={() => void overwriteConflict()}
          onSaveCopy={() => void saveConflictCopy()}
          onCancel={() => setConflictOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
