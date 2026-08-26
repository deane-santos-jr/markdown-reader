export function printDocument() {
  window.print();
}

function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function sanitizeFilename(name: string): string {
  const base = name.slice(0, 100).toLowerCase().replace(/[^\w-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  return base || 'document';
}

export function downloadMarkdown(content: string, filename: string = 'document.md') {
  const MAX_MD_SIZE = 10 * 1024 * 1024;
  if (content.length > MAX_MD_SIZE) {
    console.warn('Markdown too large, truncating download');
    content = content.slice(0, MAX_MD_SIZE);
  }
  const safeFilename = sanitizeFilename(filename.replace(/\.md$/i, '')) + '.md';
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadPlainText(content: string, filename: string = 'document.txt') {
  const safeFilename = sanitizeFilename(filename.replace(/\.txt$/i, '')) + '.txt';
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = safeFilename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function exportStandaloneHTML(markdown: string, title: string = 'Document') {
  const safeTitle = escapeHtmlAttr(title.slice(0, 200));
  const { renderDocument } = await import('./renderDocument');
  const { html } = await renderDocument(markdown);
  // Already sanitized by the render pipeline; this strip is belt-and-braces.
  const safeHtml = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; font-src https://fonts.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; img-src https: data:; connect-src 'none'">
  <title>${safeTitle}</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.65;
      color: #24292e;
      background: #ffffff;
      margin: 0;
      padding: 3rem 1.5rem;
    }
    .markdown-body {
      max-width: 860px;
      margin: 0 auto;
    }
    h1, h2, h3, h4, h5, h6 { color: #1b1f23; font-weight: 600; }
    h1 { border-bottom: 1px solid #eaecef; padding-bottom: .3em; }
    h2 { border-bottom: 1px solid #eaecef; padding-bottom: .3em; }
    pre { background: #f6f8fa; padding: 1em; border-radius: 6px; overflow-x: auto; }
    code { font-family: 'JetBrains Mono', monospace; }
    blockquote { border-left: 4px solid #0366d6; margin: 1em 0; padding: 0.5em 1em; background: #f1f8ff; }
    table { width: 100%; border-collapse: collapse; margin: 1em 0; }
    th, td { border: 1px solid #dfe2e5; padding: 6px 13px; }
    th { background: #f6f8fa; }
    tr:nth-child(2n) { background: #f8f8f8; }
    img { max-width: 100%; border-radius: 6px; }
    .mermaid-diagram { margin: 1.5em 0; text-align: center; }
    .mermaid-diagram svg { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  <div class="markdown-body">
    ${safeHtml}
  </div>
</body>
</html>`;

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFilename(title)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function copyFormattedHtmlToClipboard(markdown: string): Promise<boolean> {
  let rendered: { html: string; text: string };
  try {
    const { renderDocument } = await import('./renderDocument');
    rendered = await renderDocument(markdown);
  } catch (err) {
    console.error('Failed to render document for clipboard:', err);
    return false;
  }

  try {
    const data = [
      new ClipboardItem({
        'text/html': new Blob([rendered.html], { type: 'text/html' }),
        'text/plain': new Blob([rendered.text], { type: 'text/plain' }),
      }),
    ];

    await navigator.clipboard.write(data);
    return true;
  } catch (err) {
    console.error('Failed to copy formatted text to clipboard:', err);
    // Fallback to plain text
    if (rendered.text) {
      await navigator.clipboard.writeText(rendered.text);
      return true;
    }
    return false;
  }
}
