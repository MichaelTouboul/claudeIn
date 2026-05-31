# Lexical Rich Chat Input — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the chat `<textarea>` with a Lexical editor that outputs markdown (bullet/ordered lists, bold, inline code), with `Enter`=send, `Shift+Enter`=continue, and slash-commands in plain mode.

**Architecture:** A self-contained `RichEditor` owns the Lexical editor, toolbar, keybindings, slash popup, and markdown serialization. It reports markdown via `onChange` and triggers `onSubmit`; the parent (`AgentChat`) keeps a markdown string and clears the editor imperatively after send. One shared transformer subset drives both serialization and markdown-shortcuts.

**Tech Stack:** React 19, TypeScript, Lexical (`lexical`, `@lexical/react`, `@lexical/markdown`, `@lexical/list`), Vitest + RTL (from the block-system skeleton).

**Spec:** `docs/superpowers/specs/2026-05-31-lexical-chat-input-design.md`

**⚠️ Prerequisite:** The block-system skeleton (`docs/superpowers/plans/2026-05-31-chat-response-blocks-skeleton.md`) must be **merged to `main` first** — it adds Vitest, RTL, and the test config this plan relies on. Task 1 verifies this.

**Verification:** project gate per task — `npm run typecheck` (0 errors), `npm run lint` (0 errors AND 0 warnings; `npm run lint:fix` first for import sorting), relevant Vitest tests, and for the integration task `npx electron-vite build`.

**Test-design note:** Lexical's DOM/keyboard behavior is hard to test reliably in jsdom (contentEditable + selection are limited). This plan TDDs the **pure-logic seams** (markdown round-trip serialization, slash matcher) with real assertions, and verifies the editor/plugins/integration via typecheck + build + a manual check. Do not try to simulate contentEditable typing in unit tests.

---

## File structure

```
src/components/AgentChat/RichEditor/
  RichEditor.tsx              ← LexicalComposer + plugins; props onChange/onSubmit/commands + ref {clear, focus}
  Toolbar.tsx                 ← Bold · Bullet · Ordered · Inline-code buttons
  markdownTransformers.ts     ← shared subset: [UNORDERED_LIST, ORDERED_LIST, BOLD_STAR, INLINE_CODE]
  serialize.ts                ← editorToMarkdown(editor) + matchSlashQuery(text)
  serialize.test.ts
  plugins/
    SubmitPlugin.tsx          ← Enter=submit / Shift+Enter=insertParagraph
    SlashPlugin.tsx           ← plain-mode `/` popup
```

Modified: `package.json`, `src/components/AgentChat/AgentChatInput/AgentChatInput.tsx`, `src/components/AgentChat/AgentChat.tsx`, `src/hooks/useAgentChatActions.ts`.

---

## Task 1: Prerequisite check + Lexical deps

**Files:** Modify `package.json`

- [ ] **Step 1: Verify the skeleton is merged (Vitest present)**

Run: `grep -c '"vitest"' package.json`
Expected: `1` (or more). If `0`, STOP — merge the block-system skeleton branch into the current branch first, then resume.

- [ ] **Step 2: Install Lexical**

Run:
```bash
npm install lexical @lexical/react @lexical/markdown @lexical/list
```
Expected: deps added, no errors.

- [ ] **Step 3: Verify the test runner still works**

Run: `npm run test`
Expected: existing skeleton tests pass.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "build(deps): add Lexical for the rich chat input"
```

---

## Task 2: Shared transformer subset

**Files:** Create `src/components/AgentChat/RichEditor/markdownTransformers.ts`

- [ ] **Step 1: Write the subset**

```ts
import {
  BOLD_STAR,
  INLINE_CODE,
  ORDERED_LIST,
  type Transformer,
  UNORDERED_LIST,
} from '@lexical/markdown';

