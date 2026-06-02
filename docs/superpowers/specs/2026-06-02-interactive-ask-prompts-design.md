# Interactive ask-prompts (structured choice / text) — design

**Date:** 2026-06-02
**Status:** Approved (design) — pending implementation plan
**Scope:** Frontend (renderer) + a one-line backend steering rewrite. No new IPC, no DB.

## Context & motivation

The in-app chat (`AgentChat`) runs the agent as `claude --print` — one-shot, one process
per turn, continued via `--resume`. Because it is **non-interactive**, Claude never sends a
native permission/choice prompt protocol; it just emits free text. Today the app tries to
reconstruct interactivity heuristically in `quickReplies.ts`: any agent message ending in
`?` gets `Yes`/`No` **mouse-only** buttons (`MessageRow.tsx`). This is the source of two
standing defects and one missing capability:

1. **Quick-reply false positives** — an open question ("Comment je peux t'aider ?") ends
   with `?`, so it wrongly gets `Yes`/`No` buttons. (`quickReplies.ts` `QUESTION_PATTERNS`
   matches `/\?\s*$/m`.)
2. **"Agent asks a question every turn"** (`docs/bugs.md`, re-opened) — the
   `NO_FOLLOWUP_SYSTEM_PROMPT` in `spawn.service.ts` *fights* the model's reflexive
   follow-ups with ever-firmer wording, which keeps leaking.
3. **"Auto-focus when the turn finishes"** (`docs/bugs.md`, "Fixed" band-aid) — focus is
   forced on **every** `spawn_exit` because the real "input needed" signal
   (`spawn_input_request`) never fires under `--print`.

**The goal (user intent):** when the agent genuinely needs a decision — an authorization,
or "which option?" — present the choices as a **keyboard-navigable picker** (↑/↓ + Enter),
like Claude Code's native terminal authorization prompt. Free-text questions should focus
the chat input.

A single mechanism — a **structured prompt protocol** the agent emits and the app parses —
is the proper fix that subsumes all three: legitimate questions become structured and
interactive (kills the reflexive-prose follow-up), and the presence of a structured prompt
is the real "input needed" signal that drives focus deterministically.

## Decisions (locked)

- **Structured protocol (not heuristic parsing).** The agent emits choices in a
  machine-readable block; the app parses it. Deterministic and testable.
- **v1 interaction types:** single **choice** (N options, with the authorization case being
  just `Yes / Yes, always / No`) and **free text**. No multi-select.
- **Carrier:** a fenced code block with the reserved language `cam-ask` containing JSON,
  dispatched by the existing `blockRegistry`. Malformed JSON → falls back to a normal code
  block.
- **Steering is channeled, not just forbidden** (§ Agent steering).
- **`text` prompts focus the existing chat input** — no separate inline field.
- **`onAnswer` is passed by props** (one hop, MessageRow → picker), not via context.

## Protocol (the `cam-ask` block)

The agent emits at most one block, at the end of the turn, only when it needs input:

````
```cam-ask
{"type":"choice","question":"Which approach?","options":[
  {"label":"Full refactor","value":"a"},
  {"label":"Minimal patch","value":"b","variant":"neutral"}
]}
```
````

Type (renderer-side, used by the parser and the picker):

```ts
type AskOption = { label: string; value: string; variant?: 'accept' | 'deny' | 'neutral' };
type AskPrompt =
  | { type: 'choice'; question: string; options: AskOption[] }
  | { type: 'text'; question: string; placeholder?: string };
```

- **Authorization** is just a `choice` with options `Yes` (variant `accept`),
  `Yes, always` (`accept`), `No` (`deny`). No special type. The `variant` reuses the
  existing `replyStyles` map; a `choice` containing an `accept`/`deny` option renders the
  Shield "authorization" affordance (the existing `MessageRow` treatment).
- The type lives in the renderer only — the backend does not parse it (it only instructs the
  agent), so it does not need to be a shared/IPC type.

## Agent steering (resolves "asks a question every turn")

Rewrite `NO_FOLLOWUP_SYSTEM_PROMPT` in `electron/services/spawn.service.ts` from
"never ask" to **channel**:

> Do not append reflexive questions, next-step offers, or "want me to…?" lines. When you
> genuinely need a decision or input from the user to proceed, ask for it **only** by
> emitting a single ` ```cam-ask ` fenced JSON block with this schema: `<schema>`. Otherwise
> end your turn with a statement, no trailing question.

This is the inversion the user approved: legitimate questions are routed into the structured,
interactive path; reflexive prose questions have no sanctioned outlet and stop. The schema
string is embedded in the prompt. (The live CLI behavioral check — does a `--resume` turn
honor this? — must be confirmed in the real app, same caveat as the existing bug entry; the
worktree sandbox cannot invoke `claude`.)

## Parsing & rendering (fits the existing block system)

- **`parseAskPrompt(content: string): AskPrompt | null`** — finds the last ` ```cam-ask `
  fenced block in the message, `JSON.parse`s it, validates the shape, and returns the
  `AskPrompt` (or `null` if absent/invalid/wrong shape). Replaces `detectQuickReplies` and
  its regex patterns.
- **`blockRegistry.tsx`** — when the `Code` dispatcher sees `lang === 'cam-ask'`, it renders
  **nothing** (`null`): the block is metadata consumed by the picker, not inline content. If
  the JSON is invalid, it renders the normal `CodeBlock` (visible, debuggable). The reserved
  language string is a shared constant referenced by both the registry and `parseAskPrompt`.
