import { load } from 'js-yaml';
import { JSON_SCHEMA } from 'js-yaml';

export interface ParsedDocument {
  frontmatter: Record<string, any> | null;
  rawFrontmatter: string | null;
  body: string;
}

export function parseFrontmatter(markdown: string): ParsedDocument {
  if (!markdown.startsWith('---')) {
    return { frontmatter: null, rawFrontmatter: null, body: markdown };
  }

  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: null, rawFrontmatter: null, body: markdown };
  }

  const rawYaml = match[1];
  const body = match[2];

  // Prevent Billion Laughs / huge frontmatter DoS
  if (rawYaml.length > 10_000) {
    console.warn('Frontmatter too large, ignoring');
    return { frontmatter: null, rawFrontmatter: rawYaml, body };
  }

  try {
    const parsed = load(rawYaml, { schema: JSON_SCHEMA }) as Record<string, any>;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      // Prototype pollution guard: strip dangerous keys
      const sanitized: Record<string, any> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
        sanitized[k] = v;
      }
      return {
        frontmatter: sanitized,
        rawFrontmatter: rawYaml,
        body,
      };
    }
  } catch (e) {
    console.warn('Failed to parse YAML frontmatter:', e);
  }

  return { frontmatter: null, rawFrontmatter: rawYaml, body };
}
