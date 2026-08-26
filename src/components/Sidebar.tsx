import React, { useEffect, useState } from 'react';
import {
  ListTree,
  FolderTree,
  BarChart3,
  Sliders,
  FolderOpen,
  FileText,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Search,
  X,
} from 'lucide-react';
import type { DocumentFormat, OutlineHeading, DocumentStats, WorkspaceFile, ThemeId, TypographySettings, FontFamily } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  headings: OutlineHeading[];
  activeHeadingId: string;
  onHeadingClick: (id: string) => void;
  stats: DocumentStats;
  files: WorkspaceFile[];
  activeFilePath?: string;
  onSelectFile: (file: WorkspaceFile) => void;
  onOpenFolder: () => void;
  currentTheme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
  typography: TypographySettings;
  onTypographyChange: (settings: TypographySettings) => void;
  onOpenCustomCss: () => void;
  format: DocumentFormat;
}

type TabType = 'outline' | 'files' | 'stats' | 'typography';

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  headings,
  activeHeadingId,
  onHeadingClick,
  stats,
  files,
  activeFilePath,
  onSelectFile,
  onOpenFolder,
  currentTheme,
  onThemeChange,
  typography,
  onTypographyChange,
  onOpenCustomCss,
  format,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('outline');
  const [outlineFilter, setOutlineFilter] = useState<string>('');
  const [selectedHeadingIndex, setSelectedHeadingIndex] = useState<number>(0);
  const [expandedDirs, setExpandedDirs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (format !== 'markdown' && activeTab === 'outline') setActiveTab('stats');
  }, [activeTab, format]);

  const toggleDir = (dirPath: string) => {
    setExpandedDirs((prev) => ({ ...prev, [dirPath]: !prev[dirPath] }));
  };

  const filteredHeadings = headings.filter((h) =>
    h.text.toLowerCase().includes(outlineFilter.toLowerCase())
  );

  const renderHighlightedText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark
          key={i}
          className="outline-search-highlight"
          style={{
            backgroundColor: 'rgba(236, 72, 153, 0.3)',
            color: 'inherit',
            borderRadius: '2px',
            padding: '0 2px',
          }}
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const themeOptions: { id: ThemeId; name: string; desc: string; bg: string; color: string }[] = [
    { id: 'typora-classic', name: 'Classic', desc: 'Crisp GitHub light', bg: '#ffffff', color: '#24292e' },
    { id: 'academic', name: 'Academic', desc: 'Editorial Serif paper', bg: '#fcf9f2', color: '#2c251e' },
    { id: 'nord-night', name: 'Nord Night', desc: 'Soft slate dark mode', bg: '#2e3440', color: '#eceff4' },
    { id: 'solarized-sepia', name: 'Sepia', desc: 'Warm amber tones', bg: '#fdf6e3', color: '#586e75' },
    { id: 'monochrome', name: 'Monochrome', desc: 'High-contrast stark', bg: '#ffffff', color: '#18181b' },
    { id: 'cyber-dark', name: 'Cyber Dark', desc: 'Vibrant neon dark', bg: '#0d1117', color: '#c9d1d9' },
  ];

  const renderFileTree = (nodes: WorkspaceFile[]) => {
    return (
      <div className="file-tree">
        {nodes.map((node) => {
          if (node.isDir) {
            const isExpanded = !!expandedDirs[node.path];
            return (
              <div key={node.path}>
                <div
                  className="tree-node"
                  onClick={() => toggleDir(node.path)}
                  style={{ fontWeight: 600 }}
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <FolderTree size={14} style={{ color: 'var(--accent-primary)' }} />
                  <span>{node.name}</span>
                </div>
                {isExpanded && node.children && (
                  <div style={{ paddingLeft: '1rem' }}>
                    {renderFileTree(node.children)}
                  </div>
                )}
              </div>
            );
          }

          const isActive = activeFilePath === node.path;
          return (
            <div
              key={node.path}
              className={`tree-node ${isActive ? 'active' : ''}`}
              onClick={() => onSelectFile(node)}
            >
              <FileText size={14} />
              <span>{node.name}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div className="sidebar-mobile-backdrop" onClick={onClose} />
      )}

      <aside className={`app-sidebar ${isOpen ? '' : 'collapsed'}`}>
        {/* Sidebar Tabs */}
        <div className="sidebar-tabs">
          {format === 'markdown' && (
            <button
              className={`sidebar-tab-btn ${activeTab === 'outline' ? 'active' : ''}`}
              onClick={() => setActiveTab('outline')}
              title="Document Outline"
            >
              <ListTree size={14} />
              <span>Outline</span>
            </button>
          )}
          <button
            className={`sidebar-tab-btn ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}
            title="Files & Workspace"
          >
            <FolderTree size={14} />
            <span>Files</span>
          </button>
          <button
            className={`sidebar-tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
            title="Document Intelligence"
          >
            <BarChart3 size={14} />
            <span>Stats</span>
          </button>
          <button
            className={`sidebar-tab-btn ${activeTab === 'typography' ? 'active' : ''}`}
            onClick={() => setActiveTab('typography')}
            title="Theme & Typography"
          >
            <Sliders size={14} />
            <span>Style</span>
          </button>
          <button
            className="sidebar-close-btn tool-btn icon-only"
            onClick={onClose}
            title="Close Sidebar"
          >
            <X size={14} />
          </button>
        </div>

      {/* Sidebar Tab Content */}
      <div className="sidebar-content">
        {/* TAB 1: OUTLINE / TOC */}
        {activeTab === 'outline' && (
          <div>
            <div style={{ position: 'relative', marginBottom: '0.8rem' }}>
              <input
                type="text"
                placeholder="Filter headings... (↑↓ to navigate, ↵ to jump)"
                value={outlineFilter}
                onChange={(e) => {
                  setOutlineFilter(e.target.value);
                  setSelectedHeadingIndex(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedHeadingIndex((prev) =>
                      filteredHeadings.length > 0 ? (prev + 1) % filteredHeadings.length : 0
                    );
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedHeadingIndex((prev) =>
                      filteredHeadings.length > 0
                        ? (prev - 1 + filteredHeadings.length) % filteredHeadings.length
                        : 0
                    );
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    const target = filteredHeadings[selectedHeadingIndex] || filteredHeadings[0];
                    if (target) {
                      onHeadingClick(target.id);
                    }
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setOutlineFilter('');
                    setSelectedHeadingIndex(0);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '0.35rem 1.8rem 0.35rem 1.8rem',
                  fontSize: '0.8rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-main)',
                  outline: 'none',
                }}
              />
              <Search size={13} style={{ position: 'absolute', left: '7px', top: '8px', color: 'var(--text-muted)' }} />
              {outlineFilter && (
                <button
                  onClick={() => {
                    setOutlineFilter('');
                    setSelectedHeadingIndex(0);
                  }}
                  style={{
                    position: 'absolute',
                    right: '6px',
                    top: '7px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Clear filter (Esc)"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {filteredHeadings.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', padding: '2rem 0' }}>
                No headings found
              </div>
            ) : (
              <div className="outline-list">
                {filteredHeadings.map((h, idx) => {
                  const isKeyboardFocused = outlineFilter.trim() !== '' && selectedHeadingIndex === idx;
                  const isActive = activeHeadingId === h.id || isKeyboardFocused;
                  return (
                    <div
                      key={h.id}
                      className={`outline-item outline-lvl-${h.level} ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedHeadingIndex(idx);
                        onHeadingClick(h.id);
                      }}
                      title={h.text}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {renderHighlightedText(h.text, outlineFilter)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: FILES & WORKSPACE */}
        {activeTab === 'files' && (
          <div>
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
              <button
                className="tool-btn"
                onClick={onOpenFolder}
                style={{ width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
              >
                <FolderOpen size={14} />
                <span>Open Folder...</span>
              </button>
            </div>

            {files.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', padding: '2rem 1rem' }}>
                <FolderTree size={28} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
                <div>No folder opened yet.</div>
                <div style={{ fontSize: '0.74rem', marginTop: '4px' }}>Open a workspace directory to browse markdown files.</div>
              </div>
            ) : (
              renderFileTree(files)
            )}
          </div>
        )}

        {/* TAB 3: STATS & INTELLIGENCE */}
        {activeTab === 'stats' && (
          <div>
            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-number">{stats.words.toLocaleString()}</div>
                <div className="stat-label">Words</div>
              </div>
              <div className="stat-box">
                <div className="stat-number">{stats.readingTimeMinutes} min</div>
                <div className="stat-label">Read Time</div>
              </div>
              <div className="stat-box">
                <div className="stat-number">{stats.characters.toLocaleString()}</div>
                <div className="stat-label">Characters</div>
              </div>
              <div className="stat-box">
                <div className="stat-number">{stats.lines.toLocaleString()}</div>
                <div className="stat-label">Lines</div>
              </div>
            </div>

            {format === 'markdown' && <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.8rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '0.6rem' }}>
                DOCUMENT BREAKDOWN
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.25rem 0', color: 'var(--text-muted)' }}>
                <span>Headings</span>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{stats.headingsCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.25rem 0', color: 'var(--text-muted)' }}>
                <span>Code Blocks</span>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{stats.codeBlocksCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.25rem 0', color: 'var(--text-muted)' }}>
                <span>Tables</span>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{stats.tablesCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.25rem 0', color: 'var(--text-muted)' }}>
                <span>Links</span>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{stats.linksCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.25rem 0', color: 'var(--text-muted)' }}>
                <span>Images</span>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{stats.imagesCount}</span>
              </div>
            </div>}
          </div>
        )}

        {/* TAB 4: THEME & TYPOGRAPHY */}
        {activeTab === 'typography' && (
          <div>
            <div className="settings-group">
              <div className="settings-label">
                <span>THEMES</span>
                <Sparkles size={13} style={{ color: 'var(--accent-primary)' }} />
              </div>
              <div className="theme-card-grid">
                {themeOptions.map((t) => (
                  <div
                    key={t.id}
                    className={`theme-card ${currentTheme === t.id ? 'active' : ''}`}
                    onClick={() => onThemeChange(t.id)}
                    style={{ background: t.bg, color: t.color }}
                  >
                    <div style={{ fontWeight: 600 }}>{t.name}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="settings-group">
              <div className="settings-label">
                <span>FONT FAMILY</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {[
                  { id: 'inter', name: 'Inter (Clean Sans)' },
                  { id: 'newsreader', name: 'Newsreader (Editorial Serif)' },
                  { id: 'jetbrains-mono', name: 'JetBrains Mono (Technical)' },
                  { id: 'system', name: 'System Default' },
                ].map((f) => (
                  <button
                    key={f.id}
                    className={`tool-btn ${typography.fontFamily === f.id ? 'active' : ''}`}
                    style={{ justifyContent: 'flex-start', width: '100%', fontSize: '0.8rem' }}
                    onClick={() => onTypographyChange({ ...typography, fontFamily: f.id as FontFamily })}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-group">
              <div className="settings-label">
                <span>FONT SIZE</span>
                <span>{typography.fontSize}px</span>
              </div>
              <input
                type="range"
                min="13"
                max="24"
                value={typography.fontSize}
                onChange={(e) => onTypographyChange({ ...typography, fontSize: Number(e.target.value) })}
                className="settings-slider"
              />
            </div>

            <div className="settings-group">
              <div className="settings-label">
                <span>LINE HEIGHT</span>
                <span>{typography.lineHeight}</span>
              </div>
              <input
                type="range"
                min="1.3"
                max="2.3"
                step="0.05"
                value={typography.lineHeight}
                onChange={(e) => onTypographyChange({ ...typography, lineHeight: Number(e.target.value) })}
                className="settings-slider"
              />
            </div>

            <div className="settings-group">
              <div className="settings-label">
                <span>CONTENT WIDTH</span>
                <span>{typography.maxWidth ? `${typography.maxWidth}px` : '100%'}</span>
              </div>
              <input
                type="range"
                min="650"
                max="1200"
                step="50"
                value={typography.maxWidth || 860}
                onChange={(e) => onTypographyChange({ ...typography, maxWidth: Number(e.target.value) })}
                className="settings-slider"
              />
            </div>

            <div style={{ marginTop: '1rem' }}>
              <button
                className="tool-btn"
                onClick={onOpenCustomCss}
                style={{ width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
              >
                Custom CSS Overrides...
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
    </>
  );
};

