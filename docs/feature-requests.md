# Feature Requests

Ideas and features to build later. Not planned, not prioritized — just captured.

---

## Rich Text Editor for Chat Input
**Status:** Idea
**Complexity:** High (2-3h+)
**Added:** 2026-05-27

Replace the plain textarea in AgentChat with a rich text editor (Quill-style). Bold, italic, code blocks. The key idea: Claude should interpret formatting semantically — bold words get more weight, code blocks are treated as literals, etc.

**Challenges:**
- `claude --print` accepts plain text stdin, not HTML/markdown
- Needs a conversion layer: HTML → structured prompt with emphasis instructions
- Claude doesn't natively weight bold text — requires prompt engineering ("words in **bold** are high-priority")
- UX inconsistency with terminal Claude Code (plain text)

**Possible approach:**
- Use a lightweight editor like TipTap (ProseMirror-based, React-native)
- Convert to markdown on submit
- Inject a system instruction: "The user's prompt uses markdown formatting. **Bold** indicates emphasis. `code` indicates literal values."
- Start simple: just support **bold** and `code` — not full WYSIWYG

---

## Terminal PTY (Bottom Panel)
**Status:** Planned — next major feature
**Complexity:** High (full day)

xterm.js + node-pty integrated as a bottom panel (VS Code-style). Run Claude Code directly from the app instead of switching to an external terminal. Multiple terminal tabs. Session resume.

---

## Dashboard Persistence
**Status:** Planned
**Complexity:** Medium

Save/restore dashboard state per project. Multiple named dashboards per project. Each dashboard = a saved view with open tabs, selected agent, scroll positions.

---

## Project-Scoped Chat
**Status:** Planned
**Complexity:** Medium

Chat with Claude Code in the context of a project but not tied to a specific agent. Appears in the main content area (not the GlobalChatModal). Useful for general project questions.

---

## Session Usage Analytics
**Status:** Planned (stretch goal from session ingestion)
**Complexity:** Medium

Parse token usage from JSONL session files and aggregate into the CostDashboard. Per-day, per-agent, per-model breakdowns with estimated cost using model pricing.

---

## Auto-Update
**Status:** Future
**Complexity:** Medium

electron-updater with GitHub Releases. Check for updates on launch, download in background, prompt to restart.

---

## Packaging & Distribution
**Status:** Future
**Complexity:** Medium

Code signing (Apple Developer cert), notarization, DMG packaging via electron-builder. Homebrew cask formula for easy install.

---

## Session Search
**Status:** Idea
**Complexity:** Medium

Full-text search across all sessions of a project. Find conversations by keyword, agent name, tool used, or date range.

---

## Agent Templates
**Status:** Idea
**Complexity:** Low

Pre-built agent templates (code reviewer, test writer, refactorer, etc.) that can be created with one click. Starter frontmatter + body prompt.

---

## Optimization Insights
**Status:** Idea
**Complexity:** High

Analyze agent usage patterns and suggest optimizations:
- "This agent uses Opus but only calls Read/Grep — Haiku would suffice"
- "This sub-agent exceeds 80% context regularly — add maxTurns"
- "This memory has 180 lines — approaching truncation limit"

---

## Stop Thinking Button (Chat)
**Status:** Planned (Task 16 in session ingestion plan)
**Complexity:** Low
**Added:** 2026-05-27

Show a prominent "Stop generating" button in the AgentChat message area when the agent is thinking. Currently there's only a small "Stop" link in the terminal header bar which is easy to miss. The new button should be centered below the "thinking..." indicator, highly visible, and wire to the existing `handleKill` function.

---

## Session Resume from SessionViewer
**Status:** Planned (Task 17 in session ingestion plan)
**Complexity:** Medium
**Added:** 2026-05-27

When browsing past sessions in the SessionViewer, there's no way to continue the conversation. Add a prompt input at the bottom of the viewer that resumes the session by spawning a new Claude Code process with `--resume` / `resume_session_id`. The user can type a follow-up message and the session picks up where it left off, transitioning to the AgentChat view.

---

## Playwright E2E / UI Verification
**Status:** Idea
**Complexity:** Medium
**Added:** 2026-05-29

End-to-end UI verification for the Electron app using Playwright's Electron API (`_electron.launch`), not the generic browser-MCP flow.

**Why the Electron API specifically:**
- The renderer depends on `window.api` (the contextBridge from `electron/preload.ts`). In a plain browser (e.g. pointing the Playwright MCP at the Vite dev URL `http://localhost:5173`), `window.api` is `undefined`, so every IPC-driven view breaks. Generic browser automation only works for purely presentational components or with a stubbed `window.api`.
- `_electron.launch({ args: ['.'] })` boots the real app; `app.firstWindow()` returns a normal Playwright `Page`, then standard click/fill/assert/screenshot APIs apply.

**Setup sketch:**
- `npm i -D @playwright/test playwright`
- A small launch helper + a first smoke test (open app → assert main layout renders → screenshot)
- Build first (`electron-vite build`) or drive the dev build
- Add `test:e2e` script to `package.json`

**Possible integration:**
- Wire a UI-verification step into the dev workflow — launch Playwright-Electron, assert the layout renders, capture a screenshot for review (e.g. via the `verify` skill or a dedicated E2E smoke test).
