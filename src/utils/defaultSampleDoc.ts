export const DEFAULT_MARKDOWN_SHOWCASE = `---
title: "Typora Markdown Reader — Showcase & Guide"
author: "Antigravity Engineering"
date: "2026-08-16"
tags: ["markdown", "typora", "katex", "mermaid", "reader"]
version: "2.0.0"
status: "Published"
---

# Welcome to Typora Markdown Reader

A pristine, high-performance Markdown Reader and Live Editor inspired by **Typora**. Designed with distraction-free typography, instant outline navigation, math formulas, dynamic mermaid diagrams, and curated reading themes.

> [!TIP]
> You can open any local \`.md\` file using the **Open** button in the toolbar, or simply drag and drop your markdown files directly into this window!

---

## 🎯 Key Capabilities at a Glance

- 📖 **Distraction-Free Reader**: Crisp typography with configurable font family, size, line-height, and content width.
- ⚡ **Typora Live-Preview & Source Modes**: Seamlessly switch between pure reading, live editing, side-by-side split, and raw source.
- 📐 **Math & Formulas (KaTeX)**: Flawless inline and display formula rendering with one-click LaTeX copy.
- 📊 **Interactive Diagrams (Mermaid.js)**: Flowcharts, sequence diagrams, mindmaps, and git graphs rendered on the fly.
- 🎨 **Curated Theme Presets**: *Typora Classic*, *Academic Serif*, *Nordic Night*, *Solarized Sepia*, *Monochrome*, and *Cyber Dark*.
- 📑 **Dynamic Outline (TOC)**: Real-time table of contents with scroll-spy tracking.
- 🖨️ **Pixel-Perfect Export**: Print to vector PDF, export to standalone HTML, or copy rich formatted HTML.

---

## 💡 GitHub Alerts & Callouts

> [!NOTE]
> This is a **Note** alert. Useful for providing helpful context, background information, or design notes without disrupting the main text.

> [!TIP]
> This is a **Tip** alert. Perfect for sharing handy shortcuts, performance optimizations, and best practices.

> [!IMPORTANT]
> This is an **Important** alert. Highlights critical requirements, architectural rules, and mandatory steps.

> [!WARNING]
> This is a **Warning** alert. Urges caution for breaking changes, deprecated APIs, or potential pitfalls.

> [!CAUTION]
> This is a **Caution** alert. Used for high-risk actions that could cause data loss or dangerous operations.

---

## 🧮 KaTeX Mathematical Formulas

Typora supports full $\\LaTeX$ math rendering for both inline and display math expressions.

### Inline Math
Euler's identity is frequently called the most beautiful theorem in mathematics: $e^{i\\pi} + 1 = 0$. We can also express relativistic mass-energy equivalence as $E = mc^2$, and the quadratic formula as $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$.

### Display Block Equations

The Gaussian Normal Distribution probability density function:

$$
f(x | \\mu, \\sigma^2) = \\frac{1}{\\sqrt{2\\pi \\sigma^2}} \\exp\\left( -\\frac{(x - \\mu)^2}{2\\sigma^2} \\right)
$$

The Schrödinger equation describing wave mechanics in quantum systems:

$$
i\\hbar \\frac{\\partial}{\\partial t} \\Psi(\\mathbf{r}, t) = \\left[ -\\frac{\\hbar^2}{2m} \\nabla^2 + V(\\mathbf{r}, t) \\right] \\Psi(\\mathbf{r}, t)
$$

Maxwell's Equations in differential form:

$$
\\begin{aligned}
\\nabla \\cdot \\mathbf{E} &= \\frac{\\rho}{\\varepsilon_0} & \\quad \\text{(Gauss's Law)} \\\\
\\nabla \\cdot \\mathbf{B} &= 0 & \\quad \\text{(Gauss's Law for Magnetism)} \\\\
\\nabla \\times \\mathbf{E} &= -\\frac{\\partial \\mathbf{B}}{\\partial t} & \\quad \\text{(Faraday's Law of Induction)} \\\\
\\nabla \\times \\mathbf{B} &= \\mu_0 \\left( \\mathbf{J} + \\varepsilon_0 \\frac{\\partial \\mathbf{E}}{\\partial t} \\right) & \\quad \\text{(Ampère-Maxwell Law)}
\\end{aligned}
$$

---

## 📊 Interactive Mermaid Diagrams

Typora renders diagrams natively from declarative code blocks using Mermaid.js:

\`\`\`mermaid
flowchart TD
    Start([🚀 Open Markdown File]) --> Parse[Extract AST & Frontmatter]
    Parse --> ModeCheck{Select View Mode}
    ModeCheck -->|Reader| RenderView[📐 Pristine Typography Canvas]
    ModeCheck -->|Live Edit| LiveEditor[⚡ In-Place Live Preview]
    ModeCheck -->|Split| SplitView[↔️ Synchronized Editor & Preview]
    
    RenderView --> Features[Math + Diagrams + Outline + Alerts]
    LiveEditor --> Features
    SplitView --> Features
    
    Features --> Export{Export Options}
    Export --> PDF[📄 Vector PDF Print]
    Export --> HTML[🌐 Standalone HTML]
    Export --> Clipboard[📋 Copy Formatted HTML]
\`\`\`

Here is an architectural sequence diagram for document synchronization:

\`\`\`mermaid
sequenceDiagram
    autonumber
    actor User
    participant Toolbar as 🎛️ Header Toolbar
    participant Engine as ⚙️ Markdown Engine
    participant TOC as 📑 Outline / TOC
    participant Storage as 💾 Auto-Save Storage

    User->>Toolbar: Opens document or types changes
    Toolbar->>Engine: Stream markdown AST
    Engine->>TOC: Recompute H1-H6 outline hierarchy
    Engine->>Storage: Debounced persistence (500ms)
    Storage-->>Toolbar: Update Saved Status badge
\`\`\`

---

## 💻 Code Blocks & Syntax Highlighting

Typora provides high-contrast syntax highlighting with language detection, line numbers, and instant one-click copy buttons:

\`\`\`typescript
import { useState, useEffect, useMemo } from 'react';

export interface DocumentState {
  id: string;
  title: string;
  content: string;
  isDirty: boolean;
}

export function useMarkdownDocument(initialMarkdown: string) {
  const [content, setContent] = useState<string>(initialMarkdown);
  const [isSaved, setIsSaved] = useState<boolean>(true);

  // Calculate live statistics
  const stats = useMemo(() => {
    const words = content.trim().split(/\\s+/).filter(Boolean).length;
    const readingTime = Math.ceil(words / 200);
    return { words, readingTime };
  }, [content]);

  return { content, setContent, stats, isSaved };
}
\`\`\`

\`\`\`python
# Fast asynchronous markdown batch processing in Python
import asyncio
from pathlib import Path

async def process_markdown_file(file_path: Path) -> dict:
    text = file_path.read_text(encoding="utf-8")
    lines = text.splitlines()
    title = lines[0].lstrip("# ").strip() if lines else "Untitled"
    word_count = len(text.split())
    
    return {
        "path": str(file_path),
        "title": title,
        "words": word_count,
        "status": "ready"
    }
\`\`\`

---

## 📋 Interactive Task Lists & Tables

### Feature Checklist
- [x] Full CommonMark & GitHub Flavored Markdown (GFM)
- [x] Real-time Table of Contents with active scroll spy
- [x] Math equation rendering with KaTeX
- [x] Dynamic Mermaid flowchart and sequence diagram engine
- [x] Curated reading themes (Typora Classic, Academic, Nord, Sepia, Monochrome, Cyber)
- [x] Focus Mode & Typewriter Mode
- [x] In-document search with match navigation (\`Cmd+F\`)
- [ ] Direct cloud sync integration (Upcoming)

### Performance & Benchmark Matrix

| Rendering Engine | Startup Time | Memory Footprint | Math Render Speed | Diagram Support |
| :--- | :---: | :---: | :---: | :---: |
| **Typora Reader Engine** | **< 120ms** | **~38 MB** | **Sub-millisecond** | **Mermaid Native** |
| Standard Electron | ~850ms | ~180 MB | Variable | Plugin Required |
| Web Default Tab | ~250ms | ~65 MB | Fast | External Script |

---

## 🖋️ Typography & Quote Formatting

> "Simplicity is about subtracting the obvious and adding the meaningful."
> 
> — **John Maeda**, *The Laws of Simplicity*

### Footnotes & References
Markdown allows deep referencing through footnotes[^1]. You can also link to external documentation such as [CommonMark Specification](https://spec.commonmark.org/) or [KaTeX Documentation](https://katex.org/).

[^1]: Footnotes render neatly at the bottom of the document with back-links for effortless navigation.

---

## ⌨️ Useful Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Cmd</kbd> + <kbd>O</kbd> | Open local Markdown file |
| <kbd>Cmd</kbd> + <kbd>S</kbd> | Save document |
| <kbd>Cmd</kbd> + <kbd>E</kbd> | Toggle between Reader and Live Editor |
| <kbd>Cmd</kbd> + <kbd>K</kbd> | Open Command Palette |
| <kbd>Cmd</kbd> + <kbd>F</kbd> | Search in document |
| <kbd>Cmd</kbd> + <kbd>P</kbd> | Print / Save as PDF |
| <kbd>Cmd</kbd> + <kbd>\\</kbd> | Toggle Sidebar (Outline / Files) |

Enjoy your writing and reading experience!
`;
