import { defaultSchema } from 'rehype-sanitize';
import type { Schema } from 'hast-util-sanitize';

/**
 * The sanitize schema for every rendered document. `MarkdownRenderer` (the
 * reader) and `renderDocument` (export/clipboard) both run it as their last
 * rehype plugin. Any new tag, class name or attribute emitted from markdown
 * must be added here or it is silently stripped.
 */
export const sanitizeSchema: Schema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'span',
    'div',
    'input',
  ],
  // NOTE: hast-util-sanitize resolves an attribute against the FIRST entry that
  // names it (then against the '*' list). Repeating a key — `['className', a],
  // ['className', b]` — silently drops everything after the first, so every
  // allowed value for one attribute must live in a single entry.
  attributes: {
    ...defaultSchema.attributes,
    div: [
      ...(defaultSchema.attributes?.div || []),
      ['className', /^markdown-alert(-.*)?$/, 'math-block-container', 'katex', 'katex-display', 'katex-html'],
    ],
    span: [
      ...(defaultSchema.attributes?.span || []),
      ['className', /^katex.*$/, 'image-caption', 'hljs', /^hljs-/],
    ],
    code: [['className', /^language-/, 'hljs', /^hljs-/]],
    pre: [['className', /^language-/]],
    h1: [...(defaultSchema.attributes?.h1 || []), 'id'],
    h2: [...(defaultSchema.attributes?.h2 || []), 'id'],
    h3: [...(defaultSchema.attributes?.h3 || []), 'id'],
    h4: [...(defaultSchema.attributes?.h4 || []), 'id'],
    h5: [...(defaultSchema.attributes?.h5 || []), 'id'],
    h6: [...(defaultSchema.attributes?.h6 || []), 'id'],
    // `type`, `checked` and `disabled` come from the defaults and the '*' list.
    input: [...(defaultSchema.attributes?.input || []), 'className'],
    // The defaults already allow `href`; its values are constrained by
    // `protocols` below rather than by a pattern here.
    a: [...(defaultSchema.attributes?.a || []), 'title'],
    img: ['src', 'alt', 'title', 'loading', 'className'],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: ['http', 'https', 'mailto', 'https'],
    src: ['http', 'https', 'data'],
  },
  strip: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'link', 'meta'],
  clobberPrefix: '',
};
