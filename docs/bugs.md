# Bugs

Known defects to fix. Raw memo — not prioritized. Companion to `docs/feature-requests.md` (features) and `docs/chores.md` (cleanup).

> Effort scale: **Low** (~half day) · **Medium** (~1 day) · **High** (multi-day).

---

## Open

_None._

---

## Fixed (2026-06-01)

### Chat agent asks a question after every response
**Effort:** Low · **Status:** Fixed
The in-app chat agent ended almost every turn with follow-up questions. The repo never sent a prompt encouraging this — it is Claude Code's conversational default. Fixed by steering it off via Claude Code's first-class `--append-system-prompt` (the supported tone-control mechanism, not a fragile output filter) in `electron/services/spawn.service.ts`: every spawned session now appends a concise instruction to not end turns with "want me to…?" prompts.

### Cursor focus on a proposed client interaction
**Effort:** Low · **Status:** Fixed
When the agent surfaces a user-interaction prompt (`spawn_input_request` → `waitingInput` true), focus now auto-lands on the chat editor via a `ref` + `useEffect` in `src/components/AgentChat/AgentChatInput/AgentChatInput.tsx`, so the user can respond without clicking first.

### Chat input placeholder overlaps the format bar
**Effort:** Low · **Status:** Fixed · UI
The Lexical placeholder was absolutely positioned at the top of the toolbar+editor shell, overlapping the formatting toolbar. Fixed by wrapping the `ContentEditable` in its own `relative` container (below the `Toolbar`) so the placeholder anchors to the top of the editable area, not the toolbar — `src/components/AgentChat/RichEditor/RichEditor.tsx`.

### macOS window title bar overlaps header UI
**Effort:** Low–Medium · **Status:** Fixed · UI
`main.ts` already used `titleBarStyle: 'hiddenInset'`; the header's traffic-light safe-zone padding was unconditional (`pl-20` on every platform). Now `process.platform` is exposed via preload (`window.api.platform`) + `env.d.ts`, a `src/lib/platform.ts` `isMac` helper gates the padding, and `Header` applies `pl-20` only on macOS (`pl-4` elsewhere) so the traffic lights never crush header elements while non-mac stays correct.
