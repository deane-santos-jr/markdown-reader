# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Vite dev server (browser) on :5173
npm run desktop          # Vite + Electron together (dev desktop app)
npm run build            # tsc -b && vite build  — typecheck is part of the build
npm run lint             # oxlint (not eslint)
npm run build:electron   # build + electron-builder (dmg/zip, nsis, AppImage)
npm run build:electron:dir  # unpacked app dir only — faster for local verification
```

There is no test framework configured; `tsc -b` + `oxlint` are the only automated checks.

## Architecture

A Typora-style Markdown reader/editor that ships as both a browser SPA and an Electron desktop app from the same React code. `electron/main.cjs` loads `http://localhost:5173` in dev and `dist/index.html` when packaged.

### State lives in App.tsx

`src/App.tsx` (~760 lines) holds *all* application state — document text, view mode, theme, typography, workspace files, modal flags — and prop-drills it. There is no store, context, or reducer. Adding a feature almost always means adding state in `App.tsx` and threading props through `HeaderToolbar` / `Sidebar` / the view components.

The `markdown` string is the single source of truth. The four view modes (`reader | live | split | source`) are just different component trees rendered over that same string.

### Rendering pipeline

`src/components/MarkdownRenderer.tsx` is the reader. Plugin order is load-bearing:

```
remarkGfm, remarkMath → rehypeSlug → rehypeKatex → rehypeRaw → rehypeSanitize(sanitizeSchema)
```

`rehypeSanitize` runs last with a hand-maintained `sanitizeSchema` that lives in `src/utils/renderDocument.ts` and is shared with the export renderer. **Any new tag, class name, or attribute you emit from markdown must be added to that schema or it is silently stripped.** `hast-util-sanitize` resolves an attribute against the *first* entry naming it (then the `'*'` list), so all allowed values for one attribute must sit in a single entry — a repeated `['className', …]` silently does nothing. Custom renderers for headings/code/blockquote/table/img/li live in `src/components/markdown/`.

`CodeBlock` dispatches ` ```mermaid ` blocks to a lazily-imported `MermaidBlock`, which renders with `securityLevel: 'strict'` and then runs the SVG through DOMPurify before `dangerouslySetInnerHTML`.

### Export renders from markdown, not from the DOM

`src/utils/renderDocument.ts` renders the markdown string to an HTML string through the same plugin order (plus `rehypeHighlight`, since there is no `CodeBlock` component to do it), inlines ` ```mermaid ` fences as DOMPurify'd SVG, and also returns a plain-text projection for the clipboard. `exportStandaloneHTML` and `copyFormattedHtmlToClipboard` in `exportUtils.ts` both take **markdown** and call it, so export behaves identically in all four view modes — including `source`, where nothing is mounted. Do not reintroduce a DOM read (`canvasRef.current.innerHTML`) as an export source. `printDocument` is the exception: it still prints the live page.

### Heading IDs and outline navigation

`src/utils/slugger.ts` wraps `github-slugger` and is the single source of truth for heading IDs — it exists so `HeadingBlock`, `outlineExtractor`, `LiveEditorView`, and the scroll-spy all agree with what `rehype-slug` produces. Change slug generation only there.

Because the four view modes render headings differently, `handleHeadingClick` and the scroll-spy in `App.tsx` resolve a heading through a fallback chain: `#id` → `#user-content-<id>` → `[data-heading-slug]` → text match → (source mode) textarea line seek. `HeadingBlock` stamps `id`, `data-heading-slug`, and `data-heading-text` to make this work.

### LiveEditorView has its own parser

`src/components/LiveEditorView.tsx` does **not** use remark. It hand-parses the document into typed blocks (heading/code/math/table/list/quote/…) for in-place block editing, with a `hybrid` (per-block) and a `stream` (single textarea) sub-mode plus a slash-command menu. Every block mutation rewrites the whole document as `blocks.map(b => b.raw).join('\n\n')`, so editing in live mode normalizes blank-line structure across the file. Its block-splitting rules are independent of the reader's parsing — changes to one do not affect the other.

### Theming and typography

Themes are CSS custom-property blocks under `[data-theme="…"]` in `src/styles/theme-tokens.css`; `App.tsx` sets `data-theme` on `documentElement`. Typography settings are pushed as inline CSS vars (`--font-size-base`, `--content-max-width`, `--font-active`, …) on `documentElement`. Adding a theme means: extend `ThemeId` in `src/types/index.ts`, add the token block, and add it to the theme lists in `HeaderToolbar` and `Sidebar`.

User CSS is injected via `<style dangerouslySetInnerHTML>` after passing through `sanitizeCustomCss` in `App.tsx`.

### File I/O has three paths

Every open/save operation must consider all three, in this precedence:

1. **Electron** — `window.electronAPI` (exposed by `electron/preload.cjs`) → IPC handlers in `main.cjs`, which whitelist extensions (`.md/.markdown/.mdown/.mkd/.txt`) and enforce a 5 MB cap.
2. **File System Access API** — `src/utils/fileSystem.ts`, gives a writable `FileSystemFileHandle` used for autosave, plus `showDirectoryPicker` for the workspace tree.
3. **Fallback** — `<input type="file">` for open, blob download for save.

Autosave is a 600 ms debounce in `App.tsx` that writes to `localStorage` and, when a handle exists, through to disk. Persistence keys: `typora_doc_content`, `typora_theme`, `typora_typography`, `typora_custom_css`.

Desktop "Open With" is handled in `main.cjs` via the macOS `open-file` event, the `second-instance` lock (Windows/Linux), and an `argv` scan on `did-finish-load`; file associations are declared in `package.json` under `build.fileAssociations`.

### Security posture (preserve when editing)

The code carries deliberate guardrails that are easy to undo accidentally: 5 MB document/file caps in `App.tsx`, `fileSystem.ts`, and `main.cjs`; the rehype sanitize schema; `sanitizeCustomCss`; DOMPurify on Mermaid SVG (both `MermaidBlock` and `renderDocument`); HTML escaping and a restrictive CSP in `src/utils/exportUtils.ts`; the CSP meta tag in `index.html`; and `contextIsolation: true, sandbox: true, nodeIntegration: false` in the Electron window.

### Bundle splitting

`vite.config.ts` manually chunks mermaid/cytoscape/d3, katex, highlight.js, react, and lucide-react. Heavy modals (`CommandPaletteModal`, `ExportModal`, `CustomCssModal`, `LightboxModal`) and `MermaidBlock` are `React.lazy`. Keep new heavy dependencies off the critical path the same way.

## Notes

- `README.md` is the untouched Vite starter template — it describes nothing about this app.
- Keyboard shortcuts are registered in one `keydown` listener in `App.tsx` (⌘K palette, ⌘F search, ⌘1–4 view modes, ⌘\ sidebar, F11 zen).
