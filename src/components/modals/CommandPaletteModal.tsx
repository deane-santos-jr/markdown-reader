import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Columns, FilePlus, FolderOpen, Palette, Save, SquarePen } from 'lucide-react';
import type { DocumentFormat, ThemeId, ViewMode } from '../../types';

interface CommandPaletteModalProps {
  isOpen: boolean;
  format: DocumentFormat;
  onClose: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  onNewDocument: () => void;
  onOpenFile: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onThemeChange: (theme: ThemeId) => void;
}

interface CommandItem {
  id: string;
  title: string;
  category: string;
  icon: typeof Save;
  action: () => void;
}

export function CommandPaletteModal({
  isOpen,
  format,
  onClose,
  onViewModeChange,
  onNewDocument,
  onOpenFile,
  onSave,
  onSaveAs,
  onThemeChange,
}: CommandPaletteModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [
      { id: 'write', title: 'Switch to Write', category: 'View', icon: SquarePen, action: () => onViewModeChange('write') },
      { id: 'new', title: 'New Document', category: 'File', icon: FilePlus, action: onNewDocument },
      { id: 'open', title: 'Open File', category: 'File', icon: FolderOpen, action: onOpenFile },
      { id: 'save', title: 'Save Document', category: 'File', icon: Save, action: onSave },
      { id: 'save-as', title: 'Save Document As', category: 'File', icon: Save, action: onSaveAs },
      { id: 'classic', title: 'Theme: Typora Classic', category: 'Theme', icon: Palette, action: () => onThemeChange('typora-classic') },
      { id: 'academic', title: 'Theme: Academic', category: 'Theme', icon: Palette, action: () => onThemeChange('academic') },
      { id: 'night', title: 'Theme: Nordic Night', category: 'Theme', icon: Palette, action: () => onThemeChange('nord-night') },
      { id: 'sepia', title: 'Theme: Solarized Sepia', category: 'Theme', icon: Palette, action: () => onThemeChange('solarized-sepia') },
    ];
    if (format === 'markdown') {
      items.splice(1, 0,
        { id: 'preview', title: 'Switch to Preview', category: 'View', icon: BookOpen, action: () => onViewModeChange('preview') },
        { id: 'split', title: 'Switch to Split', category: 'View', icon: Columns, action: () => onViewModeChange('split') },
      );
    }
    return items;
  }, [format, onNewDocument, onOpenFile, onSave, onSaveAs, onThemeChange, onViewModeChange]);

  const filtered = commands.filter((command) => `${command.category} ${command.title}`.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setSelectedIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [isOpen]);

  if (!isOpen) return null;

  const run = (command: CommandItem) => {
    command.action();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog command-palette-dialog" onClick={(event) => event.stopPropagation()}>
        <input
          ref={inputRef}
          className="command-search-input"
          placeholder="Type a command"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelectedIndex(0);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onClose();
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setSelectedIndex((index) => filtered.length ? (index + 1) % filtered.length : 0);
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              setSelectedIndex((index) => filtered.length ? (index - 1 + filtered.length) % filtered.length : 0);
            }
            if (event.key === 'Enter' && filtered[selectedIndex]) run(filtered[selectedIndex]);
          }}
        />
        <div className="command-results">
          {filtered.map((command, index) => {
            const Icon = command.icon;
            return (
              <button className={`command-item command-button ${index === selectedIndex ? 'selected' : ''}`} key={command.id} onClick={() => run(command)}>
                <span><Icon size={15} /> {command.title}</span>
                <small>{command.category}</small>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
