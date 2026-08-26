import type { OutlineHeading } from '../types';
import { createSlugger } from './slugger';

export function extractOutline(markdown: string): OutlineHeading[] {
  const headings: OutlineHeading[] = [];
  const lines = markdown.split('\n');
  const getSlug = createSlugger();

  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Toggle code block state
    if (line.trim().startsWith('```') || line.trim().startsWith('~~~')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) continue;

    // Match ATX headings (# Heading)
    const atxMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (atxMatch) {
      const level = atxMatch[1].length;
      let text = atxMatch[2].trim();

      // Strip trailing ATX hashes (e.g., ## Title ##)
      text = text.replace(/\s+#+\s*$/, '');
      // Strip HTML tags
      text = text.replace(/<[^>]+>/g, '');
      // Strip markdown links and formatting inside heading text for clean outline
      text = text
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [link](url) -> link
        .replace(/[*_~`]/g, '') // remove bold, italic, code
        .trim();

      const slug = getSlug(text, i);

      headings.push({
        id: slug,
        text,
        level,
        line: i + 1,
      });
    }
  }

  return headings;
}
