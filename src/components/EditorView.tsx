import { useEffect, useRef } from 'react';
import {
  Bold,
  CheckSquare,
  Code,
  Heading1,
  Heading2,
  Italic,
  Link,
  Quote,
  Strikethrough,
  WrapText,
} from 'lucide-react';
import type { DocumentFormat } from '../types';

interface EditorViewProps {
  content: string;
  format: DocumentFormat;
  onChange: (content: string) => void;
  onSave: () => void;
  onSelectionChange: (selectedText: string) => void;
  onToggleFont: () => void;
  onToggleWrap: () => void;
  fontMode: 'proportional' | 'monospace';
  wrap: boolean;
  isSplit?: boolean;
  searchTarget?: { index: number; length: number };
}

export function EditorView({
  content,
  format,
  onChange,
  onSave,
  onSelectionChange,
  onToggleFont,
  onToggleWrap,
  fontMode,
  wrap,
  isSplit = false,
  searchTarget,
}: EditorViewProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isMarkdown = format === 'markdown';

  useEffect(() => {
    if (!searchTarget) return;
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.focus();
    textarea.setSelectionRange(searchTarget.index, searchTarget.index + searchTarget.length);
    const line = content.slice(0, searchTarget.index).split('\n').length - 1;
    textarea.scrollTop = Math.max(0, line * 24 - textarea.clientHeight / 3);
  }, [content, searchTarget]);

  const updateSelection = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    onSelectionChange(content.slice(textarea.selectionStart, textarea.selectionEnd));
  };

  const insertFormatting = (prefix: string, suffix = '', fallback = '') => {
    const textarea = textareaRef.current;
    if (!textarea || !isMarkdown) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end) || fallback;
    onChange(`${content.slice(0, start)}${prefix}${selected}${suffix}${content.slice(end)}`);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
      updateSelection();
    });
  };

  const continueMarkdownList = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isMarkdown || event.key !== 'Enter' || event.shiftKey) return false;
    const textarea = textareaRef.current;
    if (!textarea) return false;
    const position = textarea.selectionStart;
    const before = content.slice(0, position);
    const line = before.split('\n').pop() || '';
    const match = line.match(/^(\s*)(?:([-*])|(\d+)\.)\s+(.*)$/);
    if (!match) return false;
    event.preventDefault();
    if (!match[4]) {
      const lineStart = before.lastIndexOf('\n') + 1;
      onChange(content.slice(0, lineStart) + content.slice(position));
      requestAnimationFrame(() => textarea.setSelectionRange(lineStart, lineStart));
      return true;
    }
    const marker = match[2] || `${Number(match[3]) + 1}.`;
    const insertion = `\n${match[1]}${marker} `;
    onChange(content.slice(0, position) + insertion + content.slice(position));
    requestAnimationFrame(() => textarea.setSelectionRange(position + insertion.length, position + insertion.length));
    return true;
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const commandKey = event.metaKey || event.ctrlKey;
    if (commandKey && event.key.toLowerCase() === 's') {
      event.preventDefault();
      onSave();
      return;
    }
    if (isMarkdown && commandKey && event.key.toLowerCase() === 'b') {
      event.preventDefault();
      insertFormatting('**', '**', 'bold text');
      return;
    }
    if (isMarkdown && commandKey && event.key.toLowerCase() === 'i') {
      event.preventDefault();
      insertFormatting('*', '*', 'italic text');
      return;
    }
    if (continueMarkdownList(event)) return;
    if (event.key === 'Tab') {
      event.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      onChange(`${content.slice(0, start)}  ${content.slice(end)}`);
      requestAnimationFrame(() => textarea.setSelectionRange(start + 2, start + 2));
    }
  };

  return (
    <div className="source-editor-wrapper">
      <div className={`writer-toolbar ${isSplit ? 'compact' : ''}`}>
        {isMarkdown && (
          <>
            <button className="tool-btn icon-only" onClick={() => insertFormatting('**', '**', 'bold')} title="Bold"><Bold size={15} /></button>
            <button className="tool-btn icon-only" onClick={() => insertFormatting('*', '*', 'italic')} title="Italic"><Italic size={15} /></button>
            <button className="tool-btn icon-only" onClick={() => insertFormatting('~~', '~~', 'strikethrough')} title="Strikethrough"><Strikethrough size={15} /></button>
            <span className="toolbar-divider" />
            <button className="tool-btn icon-only" onClick={() => insertFormatting('# ', '', 'Heading')} title="Heading 1"><Heading1 size={15} /></button>
            <button className="tool-btn icon-only" onClick={() => insertFormatting('## ', '', 'Heading')} title="Heading 2"><Heading2 size={15} /></button>
            <button className="tool-btn icon-only" onClick={() => insertFormatting('- [ ] ', '', 'Task')} title="Task"><CheckSquare size={15} /></button>
            <button className="tool-btn icon-only" onClick={() => insertFormatting('> ', '', 'Quote')} title="Quote"><Quote size={15} /></button>
            <button className="tool-btn icon-only" onClick={() => insertFormatting('`', '`', 'code')} title="Code"><Code size={15} /></button>
            <button className="tool-btn icon-only" onClick={() => insertFormatting('[', '](https://)', 'link')} title="Link"><Link size={15} /></button>
            <span className="toolbar-divider" />
          </>
        )}
        <button className={`tool-btn ${fontMode === 'monospace' ? 'active' : ''}`} onClick={onToggleFont} title="Toggle writing font">
          {fontMode === 'monospace' ? 'Mono' : 'Prose'}
        </button>
        <button className={`tool-btn icon-only ${wrap ? 'active' : ''}`} onClick={onToggleWrap} title="Toggle line wrapping"><WrapText size={15} /></button>
      </div>
      <div className="writer-canvas">
        <textarea
          ref={textareaRef}
          className={`source-editor-textarea ${fontMode} ${wrap ? 'wrap' : 'nowrap'}`}
          value={content}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onSelect={updateSelection}
          onBlur={updateSelection}
          placeholder={format === 'neutral' ? 'Start writing…' : format === 'text' ? 'Write plain text…' : 'Write Markdown…'}
          spellCheck
          wrap={wrap ? 'soft' : 'off'}
        />
      </div>
    </div>
  );
}
