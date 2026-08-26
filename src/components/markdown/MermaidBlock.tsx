import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import DOMPurify from 'dompurify';
import { ZoomIn, ZoomOut, RotateCcw, Copy, Check } from 'lucide-react';

interface MermaidBlockProps {
  chart: string;
}

let mermaidIdCounter = 0;

export const MermaidBlock: React.FC<MermaidBlockProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [scale, setScale] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const uniqueId = `mermaid-diagram-${++mermaidIdCounter}`;

    const renderChart = async () => {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'strict',
          fontFamily: 'Inter, sans-serif',
        });

        // Enforce size limit to prevent DoS (50KB)
        const MAX_CHART_SIZE = 50_000;
        const cleanChart = chart.trim().slice(0, MAX_CHART_SIZE);
        const { svg } = await mermaid.render(uniqueId, cleanChart);
        const sanitized = DOMPurify.sanitize(svg, {
          USE_PROFILES: { svg: true, svgFilters: true },
          FORBID_TAGS: ['script', 'foreignObject'],
          FORBID_ATTR: ['onload', 'onerror', 'onclick', 'onmouseover'],
        });
        if (isMounted) {
          setSvgContent(sanitized);
          setError(null);
        }
      } catch (err: any) {
        console.error('Mermaid render error:', err);
        if (isMounted) {
          setError(err.message || 'Failed to render Mermaid diagram');
        }
      }
    };

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  const handleCopySvg = async () => {
    if (!svgContent) return;
    try {
      await navigator.clipboard.writeText(svgContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy SVG:', e);
    }
  };

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.2, 2.5));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.5));
  const handleReset = () => setScale(1);

  if (error) {
    return (
      <div className="code-block-container" style={{ borderColor: '#ef4444' }}>
        <div className="code-block-header" style={{ color: '#ef4444' }}>
          <span>Mermaid Syntax Error</span>
        </div>
        <pre><code>{chart}</code></pre>
      </div>
    );
  }

  return (
    <div className="mermaid-container">
      <div className="mermaid-toolbar">
        <button className="code-action-btn" onClick={handleZoomIn} title="Zoom In">
          <ZoomIn size={14} />
        </button>
        <button className="code-action-btn" onClick={handleZoomOut} title="Zoom Out">
          <ZoomOut size={14} />
        </button>
        <button className="code-action-btn" onClick={handleReset} title="Reset Zoom">
          <RotateCcw size={14} />
        </button>
        <button className="code-action-btn" onClick={handleCopySvg} title="Copy SVG">
          {copied ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
        </button>
      </div>

      <div
        ref={containerRef}
        className="mermaid-svg-wrapper"
        style={{ transform: `scale(${scale})`, transformOrigin: 'center center', transition: 'transform 0.15s ease' }}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  );
};
