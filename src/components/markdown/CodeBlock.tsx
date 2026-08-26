import React, { useState, Suspense } from 'react';
import { Copy, Check, Hash } from 'lucide-react';
import hljs from 'highlight.js/lib/common';

const LazyMermaidBlock = React.lazy(() =>
  import('./MermaidBlock').then((m) => ({ default: m.MermaidBlock }))
);

interface CodeBlockProps {
  className?: string;
  children?: React.ReactNode;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ className, children }) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [showLineNumbers, setShowLineNumbers] = useState<boolean>(false);

  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1].toLowerCase() : '';
  const rawCode = String(children).replace(/\n$/, '');

  // Handle Mermaid diagrams with lazy loading
  if (language === 'mermaid') {
    return (
      <Suspense
        fallback={
          <div className="mermaid-container" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading diagram engine...
          </div>
        }
      >
        <LazyMermaidBlock chart={rawCode} />
      </Suspense>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy code:', e);
    }
  };

  // Escape HTML for fallback to prevent XSS via dangerouslySetInnerHTML
  const escapeHtml = (str: string): string =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');

  // Perform syntax highlighting
  let highlightedCode: string = escapeHtml(rawCode);
  try {
    if (language && hljs.getLanguage(language)) {
      highlightedCode = hljs.highlight(rawCode, { language, ignoreIllegals: true }).value;
    } else {
      highlightedCode = hljs.highlightAuto(rawCode).value;
    }
  } catch {
    highlightedCode = escapeHtml(rawCode);
  }

  // Line numbers rendering
  const lines = rawCode.split('\n');

  return (
    <div className="code-block-container">
      <div className="code-block-header">
        <span className="code-block-lang">{language || 'text'}</span>
        <div className="code-block-actions">
          <button
            className={`code-action-btn ${showLineNumbers ? 'active' : ''}`}
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            title="Toggle Line Numbers"
          >
            <Hash size={13} />
            <span>Lines</span>
          </button>
          <button className="code-action-btn" onClick={handleCopy} title="Copy code">
            {copied ? (
              <>
                <Check size={13} style={{ color: '#10b981' }} />
                <span style={{ color: '#10b981' }}>Copied</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      <pre>
        {showLineNumbers ? (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div
              style={{
                userSelect: 'none',
                opacity: 0.35,
                textAlign: 'right',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {lines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <code
              className={className}
              dangerouslySetInnerHTML={{ __html: highlightedCode }}
              style={{ flex: 1 }}
            />
          </div>
        ) : (
          <code className={className} dangerouslySetInnerHTML={{ __html: highlightedCode }} />
        )}
      </pre>
    </div>
  );
};
