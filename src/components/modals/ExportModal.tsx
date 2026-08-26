import { useState } from 'react';
import { Check, Copy, Download, FileCode, Printer, X } from 'lucide-react';
import type { DocumentFormat } from '../../types';

interface ExportModalProps {
  isOpen: boolean;
  format: DocumentFormat;
  onClose: () => void;
  onPrint: () => void;
  onExportHtml: () => void;
  onCopyFormatted: () => Promise<boolean>;
  onCopyPlain: () => Promise<boolean>;
  onDownload: () => void;
}

export function ExportModal({
  isOpen,
  format,
  onClose,
  onPrint,
  onExportHtml,
  onCopyFormatted,
  onCopyPlain,
  onDownload,
}: ExportModalProps) {
  const [copied, setCopied] = useState(false);
  const isMarkdown = format === 'markdown';

  if (!isOpen) return null;

  const copy = async () => {
    const success = isMarkdown ? await onCopyFormatted() : await onCopyPlain();
    if (!success) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title"><Download size={18} /> Export document</div>
          <button className="tool-btn icon-only" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body export-options">
          <button className="export-option" onClick={() => { onPrint(); onClose(); }}>
            <Printer size={20} /><span><strong>Print or save as PDF</strong><small>Use the system print dialog</small></span>
          </button>
          {isMarkdown && (
            <button className="export-option" onClick={() => { onExportHtml(); onClose(); }}>
              <FileCode size={20} /><span><strong>Standalone HTML</strong><small>Rendered document with embedded styles</small></span>
            </button>
          )}
          <button className="export-option" onClick={copy}>
            {copied ? <Check size={20} /> : <Copy size={20} />}
            <span><strong>{copied ? 'Copied' : isMarkdown ? 'Copy formatted content' : 'Copy plain text'}</strong><small>Place document content on the clipboard</small></span>
          </button>
          <button className="export-option" onClick={() => { onDownload(); onClose(); }}>
            <Download size={20} /><span><strong>Download a copy</strong><small>{isMarkdown ? 'Markdown source' : 'Plain text'}</small></span>
          </button>
        </div>
      </div>
    </div>
  );
}
