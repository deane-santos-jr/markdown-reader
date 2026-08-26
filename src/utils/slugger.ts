import GithubSlugger, { slug as githubSlug } from 'github-slugger';

/**
 * Unified slugger — single source of truth for heading IDs.
 * Used by MarkdownRenderer (via HeadingBlock), outlineExtractor, and scroll-spy.
 * Uses github-slugger directly for 100% parity with rehype-slug.
 */
export function slugify(text: string): string {
  const s = githubSlug(text);
  return s || 'heading';
}

export function createSlugger() {
  const slugger = new GithubSlugger();
  return (text: string, index?: number): string => {
    const s = slugger.slug(text);
    if (!s) return `heading-${index ?? 0}`;
    return s;
  };
}

