import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import { sanitizeSchema } from './sanitizeSchema';
import { parseFrontmatter } from './frontmatterParser';

export interface RenderedDocument {
  /** Sanitized HTML for the document body — no app chrome, no view-mode dependency. */
  html: string;
  /** The same document as plain text, for the text/plain clipboard flavor. */
  text: string;
}

interface RenderOptions {
  /** Render ```mermaid fences to inline SVG. Off yields a plain code block. */
  renderDiagrams?: boolean;
}

/** Minimal structural view of a hast node — enough to walk and rewrite the tree. */
interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

const MAX_CHART_SIZE = 50_000;
let mermaidIdCounter = 0;

// Same plugin order as MarkdownRenderer: gfm/math → slug → katex → raw → sanitize.
// rehypeHighlight sits before sanitize; its hljs-* spans are allow-listed there.
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeSlug)
  .use(rehypeKatex)
  .use(rehypeRaw)
  .use(rehypeHighlight, { detect: false, ignoreMissing: true })
  .use(rehypeSanitize, sanitizeSchema)
  .use(rehypeStringify, { allowDangerousHtml: true })
  .freeze();

/**
 * Render a markdown document to a standalone HTML string.
 *
 * This is the seam every export path crosses: markdown in, HTML out, with no
 * dependency on what is currently mounted, so it behaves the same in all four
 * view modes. Frontmatter is stripped, matching what the reader displays.
 */
export async function renderDocument(
  markdown: string,
  options: RenderOptions = {}
): Promise<RenderedDocument> {
  const { renderDiagrams = true } = options;
  const body = parseFrontmatter(markdown).body;

  const tree = (await processor.run(processor.parse(body))) as unknown as HastNode;

  if (renderDiagrams) {
    await inlineMermaidDiagrams(tree);
  }

  return {
    html: processor.stringify(tree as never),
    text: extractText(tree),
  };
}

/** Replace ```mermaid code blocks with sanitized inline SVG, in place. */
async function inlineMermaidDiagrams(tree: HastNode): Promise<void> {
  if (typeof document === 'undefined') return;

  const targets: { parent: HastNode; index: number; chart: string }[] = [];

  const collect = (node: HastNode) => {
    const children = node.children;
    if (!children) return;
    children.forEach((child, index) => {
      if (child.tagName === 'pre') {
        const code = child.children?.find((c) => c.tagName === 'code');
        if (code && hasClass(code, 'language-mermaid')) {
          targets.push({ parent: node, index, chart: extractText(code).trim() });
          return;
        }
      }
      collect(child);
    });
  };
  collect(tree);

  if (targets.length === 0) return;

  let mermaid: typeof import('mermaid').default;
  let DOMPurify: typeof import('dompurify').default;
  try {
    [{ default: mermaid }, { default: DOMPurify }] = await Promise.all([
      import('mermaid'),
      import('dompurify'),
    ]);
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'strict',
      fontFamily: 'Inter, sans-serif',
    });
  } catch (err) {
    // No diagram engine — every fence stays a code block, the export still works.
    console.warn('Mermaid unavailable during export:', err);
    return;
  }

  for (const target of targets) {
    try {
      const { svg } = await mermaid.render(
        `mermaid-export-${++mermaidIdCounter}`,
        target.chart.slice(0, MAX_CHART_SIZE)
      );
      const sanitized = DOMPurify.sanitize(svg, {
        USE_PROFILES: { svg: true, svgFilters: true },
        FORBID_TAGS: ['script', 'foreignObject'],
        FORBID_ATTR: ['onload', 'onerror', 'onclick', 'onmouseover'],
      });
      target.parent.children![target.index] = {
        type: 'raw',
        value: `<div class="mermaid-diagram">${sanitized}</div>`,
      };
    } catch (err) {
      // Leave the fenced code block in place — a broken diagram still exports
      // as its own source.
      console.warn('Mermaid render failed during export:', err);
    }
  }
}

function hasClass(node: HastNode, className: string): boolean {
  const value = node.properties?.className;
  return Array.isArray(value) && value.includes(className);
}

const BLOCK_TAGS = new Set([
  'p', 'div', 'section', 'article', 'blockquote', 'pre', 'li', 'tr', 'br', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'thead', 'tbody', 'ul', 'ol',
]);

/** Plain-text projection of a hast tree, roughly what the rendered page reads as. */
function extractText(node: HastNode): string {
  let out = '';

  const walk = (current: HastNode) => {
    if (current.type === 'text') {
      out += current.value ?? '';
      return;
    }
    // KaTeX emits the same math twice — as MathML and as styled HTML. Keep one.
    if (current.type !== 'element' && current.type !== 'root') return;
    if (hasClass(current, 'katex-mathml')) return;

    current.children?.forEach(walk);

    if (current.tagName && BLOCK_TAGS.has(current.tagName)) out += '\n';
  };

  walk(node);
  return out.replace(/\n{3,}/g, '\n\n').trim();
}
