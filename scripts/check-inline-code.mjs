import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const server = await createServer({
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
});

try {
  const { MarkdownRenderer } = await server.ssrLoadModule(
    '/src/components/MarkdownRenderer.tsx',
  );

  const inlineHtml = renderToStaticMarkup(
    React.createElement(MarkdownRenderer, {
      content: 'Before `.md` after.',
    }),
  );

  assert.doesNotMatch(
    inlineHtml,
    /code-block-container/,
    'inline code must not render as a code-block panel',
  );
  assert.match(
    inlineHtml,
    /<p>Before <code>\.md<\/code> after\.<\/p>/,
    'inline code must remain part of its surrounding paragraph',
  );

  const fencedHtml = renderToStaticMarkup(
    React.createElement(MarkdownRenderer, {
      content: '```text\nconst answer = 42;\n```',
    }),
  );

  assert.match(
    fencedHtml,
    /code-block-container/,
    'fenced code must keep the full code-block panel',
  );

  console.log('Inline and fenced code render in their correct contexts.');
} finally {
  await server.close();
}
