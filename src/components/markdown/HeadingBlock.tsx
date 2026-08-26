import React, { useState } from 'react';
import { Hash, Check } from 'lucide-react';
import { slugify } from '../../utils/slugger';

interface HeadingBlockProps {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  id?: string;
  children: React.ReactNode;
}

export const HeadingBlock: React.FC<HeadingBlockProps> = ({ level, id, children }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const extractText = (node: any): string => {
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(extractText).join('');
    if (node?.props?.children) return extractText(node.props.children);
    return '';
  };

  const text = extractText(children);
  const slug = id || slugify(text) || 'heading';

  const handleCopyAnchor = (e: React.MouseEvent) => {
    e.preventDefault();
    const url = `${window.location.origin}${window.location.pathname}#${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    const elem = document.getElementById(slug);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const anchor = (
    <a
      href={`#${slug}`}
      className="heading-anchor"
      onClick={handleCopyAnchor}
      title="Copy anchor link"
    >
      {copied ? <Check size={14} style={{ color: '#10b981' }} /> : <Hash size={14} />}
    </a>
  );

  const headingProps = {
    id: slug,
    className: 'md-heading',
    'data-heading-text': text,
    'data-heading-slug': slug,
  };

  if (level === 1) return <h1 {...headingProps}>{anchor}{children}</h1>;
  if (level === 2) return <h2 {...headingProps}>{anchor}{children}</h2>;
  if (level === 3) return <h3 {...headingProps}>{anchor}{children}</h3>;
  if (level === 4) return <h4 {...headingProps}>{anchor}{children}</h4>;
  if (level === 5) return <h5 {...headingProps}>{anchor}{children}</h5>;
  return <h6 {...headingProps}>{anchor}{children}</h6>;
};
