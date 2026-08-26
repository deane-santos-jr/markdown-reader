import React, { useState, useEffect } from 'react';
import { X, Code2, Check } from 'lucide-react';

interface CustomCssModalProps {
  isOpen: boolean;
  onClose: () => void;
  customCss: string;
  onSaveCss: (css: string) => void;
}

export const CustomCssModal: React.FC<CustomCssModalProps> = ({
  isOpen,
  onClose,
  customCss,
  onSaveCss,
}) => {
  const [cssValue, setCssValue] = useState<string>(customCss);

  useEffect(() => {
    setCssValue(customCss);
  }, [customCss]);

  if (!isOpen) return null;

  const MAX_CSS = 50 * 1024;
  const isTooLarge = cssValue.length > MAX_CSS;

  const handleSave = () => {
    onSaveCss(cssValue);
    onClose();
  };

  const sampleSnippet = `/* Example: Custom Accent & Fonts */
:root {
  --accent-primary: #ec4899;
}
.markdown-body h1 {
  color: #db2777;
  letter-spacing: -0.04em;
}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" style={{ maxWidth: '650px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Code2 size={18} style={{ color: 'var(--accent-primary)' }} />
            <span>Custom CSS Stylesheet</span>
          </div>
          <button className="tool-btn icon-only" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.8rem' }}>
            Inject custom CSS rules to customize fonts, colors, line spacing, and elements. Changes apply live immediately.
          </div>

          {isTooLarge && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '0.4rem' }}>CSS exceeds {MAX_CSS / 1024}KB limit and will be truncated</div>}
          <textarea
            value={cssValue}
            onChange={(e) => setCssValue(e.target.value.slice(0, MAX_CSS))}
            placeholder={sampleSnippet}
            style={{
              width: '100%',
              height: '240px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem',
              lineHeight: 1.5,
              padding: '0.8rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-editor)',
              color: 'var(--text-main)',
              outline: 'none',
              resize: 'vertical',
            }}
          />
        </div>

        <div className="modal-footer">
          <button className="tool-btn" onClick={() => setCssValue('')}>
            Reset to Default
          </button>
          <button className="tool-btn active" onClick={handleSave} style={{ gap: '0.4rem' }}>
            <Check size={14} />
            <span>Apply CSS</span>
          </button>
        </div>
      </div>
    </div>
  );
};
