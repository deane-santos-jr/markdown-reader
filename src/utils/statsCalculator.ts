import type { DocumentStats } from '../types';

export function calculateDocumentStats(markdown: string): DocumentStats {
  if (!markdown) {
    return {
      words: 0,
      characters: 0,
      charactersNoSpaces: 0,
      readingTimeMinutes: 0,
      lines: 0,
      headingsCount: 0,
      linksCount: 0,
      imagesCount: 0,
      tablesCount: 0,
      codeBlocksCount: 0,
    };
  }

  const lines = markdown.split('\n');
  const characters = markdown.length;
  const charactersNoSpaces = markdown.replace(/\s+/g, '').length;
  
  // Clean markdown syntax for word count
  const cleanText = markdown
    .replace(/^---[\s\S]*?---/g, '') // remove frontmatter
    .replace(/```[\s\S]*?```/g, ' ') // remove code blocks
    .replace(/`.*?`/g, ' ') // remove inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // replace links with link text
    .replace(/[#*_~>|\\-]/g, ' ')
    .trim();

  const words = cleanText ? cleanText.split(/\s+/).filter(Boolean).length : 0;
  const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));

  // Count elements
  let headingsCount = 0;
  let linksCount = (markdown.match(/\[[^\]]+\]\([^)]+\)/g) || []).length;
  let imagesCount = (markdown.match(/!\[[^\]]*\]\([^)]+\)/g) || []).length;
  let tablesCount = (markdown.match(/\|[\s-:]+\|/g) || []).length;
  let codeBlocksCount = (markdown.match(/```/g) || []).length / 2;

  lines.forEach((line) => {
    if (/^#{1,6}\s+/.test(line.trim())) {
      headingsCount++;
    }
  });

  return {
    words,
    characters,
    charactersNoSpaces,
    readingTimeMinutes,
    lines: lines.length,
    headingsCount,
    linksCount,
    imagesCount,
    tablesCount,
    codeBlocksCount: Math.floor(codeBlocksCount),
  };
}
