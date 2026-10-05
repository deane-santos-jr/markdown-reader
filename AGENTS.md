# AGENTS.md

A local Markdown and plain-text writer. One React codebase runs as a browser app and as an Electron desktop app; `electron/main.cjs` loads `http://localhost:5173` in dev and `dist/index.html` when packaged.

## Checks

A change is done when `npm run build` (includes `tsc -b`), `npm test` (Vitest), and `npm run lint` (oxlint) all pass. `npm run check:inline-code` server-renders `MarkdownRenderer` to guard inline-code output; run it after touching the renderer. `npm run build:electron:dir` builds an unpacked desktop app for quick verification.

## Document model

`src/utils/documentLifecycle.ts` owns the document model. A `WriterDocument` changes only through its pure transitions (`editDocument`, `beginSaving`, `finishSaving`, `failSaving`, and the rest), and `documentLifecycle.test.ts` covers them. New document behaviour goes there, with a test.

- `format` is `markdown`, `text`, or `neutral`. An untitled draft is `neutral` until the user picks a format at first save.
- Only `markdown` documents get the preview and split views; every other format stays in the write view.
- Content is held with `\n` line endings and no BOM. `serializeDocument` restores the file's original line endings and BOM, so every write to disk goes through it.

`src/App.tsx` holds all UI state in `useState` and prop-drills it; there is no store or context. A new feature usually means state in `App.tsx` threaded through `HeaderToolbar`, `Sidebar`, and the views.

## Saving and recovery

- A dirty document writes a recovery snapshot to `localStorage` after 200 ms, offered back on next launch.
- A dirty document with a path autosaves to disk after 600 ms, in Electron or when a File System Access handle exists. Recovered documents wait for an explicit save.
- Every save sends the file's last-known modified time. When the file changed on disk, the save returns `conflict` and the UI asks before overwriting. Both `electron/main.cjs` and `src/utils/fileSystem.ts` enforce this.

File I/O has three paths, in precedence: Electron IPC (`window.electronAPI`, exposed by `electron/preload.cjs`), the File System Access API (`src/utils/fileSystem.ts`), then `<input type="file">` and blob download. An open or save change covers all three.

`localStorage` keys: `writer_recovery_v1`, `writer_recents_v1`, `typora_theme`, `typora_typography`, `typora_custom_css`. `typora_doc_content` is legacy: on load it becomes a recovery snapshot and is removed. Recent files are tracked only in Electron.

## Rendering

`src/components/MarkdownRenderer.tsx` renders the preview. Plugin order is load-bearing:

```
remarkGfm, remarkMath → rehypeSlug → rehypeKatex → rehypeRaw → rehypeSanitize(sanitizeSchema)
```

`src/utils/sanitizeSchema.ts` is shared with export. A tag, class, or attribute missing from it is stripped silently. `hast-util-sanitize` resolves an attribute against the first entry naming it, so all allowed values for one attribute sit in a single entry.

- Custom element renderers live in `src/components/markdown/`. `CodeBlock` hands mermaid fences to a lazy `MermaidBlock`, which renders at `securityLevel: 'strict'` and passes the SVG through DOMPurify.
- Export (`exportStandaloneHTML`, `copyFormattedHtmlToClipboard`) renders from the markdown string through `src/utils/renderDocument.ts`, so it works in every view. `printDocument` prints the live page.
- Heading IDs come from `src/utils/slugger.ts` alone, so `HeadingBlock`, `outlineExtractor`, and `rehype-slug` agree. Slug rules change there.

## Theming

Themes are `[data-theme="…"]` token blocks in `src/styles/theme-tokens.css`. To add one: extend `ThemeId` in `src/types/index.ts`, add the block, and add it to the theme lists in `HeaderToolbar` and `Sidebar`. Typography settings are CSS variables on `documentElement`. User CSS passes through `sanitizeCustomCss` in `App.tsx`.

## Security guardrails

Each of these is easy to undo by accident; keep them intact:

- 5 MB caps: `MAX_DOCUMENT_BYTES` (used by `App.tsx` and `fileSystem.ts`) and `MAX_FILE_SIZE` in `electron/main.cjs`
- the sanitize schema, `sanitizeCustomCss`, and DOMPurify on Mermaid SVG in both `MermaidBlock` and `renderDocument`
- the CSP meta tag in `index.html` and the CSP written into exported HTML by `exportUtils.ts`
- the Electron window's `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, and IPC accepting only `.md`, `.markdown`, `.mdown`, `.mkd`, `.txt`

## Desktop and performance

- Desktop "Open With" arrives three ways in `main.cjs`: the macOS `open-file` event, `second-instance` on Windows and Linux, and an `argv` scan on `did-finish-load`. File associations live in `package.json` under `build.fileAssociations`.
- `vite.config.ts` splits mermaid, katex, highlight.js, react, and lucide-react into vendor chunks, and the modals plus `MermaidBlock` load through `React.lazy`. New heavy dependencies load the same way.
- Keyboard shortcuts are registered in the single `keydown` listener in `App.tsx`.
