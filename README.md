# Markdown Reader

A local Markdown and plain-text writer. One React codebase ships as a desktop app for macOS, Windows, and Linux (Electron) and as a browser app.

![Start screen](docs/assets/start-screen.png)

## Features

- Write, preview, or split view over the same document (`⌘1`, `⌘2`, `⌘3`)
- GitHub-flavored Markdown, KaTeX math, Mermaid diagrams, syntax highlighting, and YAML front matter
- Outline sidebar that follows your scroll position, plus word count and reading time
- Six reading themes, adjustable typography, and custom CSS
- Command palette (`⌘K`), in-document search (`⌘F`), and zen mode (`F11`)
- Export to standalone HTML, copy as rich text, or print
- Opens `.md`, `.markdown`, `.mdown`, `.mkd`, and `.txt` files from Finder or Explorer
- Recovers unsaved work after a crash or reload

## Security model

A Markdown file can carry raw HTML, so every document is treated as untrusted input.

- Rendered HTML passes through a sanitize allowlist, and Mermaid SVG is cleaned with DOMPurify before it reaches the page.
- The Electron window runs with context isolation, the sandbox on, and Node integration off. File IPC accepts only known text extensions and rejects files over 5 MB.
- The app and every exported HTML file ship with a restrictive Content Security Policy.

## Development

```bash
npm install
npm run desktop          # Electron app with hot reload
npm run dev              # browser only, http://localhost:5173
npm test                 # Vitest
npm run lint             # oxlint
npm run build:electron   # installers in release/: dmg and zip (macOS), nsis (Windows), AppImage (Linux)
```

## Stack

React 19, TypeScript, Vite, Electron, unified (remark and rehype), KaTeX, Mermaid, highlight.js, Vitest, oxlint.
