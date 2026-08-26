import { useEffect, useRef, useState } from 'react';
import { CaseSensitive, ChevronDown, ChevronUp, Replace, Search, X } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (query: string) => void;
  replacement: string;
  onReplacementChange: (replacement: string) => void;
  caseSensitive: boolean;
  onToggleCaseSensitive: () => void;
  matchIndex: number;
  totalMatches: number;
  onNextMatch: () => void;
  onPrevMatch: () => void;
  onReplace: () => void;
  onReplaceAll: () => void;
}

export function SearchModal({
  isOpen,
  onClose,
  query,
  onQueryChange,
  replacement,
  onReplacementChange,
  caseSensitive,
  onToggleCaseSensitive,
  matchIndex,
  totalMatches,
  onNextMatch,
  onPrevMatch,
  onReplace,
  onReplaceAll,
}: SearchModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showReplace, setShowReplace] = useState(false);

  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => inputRef.current?.focus());
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="floating-search-bar search-replace-panel">
      <div className="search-row">
        <Search size={14} />
        <input
          ref={inputRef}
          type="text"
          className="search-input-field"
          placeholder="Find in document"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onClose();
            if (event.key === 'Enter') {
              if (event.shiftKey) onPrevMatch();
              else onNextMatch();
            }
          }}
        />
        <button className={`tool-btn icon-only ${caseSensitive ? 'active' : ''}`} onClick={onToggleCaseSensitive} title="Match case"><CaseSensitive size={15} /></button>
        <span className="search-count">{query ? (totalMatches ? `${matchIndex + 1}/${totalMatches}` : '0/0') : ''}</span>
        <button className="tool-btn icon-only" onClick={onPrevMatch} title="Previous"><ChevronUp size={14} /></button>
        <button className="tool-btn icon-only" onClick={onNextMatch} title="Next"><ChevronDown size={14} /></button>
        <button className={`tool-btn icon-only ${showReplace ? 'active' : ''}`} onClick={() => setShowReplace(!showReplace)} title="Replace"><Replace size={14} /></button>
        <button className="tool-btn icon-only" onClick={onClose} title="Close"><X size={14} /></button>
      </div>
      {showReplace && (
        <div className="search-row replace-row">
          <Replace size={14} />
          <input
            type="text"
            className="search-input-field"
            placeholder="Replace with"
            value={replacement}
            onChange={(event) => onReplacementChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') onClose();
              if (event.key === 'Enter') onReplace();
            }}
          />
          <button className="tool-btn" onClick={onReplace} disabled={totalMatches === 0}>Replace</button>
          <button className="tool-btn" onClick={onReplaceAll} disabled={totalMatches === 0}>All</button>
        </div>
      )}
    </div>
  );
}
