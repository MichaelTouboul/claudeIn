# Interactive ask-prompts (structured choice / text) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the heuristic `quickReplies.ts` with a deterministic **structured ask-prompt protocol**. The agent emits a single fenced ` ```cam-ask ` JSON block when it genuinely needs a decision; the renderer parses it into a **keyboard-navigable picker** (`type:'choice'` — ↑/↓ + Enter) or **focuses the chat input** (`type:'text'`). The presence of a parsed prompt is the real "input needed" signal that drives focus deterministically. A one-line backend steering rewrite channels legitimate questions into the protocol instead of forbidding them.

**Architecture:** This is a **frontend** feature plus a single backend steering-string rewrite. No new IPC, no DB, no shared/IPC type — the `AskPrompt` type lives **renderer-only** (the backend only instructs the agent; it never parses `cam-ask`). The protocol rides the **existing** `blockRegistry` dispatch (`cam-ask` lang → rendered as nothing; malformed JSON → visible `CodeBlock` fallback). The answer round-trip reuses the **existing** send/`--resume` path (`handleQuickReply`, renamed `onAnswer`). The picker is a new focused component in its own folder per `src/CLAUDE.md` (component-per-folder).

**Spec (source of truth):** `docs/superpowers/specs/2026-06-02-interactive-ask-prompts-design.md`

**Tech Stack:** Electron, React 19, Tailwind CSS 4 (design-system CSS vars), Vitest + Testing Library, TypeScript (no `any`).

This plan subsumes two open `docs/bugs.md` entries (re-pointed when it lands):
- **"Chat agent asks a question after every response"** — fixed by the channeled steering (Phase 6).
- **"Auto-focus the chat input when the agent finishes a turn"** — replaced by prompt-driven focus (Phase 5).

---

## ⚠️ Execution discipline (read before starting)

1. **Isolated worktree only.** All code work runs in an **isolated git worktree subagent**, never directly on `main`. The worktree needs a tracked `.claude/settings.json` so git operations work inside it.
2. **Phase = test + commit unit.** Each phase below is independently testable and committable. **Verify the gate, then commit, before moving to the next phase.** Never batch multiple phases into one commit (hard user preference).
3. **Per-phase FRONTEND gate** (run the subset relevant to the files touched). Unlike the settings backend slice, lint **and** typecheck genuinely cover this work because it lives in `src/`:
   - `npm run typecheck` → **0 errors** (`tsconfig.web.json` covers all of `src/`).
   - `npm run lint:fix && npm run lint` → **0 errors / 0 warnings** (`src/` is fully linted).
   - `npm run test -- <pattern>` → relevant Vitest suites green.
   - `npx electron-vite build` → succeeds (final compile of main + renderer).
