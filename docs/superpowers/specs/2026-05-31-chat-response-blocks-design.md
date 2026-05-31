# Design — Extensible chat-response block system

**Date:** 2026-05-31
**Status:** Approved (brainstorming) — pending implementation plan
**Pillar:** UX beyond the terminal (`docs/roadmap.md` Phase 0)

## Problem

Today a chat/agent response is a flat string rendered in a `<pre>` via
`renderContentWithImages(msg.content)` (`MessageRow.tsx`). `_ui/MarkdownBody`
exists in name only — it also just renders a `<pre>`. There is **no markdown,
no tables, no syntax-highlighted code, no diffs**, and no notion of a typed
"block". This is the blank slate we build on.

## Goals

1. Render responses as **typed blocks** (text, table, code, diff, image, …)
   instead of preformatted text.
2. Make each block an **interactive mini-feature** with its own optional UI lib,
   local state, and an actions toolbar (e.g. table: remove column / recolor /
   export; code: format / convert-language / explain).
3. Architect it so blocks are **independent silos** that can be developed in
   parallel (separate git worktrees) once a small shared skeleton is frozen.
4. Keep the registry **open/extensible** — adding a block type must not touch
   the core.

Non-goals (YAGNI for now): persisting block edits across reloads; a structured
block data model in SQLite; block types beyond the first cut.

## Decisions (from brainstorming)

- **Two nested registries:** a message-level dispatch (role: user / assistant /
  tool / system) that, for `text` content, delegates to a markdown-level
  dispatch.
- **First-cut silos:** Code, Diff, Table, Image — as *interactive* blocks.
- **Action engine:** hybrid — deterministic local libs where they exist
  (TS↔JS, prettier, MUI column/sort ops), Claude (via the existing spawn
  pipeline) for the rest (JS→Python, explain, refactor).
- **Styling:** MUI batteries-included for the table (DataGrid), accepting a
  consistency debt; bridged to the CSS-var design tokens. This is an explicit,
  documented exception to the "no styles outside the design system" rule.

## Architecture

```
ResponseBody                       ← entry; renders one message's content
 ├─ message-level registry          Record<role, Component>  (formalizes MessageRow)
 └─ for a 'text' block:
    <ReactMarkdown components={blockRegistry}>
        table → TableBlock
        code  → CodeBlock   (lang === 'diff' → DiffBlock)
        img   → ImageBlock
        …default markdown nodes → built-in renderers
```

- `blockRegistry` is **open**: `registerBlock(match, Component)`. For
  react-markdown this is the `components` map plus a small by-language router
  for fenced code.
- `react-markdown@^10` is already installed; its `components` prop **is** the
  markdown-level registry (the parallelization seam) — nearly free.

### Block contract (the seam that enables parallel work)

Every block renders inside a shared **`BlockShell`** that owns the chrome (frame
+ hover toolbar). The block fills the body and registers its actions:

```ts
type BlockProps<TData> = {
  data: TData;               // parsed payload: code {lang, src} · table {rows, cols} · image {src, alt} · …
  raw: string;               // original source — used as fallback
  registerActions(a: BlockAction[]): void;   // populates the BlockShell toolbar
};

type BlockAction =
  | { id: string; label: string; kind: 'local';  run: () => void }                  // sync: local lib or local state
  | { id: string; label: string; kind: 'claude'; prompt: (raw: string) => string }; // async: spawn pipeline
```

A block is therefore a **pure unit**: given `data` + `raw`, it renders and
declares actions. It never reaches outside its folder. That is what makes the
four blocks independently buildable and testable.

### Hybrid transform engine

A `blockTransforms` service resolves a `BlockAction`:
- `kind: 'local'` → run synchronously (libs: `sucrase`/TypeScript for TS↔JS,
  `prettier` for format; or pure local-state mutations for MUI ops).
- `kind: 'claude'` → send `prompt(raw)` through the existing spawn IPC
  (`claude --print`), stream/await the result.

A transform result updates the block's **local ephemeral state** (view-only).
Loading/error states live in the `BlockShell` toolbar; a failed transform never
mutates content silently.

### Styling & MUI integration

- `TableBlock` uses **MUI DataGrid**. A single `muiTheme.ts` maps the MUI theme
  to the CSS-var tokens (surfaces, accent, text) so MUI blocks track the
  industrial-terminal look as closely as possible.
- `CodeBlock` uses **Shiki**, themed from the CSS-vars. `DiffBlock` uses
  **`react-diff-view`** (unified/split diff rendering).
- **CLAUDE.md exception (to be added to `src/CLAUDE.md`):** interactive block
  components MAY embed a third-party UI library (e.g. MUI) behind `BlockShell`;
  everything else still follows the CSS-var design system.

## Folder structure (silos)

```
src/components/ResponseBody/          ← root: used by AgentChat AND SessionViewer (2 parents)
  ResponseBody.tsx
  blockRegistry.ts                    ← open registry (shared; ~1 line per block)
  BlockShell/BlockShell.tsx           ← shared toolbar/chrome contract
  blocks/
    CodeBlock/                        ← silo (Shiki + transforms)
    DiffBlock/                        ← silo
    TableBlock/                       ← silo (MUI DataGrid)
    ImageBlock/                       ← silo (render + click-to-zoom)
  transforms/                         ← hybrid engine (local + claude)
```

Placement follows the project nesting convention: `ResponseBody` at the root
(two parents); blocks nested inside it (single owner).

`MessageRow` is refactored to render assistant/`text` content through
`ResponseBody` instead of the current `<pre>`. The existing
`renderContentWithImages` is superseded by `ImageBlock` (markdown `img` + raw
image URLs).

## Delivery staging (parallelization plan)

1. **Skeleton (sequential, small — freeze first):** `BlockShell`,
   `blockRegistry`, the `BlockProps`/`BlockAction` contract, the
   `blockTransforms` service interface, and `ResponseBody` wiring react-markdown.
2. **Blocks (parallel, worktrees):** CodeBlock, DiffBlock, TableBlock,
   ImageBlock — each a silo. First cut ships **rendering + local actions**;
   **Claude-powered transforms are an immediate fast-follow** (the contract
   already supports them).
   - Only shared files touched: `blockRegistry.ts` (one registration line each)
     and `package.json` (deps) → near-zero merge conflict.

## Error handling

- Each block is wrapped in an **error boundary**: a broken block falls back to a
  `<pre>` of its `raw`, never crashing the surrounding message.
- An unmatched markdown node → default markdown renderer.
- An unknown fenced-code language → plain `CodeBlock` (no highlight) rather than
  an error.

## Testing

- Per block: render with sample `data` + assert local-action behavior
  (deterministic).
- Registry: dispatch test (markdown input X → renders block Y).
- Project gate: lint (0 errors AND 0 warnings) + typecheck + `electron-vite
  build`. No heavy test harness exists today; keep block tests lightweight.

## New dependencies

`shiki` (code highlight), `@mui/material` + `@mui/x-data-grid` + `@emotion/react`
+ `@emotion/styled` (table), a diff renderer (`react-diff-view`), `prettier` and
`sucrase` (local code transforms). `react-markdown` already present.

## Open follow-ups (post-MVP)

- Persist block edits (structured block model) if users want edits to survive.
- More block types via `registerBlock` (mermaid, math/KaTeX, JSON tree, …).
- Wire `ResponseBody` into the Phase 0 **Diff pane** (shared DiffBlock).