- **`MessageRow.tsx`** — parses the message via `parseAskPrompt` and renders the picker
  (`AskPrompt`) below the prose, **interactive only when `isLast`**. Earlier answered
  prompts still render but inert (disabled). The Shield "authorization" header treatment is
  driven by the parsed prompt having an `accept`/`deny` option (replacing the
  `PERMISSION_PATTERNS` test).

## The picker + keyboard (`AskPrompt.tsx`)

New component `src/components/AgentChat/AskPrompt/AskPrompt.tsx`. Props:
`{ prompt: AskPrompt; isActive: boolean; onAnswer: (value: string) => void }`.

```
  Which approach?
❯ ● Full refactor
  ○ Minimal patch
```

- **`type:'choice'`** — vertical option list with roving selection. **↑/↓** move the
  highlight (clamped at ends), **Enter** submits the highlighted option's `value` via
  `onAnswer`. Mouse hover/click also works. Optional **1–9** number shortcuts. When
  `isActive` becomes true the list container takes focus so arrows work without a click.
- **`type:'text'`** — renders no picker; instead `AgentChat` focuses the existing chat input
  and shows `question`/`placeholder` as the input placeholder. (The `AskPrompt` component
  returns null for `text`; the text affordance is the main input.)

## Focus (resolves "auto-focus when the turn finishes")

Replace the unconditional `spawn_exit` focus in `AgentChat.tsx`. On turn completion, run
`parseAskPrompt` on the last agent message:

- `choice` → focus the **picker** (arrows work immediately).
- `text` → focus the **chat input** (with the question as placeholder).
- no prompt → **do not** steal focus.

This is the deterministic "input needed" signal `--print` never provided. The existing
guards (`document.hidden`, auto-flow from the queue, per-`AgentChat` `editorRef`) are kept.

## Answer round-trip

Selecting a choice (or sending free text) sends the value as the next user turn through the
**existing** send/`--resume` path that `handleQuickReply` uses today in
`useAgentChatActions.ts` (renamed `onAnswer`). After answering, that message is no longer
`isLast`, so its picker becomes inert. No new IPC.

## Error handling

- Malformed `cam-ask` JSON → `blockRegistry` renders a normal `CodeBlock` (never crashes;
  visible for debugging). `parseAskPrompt` returns `null`.
- `choice` with no valid `options` → `parseAskPrompt` returns `null` (no picker).
- Multiple `cam-ask` blocks → the **last** one wins.
- A `cam-ask` block on a non-last message → rendered inert (not interactive).

## Testing

- **`parseAskPrompt`** (unit): valid `choice`, valid `text`, malformed JSON → `null`, a
  non-`cam-ask` code block → `null`, extraction when surrounded by prose, multiple blocks →
  last wins.
- **`AskPrompt`** (component): ↑/↓ moves the highlighted option; Enter calls `onAnswer` with
  the highlighted value; click calls `onAnswer`; inert when `!isActive`.
- **`blockRegistry`**: `cam-ask` valid → renders nothing; invalid → `CodeBlock` fallback.
- **`AgentChat`** focus: `choice` → picker focused, `text` → input focused, no prompt → no
  focus steal. Updates `AgentChat.test.tsx`.
- **`spawn.service`**: the rewritten steering string contains the `cam-ask` schema and the
  "only when blocked / no trailing question" rule.

## File layout

```
electron/services/spawn.service.ts                ← rewrite NO_FOLLOWUP_SYSTEM_PROMPT (channel → cam-ask)
src/components/AgentChat/askPrompt.ts              ← parseAskPrompt + AskPrompt type + replyStyles + CAM_ASK_LANG (replaces quickReplies.ts)
src/components/AgentChat/AskPrompt/AskPrompt.tsx    ← the keyboard-navigable picker (replaces inline buttons)
src/components/AgentChat/MessageRow/MessageRow.tsx  ← use AskPrompt, driven by parseAskPrompt
src/components/ResponseBody/blockRegistry.tsx       ← cam-ask → null, malformed → CodeBlock fallback
src/components/AgentChat/AgentChat.tsx              ← focus driven by parseAskPrompt(last message)
src/hooks/useAgentChatActions.ts                   ← rename handleQuickReply → onAnswer (same send/resume logic)
```

`quickReplies.ts` is replaced by `askPrompt.ts`; the heuristic `PERMISSION_PATTERNS` /
`QUESTION_PATTERNS` are deleted, `replyStyles` is kept. All touched files stay under the
300-line limit; `AskPrompt.tsx` is a new focused component.

## Bugs this closes

- `docs/bugs.md` → **"Chat agent asks a question after every response"** — superseded by the
  channeled steering: questions become structured `cam-ask` blocks; reflexive prose questions
  are removed.
- `docs/bugs.md` → **"Auto-focus the chat input when the agent finishes a turn"** — replaced
  by prompt-driven focus (focus only when there is a real `cam-ask` prompt, targeted to
  picker vs input by type).

Both entries are updated to point at this feature when it lands.

## Out of scope (later / not now)

- Multi-select prompts.
- A separate inline text field per message (text prompts use the main input).
- Any new IPC, DB persistence, or backend parsing of `cam-ask`.
- Rich option bodies (descriptions, previews) beyond `label`/`value`/`variant`.
- Streaming/partial rendering of a `cam-ask` block before the turn completes.
```