4. **Backend phase caveat (Phase 6 only).** ESLint **ignores `electron/**`** (`eslint.config.mjs`) and `npm run typecheck` is scoped to `tsconfig.web.json` (`src/` only). So for `electron/services/spawn.service.ts` the real gate is **`npx electron-vite build`** (esbuild-compiles the main process) **plus a Vitest test asserting the prompt string**. The `electron/` conventions (no `any`, named imports, **300-line hard limit** — `spawn.service.ts` is already exactly **300 lines**) are **not auto-enforced** there; the subagent must uphold them by hand and confirm the file stays ≤ 300 lines (the rewrite must be net-neutral or shrink it — see Phase 6).
5. **Live-CLI behavioral caveat (Phase 6).** The spec flags that the steering's behavioral effect — does a `--resume` turn actually honor "emit `cam-ask` only when blocked, otherwise no trailing question"? — **cannot be verified in the worktree sandbox** (it can't invoke `claude`). The Vitest test only asserts the *string content*. The behavioral confirmation must be done **in the real app** after merge, same caveat as the existing bug entry. Do **not** claim the behavioral fix is verified from the sandbox.
6. **Design-system rules (every renderer phase).** Reference CSS vars via `style={{ }}` (Tailwind can't read them); **never** hardcode Tailwind colors (`bg-cyan-400`, `text-gray-…`). Reuse the existing `replyStyles` map for option variants. **Explicit ternaries** for conditional rendering (`{cond ? <X /> : null}`). **Keys = stable ids/derived strings, never the array index.** Named imports only; no file extensions in import paths; `@/` alias. **300-line hard limit** per file — `AskPrompt.tsx` is a deliberately separate focused component so nothing approaches it.
7. **Accessibility (Phase 3 — the picker is interactive).** Apply the project's `aria-requirements`: the choice list needs a `role="listbox"` container with `role="option"` + `aria-selected` items (or radiogroup/radio), an accessible name (`aria-label` from the `question`), keyboard operability (arrows + Enter + optional 1–9), and a visible focus affordance. The lint enforces `jsx-a11y` — interactive elements must be real buttons or carry role + key handlers.

---

## File layout (target)

```
electron/services/spawn.service.ts                  ← Phase 6: rewrite NO_FOLLOWUP_SYSTEM_PROMPT (channel → cam-ask)
electron/services/spawn.service.test.ts             ← Phase 6: NEW — assert the steering string content
src/components/AgentChat/askPrompt.ts               ← Phase 1: parseAskPrompt + AskPrompt/AskOption types + CAM_ASK_LANG + replyStyles (replaces quickReplies.ts)
src/components/AgentChat/askPrompt.test.ts          ← Phase 1: NEW — parseAskPrompt unit tests
src/components/AgentChat/AskPrompt/AskPrompt.tsx     ← Phase 3: NEW — keyboard-navigable picker
src/components/AgentChat/AskPrompt/AskPrompt.test.tsx ← Phase 3: NEW — picker component tests
src/components/ResponseBody/blockRegistry.tsx        ← Phase 2: cam-ask → null, malformed → CodeBlock fallback
src/components/ResponseBody/blockRegistry.test.tsx   ← Phase 2: add cam-ask cases
src/components/AgentChat/MessageRow/MessageRow.tsx   ← Phase 4: use AskPrompt, driven by parseAskPrompt; Shield from accept/deny option; onQuickReply→onAnswer
src/components/AgentChat/AgentChatMessages/AgentChatMessages.tsx ← Phase 4: rename pass-through props (quickReplies/onQuickReply → askPrompt/onAnswer)
src/components/AgentChat/types.ts                     ← Phase 1/4: remove QuickReply (moved to askPrompt.ts); keep QueueItem
src/components/AgentChat/AgentChat.tsx               ← Phase 5: prompt-driven focus; pass parsed prompt down; rename handler
src/hooks/useAgentChatActions.ts                     ← Phase 5: rename handleQuickReply → onAnswer (same send/resume logic)
```

**Deletions:** `src/components/AgentChat/quickReplies.ts` (replaced by `askPrompt.ts`) — removed in Phase 1; `PERMISSION_PATTERNS` / `QUESTION_PATTERNS` / `detectQuickReplies` are deleted, `replyStyles` is kept (moved into `askPrompt.ts`).

**Renderer-only type (locked decision):** `AskOption` / `AskPrompt` live in `askPrompt.ts`, **not** in a shared `types/`. The backend does not parse the block, so it is not an IPC type.

**Phasing note vs. the spec's suggested cut:** the spec's file table is followed exactly. One refinement: `AgentChatMessages.tsx` is an intermediate component (not named in the spec's table) that today threads `quickReplies`/`onQuickReply` from `AgentChat` down to `MessageRow`. Its prop rename is folded into **Phase 4** (the MessageRow wiring phase) so that phase stays self-consistently compilable.

---

## Phase 1 — `parseAskPrompt` + types + `CAM_ASK_LANG` + unit tests (pure)

**Why first:** the parser is the pure, deterministic core that replaces `detectQuickReplies` and its regexes. It has zero React/DOM/IPC dependency, so it's the fast foundation everything else builds on. After this phase, `quickReplies.ts` is gone and `askPrompt.ts` is its replacement, but it is not yet wired anywhere (callers still reference the old symbols only in files this phase does **not** touch — so this phase must keep those callers compiling: see Step 4).

**Files:**
- Create: `src/components/AgentChat/askPrompt.ts`
- Create: `src/components/AgentChat/askPrompt.test.ts`
- Edit: `src/components/AgentChat/types.ts` (remove `QuickReply`)
- Delete: `src/components/AgentChat/quickReplies.ts`

- [ ] **Step 1: Define the public surface** in `askPrompt.ts`

```ts
export const CAM_ASK_LANG = 'cam-ask';

export type AskOption = { label: string; value: string; variant?: 'accept' | 'deny' | 'neutral' };
export type AskPrompt =
  | { type: 'choice'; question: string; options: AskOption[] }
  | { type: 'text'; question: string; placeholder?: string };

export function parseAskPrompt(content: string): AskPrompt | null;

export const replyStyles: Record<AskOption['variant'] & string, string>; // reused verbatim from quickReplies.ts
```
- `CAM_ASK_LANG` is the **single shared constant** referenced by both `parseAskPrompt` (to find the fence) and `blockRegistry` (Phase 2, to dispatch on lang). Define it once here.
- `replyStyles` is **moved unchanged** from `quickReplies.ts` (the three `accept`/`deny`/`neutral` entries). Keep it keyed so Phase 3's picker and Phase 4's MessageRow both consume it.
- `variant` is optional on `AskOption`; the picker defaults a missing variant to `neutral`.

- [ ] **Step 2: `parseAskPrompt` semantics** (per spec "Parsing & rendering" + "Error handling")
- Find **all** ` ```cam-ask ` fenced blocks in `content` (regex on the fence: ` ```cam-ask\n…\n``` `, matching `CAM_ASK_LANG`). If none → return `null`.
- Take the **last** block (multiple blocks → last wins).
- `JSON.parse` its body inside a `try/catch`; on throw → return `null`.
- **Validate the shape** before returning (no `any`; narrow via runtime checks):
  - `type:'choice'` requires a non-empty string `question` AND `options` is a non-empty array where every entry has string `label` and string `value` (and `variant`, if present, is one of `accept`/`deny`/`neutral`). A `choice` with no valid options → `null`.
  - `type:'text'` requires a string `question`; `placeholder` optional string.
  - Anything else (unknown `type`, wrong shapes) → `null`.
- Return the validated `AskPrompt`. **Pure** — no DOM, no React, no side effects.

> Implementation note: write a small internal type-guard (`isAskOption`, `isAskPrompt`) operating on `unknown`; do not cast through `any`. Keep the file comfortably < 300 lines (it is tiny).

- [ ] **Step 3: Write the failing unit test** `askPrompt.test.ts` (per spec "Testing → parseAskPrompt"). Assertions:
  - **valid choice** — extracts `type:'choice'`, correct `question`, `options` array with labels/values/variants.
  - **valid text** — extracts `type:'text'`, `question`, optional `placeholder`.
  - **malformed JSON** inside a `cam-ask` fence → `null`.
  - **non-`cam-ask` code block** (e.g. ` ```json `) → `null` (not picked up).
  - **extraction when surrounded by prose** — prose before/after the fence still yields the prompt.
  - **multiple `cam-ask` blocks → last wins**.
  - **`choice` with empty/invalid `options`** → `null`.
  - **`CAM_ASK_LANG`** equals `'cam-ask'` (guards the constant the registry depends on).

- [ ] **Step 3b: Run to confirm FAIL** — `npm run test -- askPrompt` (cannot resolve `./askPrompt`).

- [ ] **Step 4: Implement `askPrompt.ts`, delete `quickReplies.ts`, prune `types.ts`.**
  - Remove `QuickReply` from `src/components/AgentChat/types.ts` (keep `QueueItem`). `AskOption` supersedes it.
  - **Keep the build green:** files that still import the old symbols (`MessageRow.tsx`, `AgentChat.tsx`, `AgentChatMessages.tsx`, which reference `QuickReply` / `detectQuickReplies` / `PERMISSION_PATTERNS` / `replyStyles`) are NOT rewired until Phases 4–5. To keep this phase independently compilable, **re-point only their imports minimally**: import `replyStyles` from `./askPrompt` instead of `./quickReplies`, and temporarily type the still-existing `quickReplies` prop as `AskOption[] | null` (or leave the old `QuickReply` type aliased to `AskOption` in `types.ts` for one phase). Prefer the smallest change that compiles; the real rewiring happens in Phases 4–5. **Decide the exact bridging at implementation time** — the constraint is: after Phase 1, `npm run typecheck` and `npx electron-vite build` are green with `quickReplies.ts` deleted.

> Rationale for the minimal bridge: each phase must be a green commit. Deleting `quickReplies.ts` while `MessageRow`/`AgentChat` still consume its exports would break the build; the bridge keeps behavior identical (still heuristic via the temporary path) until Phases 4–5 replace it. If the bridge proves messier than expected, an acceptable alternative is to **keep a thin `detectQuickReplies` shim** in `askPrompt.ts` for one phase and delete it in Phase 4 — choose whichever keeps the diff smallest and the build green.

- [ ] **Step 5: Run to confirm PASS** — `npm run test -- askPrompt` → green.

- [ ] **Step 6: Gate** — `npm run typecheck` (0), `npm run lint:fix && npm run lint` (0/0), `npm run test -- askPrompt` (green), `npx electron-vite build` (succeeds). Confirm `askPrompt.ts` < 300 lines.

- [ ] **Step 7: Commit**
```bash
git add src/components/AgentChat/askPrompt.ts src/components/AgentChat/askPrompt.test.ts src/components/AgentChat/types.ts
git rm src/components/AgentChat/quickReplies.ts
git commit -m "feat(chat): structured ask-prompt parser + types + CAM_ASK_LANG (replaces quickReplies heuristics)"
```

---

## Phase 2 — `blockRegistry`: `cam-ask` → null, malformed → `CodeBlock` fallback + tests

**Why now:** with the lang constant and parser in place, teach the existing block dispatcher to **consume** the `cam-ask` block so it never renders as inline content (the picker renders it instead), while a malformed block stays visible for debugging.

**Files:**
- Edit: `src/components/ResponseBody/blockRegistry.tsx`
- Edit: `src/components/ResponseBody/blockRegistry.test.tsx`

- [ ] **Step 1: Dispatch `cam-ask` in the `Code` component** (per spec): in `blockRegistry.tsx`, when `lang === CAM_ASK_LANG` (imported from `@/components/AgentChat/askPrompt`):
  - If `parseAskPrompt` on the fenced body (reconstruct the fence, or call a validity check) yields a valid prompt → render **`null`** (the block is metadata, consumed by the picker, not inline content).
  - If the JSON is **invalid** → fall through to the normal `CodeBlock` (visible, debuggable).

> Implementation detail: the `Code` component receives the raw `src` (block body) and `lang`. To decide valid-vs-malformed, run a lightweight `JSON.parse` + shape check on `src` directly (the same validator `parseAskPrompt` uses — export a tiny `isValidAskJson(src: string): boolean` from `askPrompt.ts` to avoid re-wrapping the fence). Keep `blockRegistry.tsx` < 300 lines (it is ~40 today). Reuse the validator from Phase 1 — do **not** duplicate validation logic.

- [ ] **Step 2: Add tests** to `blockRegistry.test.tsx` (per spec "Testing → blockRegistry"), using the existing `renderMd` harness:
  - **valid `cam-ask` renders nothing** — render ` ```cam-ask\n{"type":"choice","question":"Q","options":[{"label":"A","value":"a"}]}\n``` ` and assert the JSON text is **not** in the document and **no Copy button** appears (it wasn't routed to `CodeBlock`).
  - **malformed `cam-ask` falls back to `CodeBlock`** — render ` ```cam-ask\n{ not json\n``` ` and assert the raw text **is** present and a **Copy button** appears (CodeBlock path).
  - Keep the existing 3 tests passing (ts → CodeBlock, inline → no Copy, table → DataGrid).

- [ ] **Step 3: Run** — `npm run test -- blockRegistry` → all green (existing + 2 new).

- [ ] **Step 4: Gate** — typecheck (0), lint:fix && lint (0/0), `npm run test -- blockRegistry`, `npx electron-vite build`. Confirm `blockRegistry.tsx` < 300 lines.

- [ ] **Step 5: Commit**
```bash
git add src/components/ResponseBody/blockRegistry.tsx src/components/ResponseBody/blockRegistry.test.tsx
git commit -m "feat(chat): blockRegistry consumes valid cam-ask (renders nothing), falls back to CodeBlock when malformed"
```

---

## Phase 3 — `AskPrompt` picker component (keyboard nav) + component tests

**Why now:** the parser produces an `AskPrompt`; build the interactive surface that renders a `choice` and is keyboard-navigable. Self-contained and unit-testable in isolation (props in, `onAnswer` out) before any wiring.

**Files:**
- Create: `src/components/AgentChat/AskPrompt/AskPrompt.tsx`
- Create: `src/components/AgentChat/AskPrompt/AskPrompt.test.tsx`

- [ ] **Step 1: Component contract** (per spec "The picker + keyboard"):
```ts
type AskPromptProps = { prompt: AskPrompt; isActive: boolean; onAnswer: (value: string) => void };
export function AskPrompt({ prompt, isActive, onAnswer }: AskPromptProps): JSX.Element | null;
```
- **`type:'text'` → return `null`** (the text affordance is the main chat input, focused by `AgentChat` in Phase 5; this component renders no inline field).
- **`type:'choice'`** → vertical option list with roving selection:
  - Local `useState` for the highlighted index (initial `0`). This is component-local UI state → `useState` per the state decision tree (stop at YES #1).
  - **↑/↓** move the highlight, **clamped** at both ends (no wrap, per spec). **Enter** calls `onAnswer(options[highlighted].value)`. **Optional 1–9** number shortcuts select+submit the Nth option.
  - **Mouse hover** sets the highlight; **click** calls `onAnswer(value)`.
  - When **`isActive` becomes true**, the list container takes focus (so arrows work without a click) — `useRef` + `useEffect` on `isActive`, focus deferred to next tick consistent with the existing chat-focus pattern.
  - **`isActive === false` → inert:** no key handling, no focus grab, options visually disabled (reduced opacity), clicks do nothing. (Earlier answered prompts render but are inert — driven by `isLast` in Phase 4.)

- [ ] **Step 2: Styling + a11y** (design-system + `aria-requirements`):
  - Container: `role="listbox"`, `aria-label={prompt.question}`, `tabIndex={0}` when active, the question rendered above the list. Each option: `role="option"`, `aria-selected={i === highlighted}`, a visible `❯` / selection marker on the highlighted row.
  - Colors come from **`replyStyles`** (reuse from `askPrompt.ts`) keyed by `option.variant ?? 'neutral'`; everything else via CSS vars through `style={{ }}` (no hardcoded Tailwind colors). Use `gap` for spacing, not child margins.
  - Keys for the option rows = `option.value` (stable), **never the index**. If values could collide, derive `` `${i}:${option.value}` `` — but values are expected unique.
  - Keyboard handler on the container (`onKeyDown`) with `e.preventDefault()` on the keys it handles, so arrows don't scroll the chat.

- [ ] **Step 3: Write the failing test** `AskPrompt.test.tsx` (per spec "Testing → AskPrompt"), Testing Library + `userEvent`/`fireEvent`:
  - **↑/↓ moves the highlight** — render active with ≥2 options; press ArrowDown; assert `aria-selected` moved to the 2nd option; ArrowUp moves it back; clamps at ends.
  - **Enter calls `onAnswer` with the highlighted value** — ArrowDown then Enter → `onAnswer('b')` (the 2nd option's value).
  - **click calls `onAnswer`** — click an option → `onAnswer(thatValue)`.
  - **inert when `!isActive`** — render with `isActive={false}`; key/click produce **no** `onAnswer` call; options visibly disabled.
  - **`type:'text'` renders nothing** — assert the component returns `null` (no listbox in the document).
  - (Optional, if implemented) **1–9 shortcut** submits the Nth option.

- [ ] **Step 3b: Run to confirm FAIL** — `npm run test -- AskPrompt`.

- [ ] **Step 4: Implement `AskPrompt.tsx`.** Keep < 300 lines (it is a focused component). No default export; named `export function AskPrompt`. Feature component → **no `index.ts` barrel** (barrels are `_ui/` only).

- [ ] **Step 5: Run to confirm PASS** — `npm run test -- AskPrompt` → green.

- [ ] **Step 6: Gate** — typecheck (0), lint:fix && lint (0/0 — incl. `jsx-a11y`), `npm run test -- AskPrompt`, `npx electron-vite build`. Confirm `AskPrompt.tsx` < 300 lines.

- [ ] **Step 7: Commit**
```bash
git add src/components/AgentChat/AskPrompt/AskPrompt.tsx src/components/AgentChat/AskPrompt/AskPrompt.test.tsx
git commit -m "feat(chat): AskPrompt keyboard-navigable choice picker (arrows/Enter, isActive focus, a11y listbox)"
```

---

## Phase 4 — MessageRow wiring (drive from `parseAskPrompt`, Shield from accept/deny, rename `onQuickReply`→`onAnswer`)

**Why now:** the picker and parser exist; replace MessageRow's inline `Yes`/`No` buttons with `AskPrompt`, parse the message via `parseAskPrompt`, and drive the Shield "authorization" header from the parsed prompt instead of `PERMISSION_PATTERNS`. The intermediate `AgentChatMessages` pass-through is renamed in lockstep so this phase compiles end-to-end.

**Files:**
- Edit: `src/components/AgentChat/MessageRow/MessageRow.tsx`
- Edit: `src/components/AgentChat/AgentChatMessages/AgentChatMessages.tsx`

- [ ] **Step 1: MessageRow** (per spec "MessageRow.tsx"):
  - New props: replace `quickReplies: QuickReply[] | null` + `onQuickReply` with **`onAnswer: (value: string) => void`** (the parse happens inside MessageRow now, not upstream). Keep `msg` and `isLast`.
  - For an **assistant** message, call `const prompt = parseAskPrompt(msg.content)`.
  - **Shield header:** the header shows the Shield "authorization" treatment when `prompt?.type === 'choice'` **and** some option has `variant === 'accept' || 'deny'` (replacing the `PERMISSION_PATTERNS` test). Otherwise the normal `Bot`/"agent" header.
  - **Render the picker below the prose:** `{prompt ? <AskPrompt prompt={prompt} isActive={isLast} onAnswer={onAnswer} /> : null}` (explicit ternary). `isActive={isLast}` makes earlier prompts inert. `text` prompts render nothing inline (AskPrompt returns null) — the focus path (Phase 5) handles them.
  - Remove the inline `<button>` list and the `replyStyles`-on-buttons block (now inside `AskPrompt`). Remove the `PERMISSION_PATTERNS`/`QuickReply` imports.

- [ ] **Step 2: AgentChatMessages pass-through rename:** today it threads `quickReplies`/`onQuickReply` to `MessageRow` and even re-derives `isLast`. After Step 1, MessageRow no longer takes `quickReplies`. Update `AgentChatMessages`:
  - Drop the `quickReplies` prop entirely (parsing moved into MessageRow); rename `onQuickReply` → `onAnswer`.
  - Pass `onAnswer` straight through and keep computing `isLast` per row (`i === messages.length - 1`). The current `isLast` expression has a redundant clause — simplify to `i === messages.length - 1` (no behavior change).
  - Update `AgentChatMessagesProps` accordingly; remove the `QuickReply` import.

> This phase intentionally edits two files together because the prop contract crosses both; that keeps the phase a single green commit. `AgentChat.tsx` still passes the now-removed `quickReplies` prop after this phase — to keep the build green, **temporarily** drop the `quickReplies={…}` prop at the `AgentChatMessages` call site and rename `onQuickReply={handleQuickReply}` → `onAnswer={handleQuickReply}` in `AgentChat.tsx` (handler rename itself lands in Phase 5). Make the minimal edit needed for typecheck/build to pass here; the focus rewrite and handler rename are Phase 5.

- [ ] **Step 3: Tests.** There is no dedicated `MessageRow.test.tsx` today; the behavior is covered by `AskPrompt.test.tsx` (picker) + `blockRegistry.test.tsx` (block consumption) + Phase 5's `AgentChat` focus test. **Do not** add a brittle snapshot. If a targeted assertion adds value, add a small `MessageRow.test.tsx` asserting: (a) an assistant message containing a valid accept/deny `choice` renders the Shield "authorization" header; (b) a plain assistant message renders the "agent" header and no picker. Optional — only if it stays focused and green.

- [ ] **Step 4: Gate** — typecheck (0), lint:fix && lint (0/0), `npm run test` (full suite green — confirms nothing downstream broke), `npx electron-vite build`. Confirm both edited files < 300 lines (MessageRow ~79 today, shrinks).

- [ ] **Step 5: Commit**
```bash
git add src/components/AgentChat/MessageRow/MessageRow.tsx src/components/AgentChat/AgentChatMessages/AgentChatMessages.tsx src/components/AgentChat/AgentChat.tsx
git commit -m "feat(chat): MessageRow renders AskPrompt via parseAskPrompt; Shield from accept/deny option; rename onQuickReply→onAnswer"
```

---

## Phase 5 — AgentChat prompt-driven focus + `onAnswer` rename in `useAgentChatActions`

**Why now:** MessageRow/AskPrompt are wired; finalize the focus behavior. Replace the **unconditional** `spawn_exit` focus with focus **driven by the parsed prompt** of the last agent message: `choice` → the picker takes focus; `text` → the chat input takes focus (question as placeholder); **no prompt → do not steal focus**. Rename the underlying handler to `onAnswer` for clarity (same send/`--resume` logic).

**Files:**
- Edit: `src/components/AgentChat/AgentChat.tsx`
- Edit: `src/hooks/useAgentChatActions.ts`
- Edit: `src/components/AgentChat/AgentChat.test.tsx`

- [ ] **Step 1: Rename the handler** in `useAgentChatActions.ts`: `handleQuickReply` → `onAnswer` (identical body — the send/`sendInput`/`spawn`/`--resume` round-trip is unchanged). Update the returned object key. Update the consumer in `AgentChat.tsx` (`const { …, onAnswer, … } = useAgentChatActions(...)`) and `handleSelectSlash` (slash commands reuse this path → call `onAnswer(cmd)`).

- [ ] **Step 2: Prompt-driven focus** in `AgentChat.tsx` (per spec "Focus"):
  - Replace the `quickReplies` `useMemo` (heuristic) with a parse of the last agent message via `parseAskPrompt`. Compute the prompt for the last assistant message only (mirror today's `lastAssistantMsg` + "last message isn't a user turn" guard).
  - On turn completion (`spawn_exit`), rework `focusInputOnTurnComplete` into a prompt-aware decision:
    - parse the last agent message; if `prompt?.type === 'choice'` → **focus the picker** (the picker self-focuses via its `isActive` effect once it's the last row — so the AgentChat side may simply **not** focus the input, letting the picker grab focus; confirm the picker's `isActive` focus fires on turn-complete render).
    - if `prompt?.type === 'text'` → **focus the chat input** (`editorRef.current?.focus()`), and surface `question`/`placeholder` as the input placeholder (thread a `placeholder` prop into `AgentChatInput`/`RichEditor` if not already present; if surfacing the placeholder is non-trivial, focus is the must-have and the placeholder is a follow-up — note the decision).
    - if **no prompt** → **do not** steal focus (return early).
  - **Keep the existing guards:** `document.hidden`, queue auto-flow (`queueRef.current.length > 0`), per-instance `editorRef`, next-tick `setTimeout`.
  - Pass `onAnswer` (not `quickReplies`) to `AgentChatMessages` (Phase 4 already dropped `quickReplies` from its props).

> State home: the parsed last-message prompt is derived from `messages` and used by `AgentChat` + threaded one hop to `AgentChatMessages`/`MessageRow` → **`useMemo` local + props**, per the decision tree (no context/zustand). MessageRow also re-parses per row for its own rendering (cheap, pure) — acceptable; avoid premature centralization.

- [ ] **Step 3: Update `AgentChat.test.tsx`** (per spec "Testing → AgentChat focus"). The existing two tests assert unconditional focus on `spawn_exit`; rewrite them to the new contract. To exercise prompt type, the mocked `spawn_message` (assistant) content must carry a `cam-ask` block; the suite already mocks `window.api.onEvent`, so emit a `spawn_message` (assistant) then `spawn_exit`:
  - **`choice` → picker focused, input NOT auto-focused:** assistant message with a valid `choice` `cam-ask` block → on `spawn_exit`, the **input `focusSpy` is NOT called** (focus goes to the picker, not the input). (If the test mocks `AgentChatMessages` away as today, assert the input is not focused for `choice`; deepen only if needed to observe the picker.)
  - **`text` → input focused:** assistant message with a valid `text` `cam-ask` block → on `spawn_exit`, the input `focusSpy` **is** called.
  - **no prompt → no focus steal:** plain assistant message (no `cam-ask`) → on `spawn_exit`, `focusSpy` is **NOT** called. (This is the behavior change vs. today's "always focus".)
  - **window hidden → no focus** (keep the existing guard test).

> The current test mocks `AgentChatMessages` to a stub, so the picker isn't in the tree — that's fine: these assertions are about which target `AgentChat` chooses to focus (input vs. not-input), which is observable via the input `focusSpy`. Verifying the picker actually receives focus is covered by `AskPrompt.test.tsx`'s `isActive` behavior. Keep the mocks lean.

- [ ] **Step 4: Run** — `npm run test -- AgentChat` → green; then `npm run test` (whole suite) green.

- [ ] **Step 5: Gate** — typecheck (0), lint:fix && lint (0/0 — watch `react-hooks/exhaustive-deps` on the reworked focus logic; fix the deps, don't blanket-disable), `npm run test`, `npx electron-vite build`. Confirm `AgentChat.tsx` ≤ 300 lines (it is 205 today; the parse swap is net-neutral — if it grows past ~290, extract the focus decision into a small helper in a sibling file).

- [ ] **Step 6: Commit**
```bash
git add src/components/AgentChat/AgentChat.tsx src/hooks/useAgentChatActions.ts src/components/AgentChat/AgentChat.test.tsx
git commit -m "feat(chat): prompt-driven focus (choice→picker, text→input, none→no steal); rename handleQuickReply→onAnswer"
```

---

## Phase 6 — Backend steering rewrite (channel → `cam-ask`) + string-assertion test

**Why last:** the renderer now fully understands `cam-ask`. Flip the backend steering from "never ask" to **channel**: legitimate questions are routed into a single `cam-ask` block; reflexive prose questions have no sanctioned outlet and stop. This is the inversion the user approved and the fix for "asks a question every turn".

**Backend gate caveat (Execution discipline §4–5):** lint/typecheck do **not** cover `electron/**`. The gate here is **`npx electron-vite build`** + a **Vitest test asserting the prompt string**. The **live CLI behavioral check cannot run in the sandbox** — confirm it in the real app post-merge.

**Files:**
- Edit: `electron/services/spawn.service.ts` (rewrite `NO_FOLLOWUP_SYSTEM_PROMPT`)
- Create: `electron/services/spawn.service.test.ts` (assert the steering string content)

- [ ] **Step 1: Rewrite `NO_FOLLOWUP_SYSTEM_PROMPT`** (per spec "Agent steering") from "never ask" to channel. The new wording must convey:
  1. Do **not** append reflexive questions, next-step offers, or "want me to…?" / "would you like…?" / "let me know if…" closing lines.
  2. When you **genuinely need a decision or input to proceed**, ask **only** by emitting a single ` ```cam-ask ` fenced JSON block, with the **schema embedded inline** in the prompt string:
     - `choice`: `{"type":"choice","question":"…","options":[{"label":"…","value":"…","variant":"accept|deny|neutral"}]}` (authorization = a choice with `Yes`/`Yes, always` `accept` + `No` `deny`).
     - `text`: `{"type":"text","question":"…","placeholder":"…"}`.
     - Emit **at most one** block, at the **end** of the turn, **only** when blocked.
  3. Otherwise **end with a statement, no trailing question.**
  - Keep using `--append-system-prompt` exactly as today (re-passed on every spawn incl. `--resume` — that wiring is unchanged; only the constant's string changes).
  - **300-line guard:** `spawn.service.ts` is **exactly 300 lines** today. The rewritten constant is longer than the current 8-line string. To stay ≤ 300, **extract the steering constant into a sibling module** `electron/services/spawn.steering.ts` (e.g. `export const NO_FOLLOWUP_SYSTEM_PROMPT = …`) and import it into `spawn.service.ts`. This both keeps the service under the limit and gives the Phase-6 test a clean import target. (Named export; no `any`; ≤ 300 lines for the new file — trivially.)

- [ ] **Step 2: Write the string-assertion test** `electron/services/spawn.service.test.ts` (or `spawn.steering.test.ts` if the constant is extracted — match the import target), `// @vitest-environment node`. Assert the steering string:
  - **contains the `cam-ask` schema markers** — includes the substring `cam-ask`, `"type":"choice"`, `"type":"text"`, `options`, and `variant` (the embedded schema).
  - **contains the "only when blocked" rule** — a phrase conveying "only when you genuinely need a decision/input to proceed".
  - **contains the "no trailing question otherwise" rule** — a phrase conveying "otherwise end with a statement / no trailing question".
  - (Negative, optional) does **not** still say "Never … end with a question" in the old absolute form that forbade all questions (guards against the rewrite being skipped).

> This is a content assertion, not a behavioral one — it proves the string was rewritten as specified. Per the spec caveat, whether a real `--resume` turn honors it must be confirmed in the running app (the sandbox cannot invoke `claude`).

- [ ] **Step 3: Run** — `npm run test -- spawn` → green.

- [ ] **Step 4: Gate (backend variant)** — `npm run test -- spawn` (green), `npx electron-vite build` (succeeds — this is the real compile gate for `electron/`). Run `npm run typecheck` and `npm run lint` too (they won't cover the electron change but must remain 0/0 for the repo). **By hand:** confirm `spawn.service.ts` ≤ 300 lines and the new `spawn.steering.ts` ≤ 300 lines, no `any`, named imports only.

- [ ] **Step 5: Commit**
```bash
git add electron/services/spawn.service.ts electron/services/spawn.steering.ts electron/services/spawn.service.test.ts
git commit -m "feat(spawn): channel genuine questions into cam-ask blocks (rewrite steering from forbid→route) + string test"
```

- [ ] **Step 6: Post-merge behavioral check (NOT in the sandbox — for the real app).** After this branch merges, in the running app: send a turn that should trigger an authorization/choice and confirm (a) a `cam-ask` picker renders (not prose `Yes/No`), (b) a normal completed turn ends with a statement and **no** trailing question, (c) the picker is keyboard-navigable and answering resumes the session. Record the result against the two `docs/bugs.md` entries.

---

## Done criteria

- All six phases committed **separately**, each gate-clean.
- `npm run typecheck` → 0; `npm run lint` → 0/0; `npx electron-vite build` → succeeds.
- `npm run test` green: `askPrompt` (unit), `AskPrompt` (component), `blockRegistry` (incl. cam-ask cases), `AgentChat` (prompt-driven focus), `spawn` (steering string).
- `quickReplies.ts` deleted; `PERMISSION_PATTERNS`/`QUESTION_PATTERNS`/`detectQuickReplies` gone; `replyStyles` preserved in `askPrompt.ts`.
- No new IPC, no DB, no shared/IPC type; `AskPrompt` type is renderer-only.
- Every touched/new file ≤ 300 lines.
- `docs/bugs.md` entries re-pointed at this feature (when it lands); the steering's live behavioral effect confirmed **in the real app** (Phase 6 Step 6), not from the sandbox.

## Out of scope (per spec — do not start)

- Multi-select prompts.
- A separate inline text field per message (text prompts use the main input).
- Any new IPC, DB persistence, or backend parsing of `cam-ask`.
- Rich option bodies (descriptions/previews) beyond `label`/`value`/`variant`.
- Streaming/partial rendering of a `cam-ask` block before the turn completes.
