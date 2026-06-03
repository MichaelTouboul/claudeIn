# Bugs

Known defects to fix. Raw memo — not prioritized. Companion to the feature backlog (`docs/feature-requests-mvp.md` + `docs/feature-requests-no-mvp.md`) and `docs/chores.md` (cleanup).

> Effort scale: **Low** (~half day) · **Medium** (~1 day) · **High** (multi-day).

---

## Open

### Deleting an agent from its detail tab leaves a stale tab (no-op part FIXED)
**Effort:** Low · **Status:** Partially fixed (2026-06-02)
The `onDelete` **no-op is fixed**: the renderer-wiring slice (commit on `15986b2c`) wired `TabBody`'s `onDelete` to `useDashboardStore.deleteAgent` (was `() => {}`), so deletion now actually runs and — via the live agents mirror — the agent disappears from the lists without a manual refresh. **Remaining:** after deletion the `agent` internal tab stays open and falls through to `NotFound` ("Agent not found…") — it should be auto-closed/removed in the same step (via `useWorkspaceStore`). Low priority.

---

## Fixed (2026-06-02)

### Chat agent asks a question after every response
**Effort:** Low · **Status:** Fixed (2026-06-02) — **confirmed working in the real app**
History: first "Fixed" via `--append-system-prompt`, then re-opened (the firm "never ask" wording kept leaking). Final approach (the interactive ask-prompts feature, spec `docs/superpowers/specs/2026-06-02-interactive-ask-prompts-design.md`, commit `35f66975`): instead of *forbidding* questions, the steering now **channels** them. `NO_FOLLOWUP_SYSTEM_PROMPT` (extracted to `electron/services/spawn.steering.ts`) tells the agent to never append reflexive prose questions/offers AND, when it genuinely needs a decision, to ask **only** via a single ` ```cam-ask ` JSON block — which the app renders as an interactive picker. Reflexive prose questions thus have no sanctioned outlet. A Vitest test asserts the steering string contains the schema + the "only when blocked / no trailing question" rule. The live behavioural check (does a `--resume` turn honour the steering?) could not run in the worktree sandbox, but the user **confirmed it works in the real app on 2026-06-02** — reflexive follow-up questions are gone and genuine decisions surface as the interactive picker.

---

## Fixed (2026-06-01)

### Auto-focus the chat input when the agent finishes a turn
**Effort:** Low · **Status:** Fixed → refined 2026-06-02 (prompt-driven focus)
Originally: focus forced on **every** `spawn_exit` (a band-aid, because the real `spawn_input_request` "input needed" signal never fires under `--print`). Refined by the interactive ask-prompts feature (commit `3f43d798`): focus is now driven by the parsed `cam-ask` prompt on the last agent message — `choice` → focus the picker (arrows work immediately), `text` → focus the chat input, **no prompt → focus is NOT stolen**. This is the deterministic input-needed signal that was missing. The existing guards (`document.hidden`, auto-flow from the queue, per-`AgentChat` `editorRef`) are kept. Covered by `src/components/AgentChat/AgentChat.test.tsx`.

### Terminal letter-spacing spread the prompt text
**Effort:** Low · **Status:** Fixed · UI
The xterm `Terminal({...})` options in `src/components/Workspace/DashboardArea/Console/TerminalView/TerminalView.tsx` set `letterSpacing: 0.2`, visibly spreading the branch name / prompt text ("space-letter trop grand"). Removed the `letterSpacing` option entirely (xterm default 0); all other options (lineHeight 1.45, fontSize 13, weights, theme, padding) unchanged.

### Chat input placeholder overlaps the format bar
**Effort:** Low · **Status:** Fixed · UI
The Lexical placeholder was absolutely positioned at the top of the toolbar+editor shell, overlapping the formatting toolbar. Fixed by wrapping the `ContentEditable` in its own `relative` container (below the `Toolbar`) so the placeholder anchors to the top of the editable area, not the toolbar — `src/components/AgentChat/RichEditor/RichEditor.tsx`.

### macOS window title bar overlaps header UI
**Effort:** Low–Medium · **Status:** Fixed · UI
`main.ts` already used `titleBarStyle: 'hiddenInset'`; the header's traffic-light safe-zone padding was unconditional (`pl-20` on every platform). Now `process.platform` is exposed via preload (`window.api.platform`) + `env.d.ts`, a `src/lib/platform.ts` `isMac` helper gates the padding, and `Header` applies `pl-20` only on macOS (`pl-4` elsewhere) so the traffic lights never crush header elements while non-mac stays correct.
