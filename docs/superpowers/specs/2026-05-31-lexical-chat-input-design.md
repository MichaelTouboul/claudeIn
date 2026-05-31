# Design — Lexical rich chat input

**Date:** 2026-05-31
**Status:** Approved (brainstorming) — pending implementation plan
**Pillar:** UX beyond the terminal (`docs/roadmap.md` Phase 0)

## Problem

The chat input is a plain `<textarea>` (`AgentChatInput.tsx`). Writing a clean,
structured prompt — especially **bullet lists**, the thing the user misses most —
is awkward in a terminal-style textarea. We want a lightweight rich editor whose
output is **markdown** (what Claude actually consumes), so structure (lists,
emphasis) is easy to author and faithfully sent.

## Goals

1. Rich text editing for a small, high-value format set, output as markdown.
2. Markdown authored two ways: a toolbar AND markdown-shortcuts while typing
   (`- `, `1. `, `**x**`, `` `x` `` auto-format).
3. Preserve the existing send ergonomics and slash-command affordance.
4. Clean ownership: the editor owns its own input behavior (keybindings, slash,
   serialization), instead of that logic living in the parent hook.

Non-goals (YAGNI): italic (deferred — same mechanism as bold, add later),
headings/quotes/links, tables, controlled-value two-way binding, persisting
drafts.

## Decisions (from brainstorming)

- **Keybindings:** `Enter` = send · `Shift+Enter` = continue (new line, or a new
  list item when the caret is inside a list).
- **Slash-commands:** plain mode — the `/` popup arms only when the editor text
  is a bare `^/\w*$` (essentially empty). Formatting and commands never mix.
- **Format set (v1):** bullet list, bold, ordered list, inline code. Italic
  deferred.
- **Library:** Lexical (`@lexical/react` + `@lexical/markdown`) — first-party
  React 19 support and first-party, bidirectional markdown.

## Architecture

The `<textarea>` is replaced by a Lexical editor. `AgentChatInput` stays the
**outer shell** (attachments preview, attach/send buttons, waiting-input
styling). All text-entry behavior moves into a new `RichEditor`.

```
src/components/AgentChat/RichEditor/
  RichEditor.tsx            ← LexicalComposer + plugins; exposes onSend(markdown) + imperative clear()
  Toolbar.tsx               ← Bold · Bullet · Ordered · Inline-code (dispatch Lexical commands)
  toMarkdown.ts             ← editor state → markdown via the shared transformer subset
  markdownTransformers.ts   ← the ONE shared subset: [UNORDERED_LIST, ORDERED_LIST, BOLD_STAR, INLINE_CODE]
  plugins/
    SubmitPlugin.tsx        ← Enter = send / Shift+Enter = insertParagraph (continue)
    SlashPlugin.tsx         ← detect bare `/...`, render + drive the command popup
```

`RichEditor` owns: formatting, keybindings, the slash popup, and markdown
serialization. `AgentChatInput` keeps only attachments + buttons + waiting
state. This is a deliberate, targeted improvement: the Enter/slash logic that
currently lives in the parent hook (`useAgentChatActions`) moves into the editor
that owns the keyboard, simplifying the parent.

## Data flow

```
keystroke → OnChangePlugin → $convertToMarkdownString(SUBSET) → onInputChange(markdown)
                                                              → plain text → SlashPlugin detection

send      → SubmitPlugin (Enter) → onSend(currentMarkdown) → parent sends to Claude → RichEditor.clear()
```

- The parent still handles **one string** (`input`), but it is now **markdown**.
  The existing send pipeline to Claude is unchanged.
- Lexical is **uncontrolled**: the editor reports markdown on change; it is reset
  via an **imperative `clear()`** (exposed through a ref / `useImperativeHandle`)
  after a send — not driven as a controlled value.
- Slash-command selection inserts the command text into the editor and is sent
  as a plain message.

## Shared transformer subset (single source of truth)

One array `[UNORDERED_LIST, ORDERED_LIST, BOLD_STAR, INLINE_CODE]` (from
`@lexical/markdown`) powers **both**:
- serialization (`$convertToMarkdownString`) — what is sent to Claude, and
- markdown-shortcuts (`MarkdownShortcutPlugin`) — what auto-formats while typing.

→ No divergence possible between what is typed, shown, and sent.

## Keybindings & slash detail

- **Enter:** if the slash popup is open → select the highlighted command;
  otherwise → `onSend(currentMarkdown)`. `preventDefault` so Lexical does not
  insert a paragraph.
- **Shift+Enter:** `selection.insertParagraph()` → a new line, or a new list
  item when the caret is inside a list (this is "continue").
- **Slash plain mode:** `SlashPlugin` reads the editor's plain text on change;
  if it matches `^/\w*$`, it opens the popup filtered by the typed token.
  `ArrowUp/Down` move the selection, `Enter` inserts. No caret tracking inside
  rich content — simple and robust.

## Error handling

- If `$convertToMarkdownString` throws, fall back to the editor's plain text
  (`$getRoot().getTextContent()`); never send empty silently.
- Send is disabled when the serialized markdown is empty and there are no
  attachments (mirrors current behavior).

## Testing

- **Serialization is the key seam** and runs headless: `createEditor` + an
  `editor.update(...)` building bold/list/code nodes + `$convertToMarkdownString`
  → assert the exact markdown string. Pure, deterministic — ideal TDD (Vitest,
  added by the block-system skeleton).
- Toolbar command dispatch + keybindings: lighter RTL tests.
- Project gate as usual: lint (0/0) + typecheck + `electron-vite build`.

## New dependencies

`lexical`, `@lexical/react`, `@lexical/markdown`, `@lexical/list`.

## Scope boundary

- The attachments preview, attach button, send button, and waiting-input styling
  in `AgentChatInput` are **untouched** (orthogonal).
- Only the text-entry `<textarea>` is replaced, and the Enter/slash logic moves
  out of `useAgentChatActions` into `RichEditor`.

## Follow-ups (post-v1)

- Italic (`BOLD_ITALIC_STAR`/italic transformer) — same mechanism as bold.
- Code block, headings, links if prompt-authoring demand appears.
- Optional: restore full in-content slash-command support if plain mode proves
  limiting.
