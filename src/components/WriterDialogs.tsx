import { AlertTriangle, FileText, X } from 'lucide-react';
import type { DocumentFormat } from '../types';

interface UnsavedDialogProps {
  title: string;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export function UnsavedDialog({ title, onSave, onDiscard, onCancel }: UnsavedDialogProps) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="unsaved-title">
      <div className="modal-dialog writer-dialog">
        <div className="modal-header">
          <div className="modal-title" id="unsaved-title"><AlertTriangle size={18} /> Save changes?</div>
          <button className="tool-btn icon-only" onClick={onCancel}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p><strong>{title}</strong> has changes that have not reached disk.</p>
        </div>
        <div className="modal-footer">
          <button className="tool-btn danger" onClick={onDiscard}>Discard</button>
          <button className="tool-btn" onClick={onCancel}>Cancel</button>
          <button className="tool-btn active" onClick={onSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

interface FormatDialogProps {
  selected: Exclude<DocumentFormat, 'neutral'>;
  onSelect: (format: Exclude<DocumentFormat, 'neutral'>) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function FormatDialog({ selected, onSelect, onConfirm, onCancel }: FormatDialogProps) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="format-title">
      <div className="modal-dialog writer-dialog">
        <div className="modal-header">
          <div className="modal-title" id="format-title"><FileText size={18} /> Choose document format</div>
          <button className="tool-btn icon-only" onClick={onCancel}><X size={16} /></button>
        </div>
        <div className="modal-body format-options">
          <button className={`format-option ${selected === 'markdown' ? 'selected' : ''}`} onClick={() => onSelect('markdown')}>
            <strong>Markdown</strong>
            <span>Formatting, preview, split view, and raw source in a .md file.</span>
          </button>
          <button className={`format-option ${selected === 'text' ? 'selected' : ''}`} onClick={() => onSelect('text')}>
            <strong>Plain text</strong>
            <span>Literal prose in a .txt file with no Markdown interpretation.</span>
          </button>
        </div>
        <div className="modal-footer">
          <button className="tool-btn" onClick={onCancel}>Cancel</button>
          <button className="tool-btn active" onClick={onConfirm}>Continue to Save As</button>
        </div>
      </div>
    </div>
  );
}

interface ConflictDialogProps {
  onReload: () => void;
  onOverwrite: () => void;
  onSaveCopy: () => void;
  onCancel: () => void;
}

export function ConflictDialog({ onReload, onOverwrite, onSaveCopy, onCancel }: ConflictDialogProps) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="conflict-title">
      <div className="modal-dialog writer-dialog">
        <div className="modal-header">
          <div className="modal-title" id="conflict-title"><AlertTriangle size={18} /> File changed on disk</div>
          <button className="tool-btn icon-only" onClick={onCancel}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p>Another application changed this file. Choose which version to keep before autosave continues.</p>
        </div>
        <div className="modal-footer conflict-actions">
          <button className="tool-btn" onClick={onReload}>Reload disk version</button>
          <button className="tool-btn" onClick={onSaveCopy}>Save a copy</button>
          <button className="tool-btn danger" onClick={onOverwrite}>Overwrite</button>
        </div>
      </div>
    </div>
  );
}
