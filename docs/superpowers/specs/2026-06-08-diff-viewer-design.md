# Diff viewer + ask-on-line — design spec

**Date:** 2026-06-08
**Status:** approved (brainstorm), pending plan
**Topic:** render Claude's file edits as a GitHub/Claude-Desktop-style unified diff (replacing today's raw truncated tool-JSON), and add a per-line hover affordance that opens a small inline prompt (Cursor-style) to ask Claude about that line; the answer shows in an inline popover.

## 1. Goal

When Claude edits a file, the app currently shows the tool call as a truncated JSON blob (`MessageRow` tool branch). Replace that with a real **unified diff** (add/del/context, line numbers, color). Then make every line interrogable: hover → 💬 → a small inline input → ask Claude about that line → answer in an inline popover.

## 2. Key decisions (from brainstorm)

| Decision | Choice |
|---|---|
| Diff source | **Claude's file edits** — `role:'tool'` messages with `toolName ∈ {Edit, Write, MultiEdit}`, whose `content` is the JSON `input` (already captured by `spawn.service.ts`). Not ```diff blocks, not git diffs. |
| Diff view | **Unified**, GitHub/Claude-Desktop style (not split). |
| Diff algorithm | **jsdiff** (`diff` npm, `diffLines`) — robust, tiny. |
| Syntax highlighting | **Not in v1** — monospace + add/del/context coloring + line numbers. Shiki later (the current `CodeBlock` isn't highlighted either). |
| Ask answer destination | **Inline popover** under the line (Cursor-style), rendered from a **one-shot `claude --print`** call (isolated — does not pollute the conversation). |
| Ask selection granularity | **Single line** (+ surrounding context) in v1; multi-line range later. |
| One-shot LLM channel | **Reuse** the response-panel Phase 4 IPC (`window.api.transform` / an `ask`-shaped call) — no new backend. |

## 3. Architecture

### Part A — diff renderer (Phase 1)

- **Pure parser** `parseEditTool(toolName, inputJson) → FileDiff | null`:
  - `Edit` → `diffLines(old_string, new_string)` (jsdiff) → ordered lines `{ kind: 'add'|'del'|'context', oldNo: number|null, newNo: number|null, text: string }`; carries `filePath`.
  - `Write` → every line of `content` is an `add` (new/overwritten file).
  - `MultiEdit` → run each edit through the Edit path; concatenate hunks (same file).
  - Unknown tool → `null` (caller falls back to the existing `<pre>`).
- **`DiffBlock`** (`src/components/ResponseBody/blocks/DiffBlock/`): renders a `FileDiff` unified — a file header (path + tool badge), a gutter with old/new line numbers, and per-line rows colored by `kind` via a `Record<LineKind, …>` map (CLAUDE.md enum+behavior; add → `--color-active`, del → `--color-danger`, context → muted). Reuses `BlockShell` for the copy/toolbar slot.
- **Routing**: in `MessageRow`, the tool-message branch tries `parseEditTool`; on success renders `<DiffBlock diff=… />`, else keeps the current `<pre>` JSON. (Detection stays out of the markdown `blockRegistry` because tool messages aren't markdown.)

### Part B — ask-on-line (Phase 2)

- Each diff line gets a hover affordance (a 💬 icon in the gutter, same hover pattern as `BlockShell`).
- Click → an **inline mini-input** opens below the line (small, single-line, ↵ to submit, Esc to cancel).
- Submit → call the one-shot LLM IPC with `{ filePath, lineText, contextLines (a few above/below), question }`; the prompt asks Claude to explain/answer about that line.
- The answer renders as markdown in an **inline popover/expansion** under the line, dismissable. State (which line is open, the answer, loading) is local to the `DiffBlock` (a `Map<lineId, askState>` or a single "active ask" — single active ask is enough for v1).

### Dependency

Part B needs a one-shot `claude --print` IPC. The **response-panel Phase 4** introduces `window.api.transform({ kind, instruction, content })`. Part B reuses it (an `ask` shape, or a thin generalization). **Phase 2 of this feature must land after response-panel Phase 4** (or generalize that IPC).

## 4. Delivery phases (test + commit between each)

1. **Diff renderer.** jsdiff dep; `parseEditTool` (pure, unit-tested across Edit/Write/MultiEdit); `DiffBlock` (unified, colored, line numbers); route edit-tool messages through it in `MessageRow`. Big visible win, no LLM.
2. **Ask-on-line.** Per-line hover 💬 → inline mini-input → one-shot LLM (reuse Phase-4 IPC) → inline popover answer; single-line + context. Depends on response-panel Phase 4.

## 5. Out of scope (v1) → feature-requests

Multi-line range selection, split (side-by-side) view, in-diff syntax highlighting (Shiki), `NotebookEdit`, rendering ```diff markdown blocks, git diffs of the working tree, applying/editing from the diff.

## 6. Conventions

Follows `CLAUDE.md` / `src/CLAUDE.md`: no `any`; named imports; 300-line limit (split `parseEditTool` and `DiffBlock` line-row into siblings if needed); enum+behavior-map for `LineKind`; design-system CSS vars; `_ui` primitives for the input/popover (or a thin local one); `BlockShell` reuse. jsdiff is the only new dep.
