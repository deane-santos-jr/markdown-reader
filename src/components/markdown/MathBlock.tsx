import React, { useState } from 'react';
import katex from 'katex';
import { Copy, Check } from 'lucide-react';

interface MathBlockProps {
  math: string;
  block?: boolean;
}

export const MathBlock: React.FC<MathBlockProps> = ({ math, block = false }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(math);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy LaTeX:', e);
    }
  };

  const escapeHtml = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');

  let html = '';
  try {
    html = katex.renderToString(math, {
      displayMode: block,
      throwOnError: false,
      strict: 'warn',
      trust: false,
    });
  } catch {
    html = `<span class="katex-error">${escapeHtml(math)}</span>`;
  }

  if (!block) {
    return <span className="katex-inline" dangerouslySetInnerHTML={{ __html: html }} />;
  }

  return (
    <div className="math-block-container">
      <button className="code-action-btn math-copy-btn" onClick={handleCopy} title="Copy LaTeX">
        {copied ? <Check size={13} style={{ color: '#10b981' }} /> : <Copy size={13} />}
      </button>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
};