/** The ONE source of truth — drives both serialization and markdown-shortcuts. */
export const CHAT_TRANSFORMERS: Transformer[] = [
  UNORDERED_LIST,
  ORDERED_LIST,
  BOLD_STAR,
  INLINE_CODE,
];
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/AgentChat/RichEditor/markdownTransformers.ts
git commit -m "feat(input): shared markdown transformer subset"
```

---

## Task 3: Serialization + slash matcher (the pure seams)

**Files:**
- Create: `src/components/AgentChat/RichEditor/serialize.test.ts`
- Create: `src/components/AgentChat/RichEditor/serialize.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { $convertFromMarkdownString } from '@lexical/markdown';
import { ListItemNode, ListNode } from '@lexical/list';
import { createEditor } from 'lexical';
import { describe, expect, it } from 'vitest';

import { CHAT_TRANSFORMERS } from './markdownTransformers';
import { editorToMarkdown, matchSlashQuery } from './serialize';

function editorFromMarkdown(md: string) {
  const editor = createEditor({ nodes: [ListNode, ListItemNode], onError: (e) => { throw e; } });
  editor.update(
    () => {
      $convertFromMarkdownString(md, CHAT_TRANSFORMERS);
    },
    { discrete: true }
  );
  return editor;
}

describe('editorToMarkdown', () => {
  it('round-trips bold', () => {
    expect(editorToMarkdown(editorFromMarkdown('a **bold** b'))).toBe('a **bold** b');
  });
  it('round-trips inline code', () => {
    expect(editorToMarkdown(editorFromMarkdown('use `x` here'))).toBe('use `x` here');
  });
  it('round-trips a bullet list', () => {
    expect(editorToMarkdown(editorFromMarkdown('- one\n- two'))).toBe('- one\n- two');
  });
  it('round-trips an ordered list', () => {
    expect(editorToMarkdown(editorFromMarkdown('1. one\n2. two'))).toBe('1. one\n2. two');
  });
});

