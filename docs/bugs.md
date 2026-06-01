# Bugs

Known defects to fix. Raw memo — not prioritized. Companion to `docs/feature-requests.md` (features) and `docs/chores.md` (cleanup).

> Effort scale: **Low** (~half day) · **Medium** (~1 day) · **High** (multi-day).

---

## Open

### Chat agent asks a question after every response
**Effort:** Low · **Status:** Re-opened (2026-06-01) → steering strengthened
Previously marked Fixed via `--append-system-prompt` in `electron/services/spawn.service.ts`, but the user reports the agent STILL ends nearly every turn with a follow-up question. Investigation: `--append-system-prompt` is a valid, parsing flag (`claude` 2.1.159) and the code already passes it on BOTH fresh and `--resume` spawns (added unconditionally before the resume/fresh branch), so the steering does survive resume — the original soft wording ("only ask when you genuinely need…") was the gap, leaving the model an out it took on almost every turn. Strengthened `NO_FOLLOWUP_SYSTEM_PROMPT` to a firm, absolute instruction (never append next-steps/offers/"want me to…?" lines; ask only when literally blocked). NOTE: the live behavioural CLI test (does a resumed turn honour the appended prompt?) could not be run in the worktree sandbox — `claude` invocations are blocked there. Kept Open until confirmed in the real app: if firm wording still does not hold, the steering may need a different mechanism (or reverting).

---

## Fixed (2026-06-01)

### Auto-focus the chat input when the agent finishes a turn
**Effort:** Low · **Status:** Fixed
Supersedes the earlier "Cursor focus on a proposed client interaction" fix, which bound focus to `waitingInput` (driven by the backend `spawn_input_request` event). That event never fires: the app runs `claude --print` (one-shot, one process per turn, continued via `--resume`), so `waitingInput` stays false and the focus effect never ran. Focus now lands on the chat input when a turn completes — on the `spawn_exit` event in `src/components/AgentChat/AgentChat.tsx` — deferred to the next tick and guarded against stealing focus from a backgrounded window (`document.hidden`) or when work is auto-flowing from the queue. Scoped per `AgentChat` instance via its own `editorRef`, so only the tab whose turn finished gets focus. The dead `waitingInput` focus effect in `AgentChatInput.tsx` was removed (its styling/placeholder use of `waitingInput` kept). Covered by `src/components/AgentChat/AgentChat.test.tsx`.

### Terminal letter-spacing spread the prompt text
**Effort:** Low · **Status:** Fixed · UI
The xterm `Terminal({...})` options in `src/components/Workspace/DashboardArea/Console/TerminalView/TerminalView.tsx` set `letterSpacing: 0.2`, visibly spreading the branch name / prompt text ("space-letter trop grand"). Removed the `letterSpacing` option entirely (xterm default 0); all other options (lineHeight 1.45, fontSize 13, weights, theme, padding) unchanged.

### Chat input placeholder overlaps the format bar
**Effort:** Low · **Status:** Fixed · UI
The Lexical placeholder was absolutely positioned at the top of the toolbar+editor shell, overlapping the formatting toolbar. Fixed by wrapping the `ContentEditable` in its own `relative` container (below the `Toolbar`) so the placeholder anchors to the top of the editable area, not the toolbar — `src/components/AgentChat/RichEditor/RichEditor.tsx`.

### macOS window title bar overlaps header UI
**Effort:** Low–Medium · **Status:** Fixed · UI
`main.ts` already used `titleBarStyle: 'hiddenInset'`; the header's traffic-light safe-zone padding was unconditional (`pl-20` on every platform). Now `process.platform` is exposed via preload (`window.api.platform`) + `env.d.ts`, a `src/lib/platform.ts` `isMac` helper gates the padding, and `Header` applies `pl-20` only on macOS (`pl-4` elsewhere) so the traffic lights never crush header elements while non-mac stays correct.
