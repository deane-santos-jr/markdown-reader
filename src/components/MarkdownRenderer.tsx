import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeSlug from 'rehype-slug';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { sanitizeSchema } from '../utils/sanitizeSchema';
import { CodeBlock } from './markdown/CodeBlock';
import { CalloutBlock } from './markdown/CalloutBlock';
import { HeadingBlock } from './markdown/HeadingBlock';
import { ImageBlock } from './markdown/ImageBlock';
import { TableBlock } from './markdown/TableBlock';
import { ChevronDown, ChevronRight, Tag } from 'lucide-react';
import type { Element } from 'hast';

interface MarkdownRendererProps {
  content: string;
  frontmatter?: Record<string, any> | null;
  onImageClick?: (src: string, alt?: string) => void;
  focusMode?: boolean;
  onToggleTask?: (taskIndex: number) => void;
}

interface RenderedCodeProps {
  className?: string;
  children?: React.ReactNode;
}

interface MarkdownPreProps {
  children?: React.ReactNode;
  node?: Element;
}

const MarkdownPre: React.FC<MarkdownPreProps> = ({ children, node }) => {
  const childNodes = React.Children.toArray(children);
  const hastChild = node?.children.length === 1 ? node.children[0] : null;
  const containsCode = hastChild?.type === 'element' && hastChild.tagName === 'code';
  const codeElement =
    containsCode &&
    childNodes.length === 1 &&
    React.isValidElement<RenderedCodeProps>(childNodes[0])
      ? childNodes[0]
      : null;

  if (!codeElement) {
    return <pre>{children}</pre>;
  }

  return (
    <CodeBlock className={codeElement.props.className}>
      {codeElement.props.children}
    </CodeBlock>
  );
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  frontmatter,
  onImageClick,
  focusMode = false,
  onToggleTask,
}) => {
  const [showFrontmatter, setShowFrontmatter] = useState<boolean>(true);

  const taskCounterRef = useRef(0);
  taskCounterRef.current = 0;

  return (
    <div className={`markdown-body ${focusMode ? 'focus-mode' : ''}`}>
      {/* Frontmatter YAML Metadata Inspector */}
      {frontmatter && Object.keys(frontmatter).length > 0 && (
        <div className="frontmatter-badge-container no-print">
          <div
            className="frontmatter-header"
            onClick={() => setShowFrontmatter(!showFrontmatter)}
            title="Click to toggle frontmatter details"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Tag size={13} style={{ color: 'var(--accent-primary)' }} />
              <span>Metadata & Frontmatter</span>
            </div>
            <div>{showFrontmatter ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</div>
          </div>
          {showFrontmatter && (
            <table className="frontmatter-table">
              <tbody>
                {Object.entries(frontmatter).map(([key, val]) => (
                  <tr key={key}>
                    <td className="frontmatter-key">{key}</td>
                    <td className="frontmatter-val">
                      {Array.isArray(val)
                        ? val.map((v) => (
                            <span
                              key={String(v)}
                              style={{
                                display: 'inline-block',
                                background: 'var(--bg-hover)',
                                padding: '1px 6px',
                                borderRadius: '3px',
                                marginRight: '4px',
                                fontSize: '0.8em',
                              }}
                            >
                              {String(v)}
                            </span>
                          ))
                        : typeof val === 'object' && val !== null
                        ? JSON.stringify(val)
                        : String(val)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Markdown Document Content */}
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeSlug, rehypeKatex, rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
        components={{
          h1: ({ children, id }) => <HeadingBlock level={1} id={id}>{children}</HeadingBlock>,
          h2: ({ children, id }) => <HeadingBlock level={2} id={id}>{children}</HeadingBlock>,
          h3: ({ children, id }) => <HeadingBlock level={3} id={id}>{children}</HeadingBlock>,
          h4: ({ children, id }) => <HeadingBlock level={4} id={id}>{children}</HeadingBlock>,
          h5: ({ children, id }) => <HeadingBlock level={5} id={id}>{children}</HeadingBlock>,
          h6: ({ children, id }) => <HeadingBlock level={6} id={id}>{children}</HeadingBlock>,
          code: ({ className, children }) => <code className={className}>{children}</code>,
          pre: ({ children, node }) => <MarkdownPre node={node}>{children}</MarkdownPre>,
          blockquote: ({ children }) => <CalloutBlock>{children}</CalloutBlock>,
          table: ({ children }) => <TableBlock>{children}</TableBlock>,
          img: ({ src, alt }) => <ImageBlock src={src} alt={alt} onImageClick={onImageClick} />,
          li: ({ children, className }) => {
            const isTask = className?.includes('task-list-item');
            if (isTask) {
              const currentTaskIndex = taskCounterRef.current++;
              return (
                <li
                  className={className}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).tagName === 'INPUT') {
                      if (onToggleTask) onToggleTask(currentTaskIndex);
                    }
                  }}
                >
                  {children}
                </li>
              );
            }
            return <li className={className}>{children}</li>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