describe('matchSlashQuery', () => {
  it('returns the token for a bare slash command', () => {
    expect(matchSlashQuery('/comp')).toBe('comp');
    expect(matchSlashQuery('/')).toBe('');
  });
  it('returns null when not a bare slash command', () => {
    expect(matchSlashQuery('hello /comp')).toBeNull();
    expect(matchSlashQuery('/comp x')).toBeNull();
    expect(matchSlashQuery('text')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- serialize`
Expected: FAIL — cannot find `./serialize`.

- [ ] **Step 3: Implement serialize.ts**

```ts
import { $convertToMarkdownString } from '@lexical/markdown';
import { $getRoot, type LexicalEditor } from 'lexical';

import { CHAT_TRANSFORMERS } from './markdownTransformers';

/** Serialize the editor's current state to markdown using the shared subset.
 *  Falls back to plain text if serialization throws (never produce undefined). */
export function editorToMarkdown(editor: LexicalEditor): string {
  return editor.getEditorState().read(() => {
    try {
      return $convertToMarkdownString(CHAT_TRANSFORMERS);
    } catch {
      return $getRoot().getTextContent();
    }
  });
}

/** Plain-mode slash detection: returns the query token for a bare `/...`, else null. */
export function matchSlashQuery(text: string): string | null {
  const match = /^\/(\w*)$/.exec(text.trim());
  return match ? match[1] : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- serialize`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/AgentChat/RichEditor/serialize.ts src/components/AgentChat/RichEditor/serialize.test.ts
git commit -m "feat(input): markdown serializer + slash matcher (tested)"
```

---

## Task 4: SubmitPlugin (Enter=send / Shift+Enter=continue)

**Files:** Create `src/components/AgentChat/RichEditor/plugins/SubmitPlugin.tsx`

The plugin intercepts Enter. `Shift+Enter` inserts a paragraph (a new line, or a new list item inside a list). Plain `Enter` lets the slash popup consume it first (`onEnter()` returns true); otherwise it dispatches `SUBMIT_INTENT`, which `RichEditor` (Task 5) turns into `onSubmit`.

- [ ] **Step 1: Implement the plugin**

```tsx
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  createCommand,
  KEY_ENTER_COMMAND,
  type LexicalCommand,
} from 'lexical';
import { useEffect } from 'react';

export const SUBMIT_INTENT: LexicalCommand<void> = createCommand('SUBMIT_INTENT');

export type SubmitPluginProps = {
  /** Return true if Enter was consumed by the slash popup (then do not submit). */
  onEnter: () => boolean;
};

export function SubmitPlugin({ onEnter }: SubmitPluginProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand<KeyboardEvent | null>(
      KEY_ENTER_COMMAND,
      (event) => {
        if (event?.shiftKey) {
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) selection.insertParagraph();
          });
          event.preventDefault();
          return true;
        }
        event?.preventDefault();
        if (onEnter()) return true;
        editor.dispatchCommand(SUBMIT_INTENT, undefined);
        return true;
      },
      COMMAND_PRIORITY_HIGH
    );
  }, [editor, onEnter]);

  return null;
}
```

- [ ] **Step 2: Verify typecheck + lint**

Run: `npm run typecheck` → 0 errors. Run: `npm run lint:fix && npm run lint` → 0 errors, 0 warnings.

- [ ] **Step 3: Commit**

```bash
git add src/components/AgentChat/RichEditor/plugins/SubmitPlugin.tsx
git commit -m "feat(input): Enter=submit / Shift+Enter=continue plugin"
```

---

## Task 5: RichEditor (composer + plugins + onChange)

**Files:** Create `src/components/AgentChat/RichEditor/RichEditor.tsx`

- [ ] **Step 1: Implement RichEditor**

```tsx
import { ListItemNode, ListNode } from '@lexical/list';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { $getRoot, type LexicalEditor } from 'lexical';
import { useEffect, useImperativeHandle, type Ref } from 'react';

import { CHAT_TRANSFORMERS } from './markdownTransformers';
import { SubmitPlugin, SUBMIT_INTENT } from './plugins/SubmitPlugin';
import { editorToMarkdown } from './serialize';

export type RichEditorHandle = { clear: () => void; focus: () => void };

export type RichEditorProps = {
  onChange: (markdown: string, plainText: string) => void;
  onSubmit: () => void;
  /** Returns true if Enter was consumed by the slash popup. */
  onEnter: () => boolean;
  handleRef: Ref<RichEditorHandle>;
  placeholder: string;
};

function SubmitBridge({ onSubmit }: { onSubmit: () => void }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => editor.registerCommand(SUBMIT_INTENT, () => { onSubmit(); return true; }, 0), [editor, onSubmit]);
  return null;
}

function HandlePlugin({ handleRef }: { handleRef: Ref<RichEditorHandle> }) {
  const [editor] = useLexicalComposerContext();
  useImperativeHandle(handleRef, () => ({
    clear: () => editor.update(() => $getRoot().clear()),
    focus: () => editor.focus(),
  }), [editor]);
  return null;
}

export function RichEditor({ onChange, onSubmit, onEnter, handleRef, placeholder }: RichEditorProps) {
  return (
    <LexicalComposer
      initialConfig={{
        namespace: 'chat',
        nodes: [ListNode, ListItemNode],
        onError: (e: Error) => { throw e; },
        theme: {},
      }}
    >
      <div className="relative flex-1">
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className="text-fg text-sm font-mono leading-relaxed focus:outline-none min-h-[24px] max-h-[120px] overflow-y-auto"
              style={{ color: 'var(--color-text-primary)' }}
              aria-placeholder={placeholder}
              placeholder={<div className="pointer-events-none absolute left-0 top-0 text-sm" style={{ color: 'var(--color-text-muted)' }}>{placeholder}</div>}
            />
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <ListPlugin />
        <HistoryPlugin />
        <MarkdownShortcutPlugin transformers={CHAT_TRANSFORMERS} />
        <SubmitPlugin onEnter={onEnter} />
        <SubmitBridge onSubmit={onSubmit} />
        <HandlePlugin handleRef={handleRef} />
        <OnChangePlugin
          onChange={(_state, editor: LexicalEditor) => {
            const markdown = editorToMarkdown(editor);
            const plain = editor.getEditorState().read(() => $getRoot().getTextContent());
            onChange(markdown, plain);
          }}
        />
      </div>
    </LexicalComposer>
  );
}
```

- [ ] **Step 2: Verify typecheck + lint**

Run: `npm run typecheck` → 0 errors. Run: `npm run lint:fix && npm run lint` → 0/0.

- [ ] **Step 3: Commit**

```bash
git add src/components/AgentChat/RichEditor/RichEditor.tsx
git commit -m "feat(input): RichEditor (Lexical composer + markdown onChange + clear ref)"
```

---

## Task 6: Toolbar

**Files:** Create `src/components/AgentChat/RichEditor/Toolbar.tsx`

- [ ] **Step 1: Implement the toolbar**

```tsx
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { Bold, Code, List, ListOrdered } from 'lucide-react';
import { FORMAT_TEXT_COMMAND } from 'lexical';

export function Toolbar() {
  const [editor] = useLexicalComposerContext();
  const btn = 'rounded p-1 hover:opacity-100 opacity-60 transition-opacity';
  const style = { color: 'var(--color-text-secondary)' };
  return (
    <div className="flex gap-0.5">
      <button type="button" className={btn} style={style} title="Bold" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}><Bold size={14} /></button>
      <button type="button" className={btn} style={style} title="Inline code" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')}><Code size={14} /></button>
      <button type="button" className={btn} style={style} title="Bullet list" onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}><List size={14} /></button>
      <button type="button" className={btn} style={style} title="Numbered list" onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}><ListOrdered size={14} /></button>
    </div>
  );
}
```

Note: `Toolbar` must be rendered INSIDE `<LexicalComposer>` (it uses `useLexicalComposerContext`). Place it as a child within `RichEditor` (e.g. above the `ContentEditable`), or export it and mount it within the composer subtree. Add `<Toolbar />` just inside the `<div className="relative flex-1">` wrapper in `RichEditor.tsx`.

- [ ] **Step 2: Verify typecheck + lint + build**

Run: `npm run typecheck` → 0. Run: `npm run lint:fix && npm run lint` → 0/0.

- [ ] **Step 3: Commit**

```bash
git add src/components/AgentChat/RichEditor/Toolbar.tsx src/components/AgentChat/RichEditor/RichEditor.tsx
git commit -m "feat(input): formatting toolbar (bold/code/bullet/ordered)"
```

---

## Task 7: (no code) — slash detection lives in the parent

Decision: there is **no separate SlashPlugin file**. The slash popup is already owned by the parent (`AgentChat` holds `SLASH_COMMANDS`, the filter, and `slashIndex`; `AgentChatInput` renders the popup markup). The only new piece is computing the query, and `RichEditor.onChange` already hands the parent the editor's `plainText`. The parent derives the popup state with `matchSlashQuery(plainText)` (already implemented and tested in Task 3).

This is wired in Task 8. Nothing to build or commit here.

---

## Task 8: Integration — replace the textarea

**Files:**
- Modify: `src/components/AgentChat/AgentChatInput/AgentChatInput.tsx`
- Modify: `src/components/AgentChat/AgentChat.tsx`
- Modify: `src/hooks/useAgentChatActions.ts`

Goal: swap the `<textarea>` for `<RichEditor>`, drive `input` (now markdown) from `RichEditor.onChange`, submit on `onSubmit`, clear via the handle ref after send, and compute slash state from `matchSlashQuery(plainText)` instead of the old textarea keydown logic.

- [ ] **Step 1: AgentChatInput — replace the textarea block**

In `AgentChatInput.tsx`:
- Add imports:
```tsx
import { useRef } from 'react';
import { RichEditor, type RichEditorHandle } from '../RichEditor/RichEditor';
import { Toolbar } from '../RichEditor/Toolbar';
```
- Replace the `<textarea ... />` element (lines ~113-126) with:
```tsx
<RichEditor
  handleRef={editorRef}
  placeholder={waitingInput ? 'Type your response (yes / no / ...)...' : session && isRunning ? 'Send a message...' : 'Type a prompt or / for commands...'}
  onChange={(markdown, plain) => { onInputChange(markdown); onPlainTextChange(plain); }}
  onSubmit={onSend}
  onEnter={onSlashEnter}
/>
```
- Add new props to `AgentChatInputProps`: `editorRef: RefObject<RichEditorHandle | null>`, `onPlainTextChange: (plain: string) => void`, `onSlashEnter: () => boolean`. Remove now-dead props: `inputRef`, `onKeyDown`. Keep `input` only if still used for the send-button disabled check (it is: `!input.trim()`).
- The slash popup markup (the `showSlash && ...` block) stays; it is now driven by props from the parent.

- [ ] **Step 2: AgentChat — wire RichEditor state**

In `AgentChat.tsx`:
- Add: `import { matchSlashQuery } from './RichEditor/serialize';` and `import type { RichEditorHandle } from './RichEditor/RichEditor';`
- Add ref: `const editorRef = useRef<RichEditorHandle | null>(null);`
- Add plain-text state: `const [plainText, setPlainText] = useState('');`
- Replace the `filteredCommands`/`showSlash` derivation to key off the slash query:
```tsx
const slashQuery = matchSlashQuery(plainText);
const showSlash = slashQuery !== null;
const filteredCommands = slashQuery === null ? [] : SLASH_COMMANDS.filter((c) => c.cmd.slice(1).startsWith(slashQuery));
```
- Add the Enter-consumed-by-popup handler:
```tsx
const onSlashEnter = (): boolean => {
  if (showSlash && filteredCommands.length > 0) { handleSelectSlash(filteredCommands[slashIndex].cmd); return true; }
  return false;
};
```
- Remove the document-level `keydown` listener and `handleKeyDown` that did slash nav for the textarea. Keep `ArrowUp/Down` slash navigation by registering it on the RichEditor via a small key handler if needed; for v1, arrow navigation can be handled by mouse-click selection in the popup (note this limitation). (Arrow-key nav inside the editor is a follow-up.)
- Pass new props to `<AgentChatInput>`: `editorRef={editorRef}`, `onPlainTextChange={setPlainText}`, `onSlashEnter={onSlashEnter}`. Remove `inputRef`, `onKeyDown`.
- `handleSelectSlash`: instead of `setInput(cmd)`, insert via the editor — for v1, set the parent `input` and reset the editor to the command using `editorRef.current?.clear()` then the user retypes is bad; simpler: keep slash commands as a plain send — on select, call `onSend` with the command directly. Implement `handleSelectSlash(cmd)` to: send `cmd` immediately (it is a complete command) via the existing send path, then clear. If immediate-send is undesired, set `input` and let the user press Enter. Choose immediate-send for v1.

- [ ] **Step 3: useAgentChatActions — clear the editor after send**

In `useAgentChatActions.ts`, `handleSend`: after `setInput('')`, also clear the editor and refocus:
- Change the hook to accept `editorRef: RefObject<RichEditorHandle | null>` instead of `inputRef: RefObject<HTMLTextAreaElement | null>`.
- Replace `inputRef.current?.focus()` with `editorRef.current?.focus()` and add `editorRef.current?.clear()` right after `setInput('')`.

- [ ] **Step 4: Verify the full gate**

Run: `npm run typecheck` → 0 errors. (Resolve any leftover references to removed `inputRef`/`onKeyDown`.)
Run: `npm run lint:fix && npm run lint` → 0 errors, 0 warnings. (Remove now-unused imports: `renderContentWithImages` is unaffected; remove textarea-only code.)
Run: `npm run test` → all green.
Run: `npx electron-vite build` → succeeds.

- [ ] **Step 5: Manual check**

Run `npm run dev`. In an agent chat:
- Type `- a` then Shift+Enter → new bullet; type `b`. Confirm a 2-item bullet list renders.
- Select text, click Bold (or type `**x**`) → bold.
- Type `` `x` `` → inline code.
- Press Enter → message sends; editor clears.
- Type `/comp` at the start of an empty editor → the command popup appears.

- [ ] **Step 6: Commit**

```bash
git add src/components/AgentChat/AgentChatInput/AgentChatInput.tsx src/components/AgentChat/AgentChat.tsx src/hooks/useAgentChatActions.ts
git commit -m "feat(input): replace textarea with Lexical RichEditor (markdown output)"
```

---

## Follow-ups (post-v1)

- Arrow-key navigation of the slash popup from inside the editor (a small `KEY_ARROW_UP/DOWN` command in a SlashNavPlugin).
- Italic (add the italic transformer to `CHAT_TRANSFORMERS` + a toolbar button).
- Slash-command insertion as editable text (instead of immediate send) if desired.
- Apply `RichEditor` to `GlobalChatModal` if it has its own input.
