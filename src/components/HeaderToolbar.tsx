import { useEffect, useState } from 'react';
import {
  BookOpen,
  Check,
  Columns,
  Command,
  Download,
  FilePlus,
  FolderOpen,
  Maximize2,
  Minimize2,
  Palette,
  PanelLeft,
  Save,
  Search,
  SquarePen,
} from 'lucide-react';
import type { DocumentFormat, SaveStatus, ThemeId, ViewMode } from '../types';

interface HeaderToolbarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  documentTitle: string;
  saveStatus: SaveStatus;
  format: DocumentFormat;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  zenMode: boolean;
  onToggleZenMode: () => void;
  onOpenSearch: () => void;
  onOpenCommandPalette: () => void;
  onNewDocument: () => void;
  onOpenFile: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onOpenExportModal: () => void;
  currentTheme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
}

const themes: { id: ThemeId; label: string }[] = [
  { id: 'typora-classic', label: 'Typora Classic' },
  { id: 'academic', label: 'Academic Serif' },
  { id: 'nord-night', label: 'Nordic Night' },
  { id: 'solarized-sepia', label: 'Solarized Sepia' },
  { id: 'monochrome', label: 'Monochrome' },
  { id: 'cyber-dark', label: 'Cyber Dark' },
];

const saveLabels: Record<SaveStatus, string> = {
  saved: 'Saved',
  saving: 'Saving…',
  unsaved: 'Unsaved',
  conflict: 'Save conflict',
  error: 'Save failed',
};

export function HeaderToolbar({
  sidebarOpen,
  onToggleSidebar,
  documentTitle,
  saveStatus,
  format,
  viewMode,
  onViewModeChange,
  zenMode,
  onToggleZenMode,
  onOpenSearch,
  onOpenCommandPalette,
  onNewDocument,
  onOpenFile,
  onSave,
  onSaveAs,
  onOpenExportModal,
  currentTheme,
  onThemeChange,
}: HeaderToolbarProps) {
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [isMacElectron, setIsMacElectron] = useState(false);
  const supportsPreview = format === 'markdown';
  const isSavedFile = format !== 'neutral' && saveStatus === 'saved';
  const saveLabel = format === 'neutral' && saveStatus === 'saved' ? 'Draft' : saveLabels[saveStatus];

  useEffect(() => {
    setIsMacElectron(window.electronAPI?.platform === 'darwin');
  }, []);

  const handleHeaderDoubleClick = (event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest('button, input, .document-title-badge, .modal-dialog')) return;
    window.electronAPI?.toggleMaximize();
  };

  return (
    <header className={`app-toolbar no-print ${isMacElectron ? 'is-electron-mac' : ''}`} onDoubleClick={handleHeaderDoubleClick}>
      <div className="toolbar-group-left">
        <button className={`tool-btn icon-only ${sidebarOpen ? 'active' : ''}`} onClick={onToggleSidebar} title="Toggle sidebar">
          <PanelLeft size={16} />
        </button>
        <div className={`document-title-badge save-${saveStatus} format-${format}`} title={`${documentTitle} — ${saveLabel}`}>
          <span className={isSavedFile ? 'saved-check' : 'dirty-dot'}>{isSavedFile ? '✓' : ''}</span>
          <span className="title-text">{documentTitle}</span>
          <span className="save-label">{saveLabel}</span>
        </div>
        <button className="tool-btn icon-only btn-hide-xs" onClick={onNewDocument} title="New document">
          <FilePlus size={15} />
        </button>
        <button className="tool-btn icon-only btn-hide-xs" onClick={onOpenFile} title="Open file">
          <FolderOpen size={15} />
        </button>
        <button className="tool-btn icon-only" onClick={onSave} title="Save">
          <Save size={15} />
        </button>
        <button className="tool-btn btn-hide-md" onClick={onSaveAs} title="Save As">
          Save As
        </button>
      </div>

      <div className="toolbar-group-center">
        <div className="segmented-control">
          <button className={`segment-btn ${viewMode === 'write' ? 'active' : ''}`} onClick={() => onViewModeChange('write')}>
            <SquarePen size={14} /><span className="segment-label">Write</span>
          </button>
          {supportsPreview && (
            <>
              <button className={`segment-btn ${viewMode === 'preview' ? 'active' : ''}`} onClick={() => onViewModeChange('preview')}>
                <BookOpen size={14} /><span className="segment-label">Preview</span>
              </button>
              <button className={`segment-btn ${viewMode === 'split' ? 'active' : ''}`} onClick={() => onViewModeChange('split')}>
                <Columns size={14} /><span className="segment-label">Split</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="toolbar-group-right">
        <button className="tool-btn icon-only" onClick={onOpenSearch} title="Find and replace">
          <Search size={15} />
        </button>
        <button className="tool-btn btn-cmd-palette btn-hide-sm" onClick={onOpenCommandPalette} title="Command palette">
          <Command size={14} /><span className="btn-label-text">Cmd+K</span>
        </button>
        <div className="btn-hide-sm" style={{ position: 'relative' }}>
          <button className="tool-btn icon-only" onClick={() => setShowThemeMenu(!showThemeMenu)} title="Theme">
            <Palette size={15} />
          </button>
          {showThemeMenu && (
            <div className="modal-dialog theme-menu" onMouseLeave={() => setShowThemeMenu(false)}>
              {themes.map((theme) => (
                <button className="command-item theme-menu-item" key={theme.id} onClick={() => {
                  onThemeChange(theme.id);
                  setShowThemeMenu(false);
                }}>
                  <span>{theme.label}</span>
                  {currentTheme === theme.id && <Check size={13} />}
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="tool-btn btn-export btn-hide-sm" onClick={onOpenExportModal} title="Export">
          <Download size={14} /><span className="btn-label-text">Export</span>
        </button>
        <button className="tool-btn icon-only btn-hide-sm" onClick={onToggleZenMode} title="Zen mode">
          {zenMode ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
      </div>
    </header>
  );
}
