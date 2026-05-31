# Feature Requests

Ideas and features to build later. Not planned, not prioritized — just captured.

> For the prioritized plan, product strategy, competitive landscape, and repos to study, see **`docs/roadmap.md`**. This file is the raw idea backlog.

> Effort scale: **Low** (~half day) · **Medium** (~1 day) · **High** (multi-day). Scope tags: **MVP**, **Post-MVP**, **After Phase 0** (Phase 0 = UI/UX skeleton).

---

## Batch captured 2026-05-31

### Real-time mirror of `.claude` (root + per-project)
**Scope:** After Phase 0 · **Effort:** High · **Status:** Idea
Everything in the app should be **real-time** and **perfectly mirror** the on-disk `.claude` — both the root `~/.claude` and each project's `.claude/`. Agents, skills, hooks, MCP, settings, and especially **running agents / active conversations** must reflect actual state live, not a snapshot you opened in-app. This supersedes and absorbs the **Live Agent Activity Visualization** entry below: that animated runtime tree is one surface of this broader "the UI is a live mirror of `.claude`" goal. **Sequencing: build this only after Phase 0** (the UI/UX skeleton) is in place.

### Per-project Dashboard with tabs (skeleton)
**Scope:** MVP · **Effort:** Medium · **Status:** Idea
Two kinds of dashboard:
- **Project dashboard** — tabbed: **Chat · Context · Task (Jira ticket) · Plan**. For MVP, only **Chat** is functional; the other tabs are **skeletons** (empty shells, no logic yet).
- **Agent dashboard** — keep as it is today (works well, no change).

### Action-awaited notifications
**Scope:** MVP · **Effort:** Medium · **Status:** Idea
Signal when an agent is waiting for user input, in **two places by scope**:
- **Project scope** → badge/indicator on the conversation in the **left sidebar**.
- **User scope** → notification on the **dashboard tab** itself.

### `/` and `@` autocomplete menus
**Scope:** MVP · **Effort:** Medium · **Status:** Idea
In the chat input, typing **`/`** must surface **all available commands/functions**; **`@`** must surface its full set (files/agents/etc.) the same way. (The Lexical editor already has the slash-query seam — `matchSlashQuery` in `RichEditor/serialize.ts`.)

### Click an active agent → show its activity
**Scope:** MVP · **Effort:** Medium · **Status:** Idea
Clicking an active agent (in the Activity zone) opens a view of **what that agent is doing right now** — current tool, progress, live stream.

### Header global usage bar
**Scope:** MVP · **Effort:** Low–Medium · **Status:** Idea
A global **usage progress bar in the app header**, like Claude's "Plan usage limits → Current session N% used · Resets in Xh" (reference screenshot 2026-05-31). Shows session/plan budget consumed at a glance.

### Visualize background tasks
**Scope:** MVP · **Effort:** Medium · **Status:** Idea · needs a small product decision
A surface for **background tasks** in flight. Open product question to resolve first: **how to differentiate an "agent" from a "session"** in this view (vocabulary + visual model).

### Table export (PDF / Excel)
**Scope:** PDF = MVP · Excel = TBD · **Effort:** PDF Low, Excel Medium · **Status:** Idea
For a `TableBlock` rendered in chat, allow **export to PDF** (MVP — trivial) and **export to Excel** (decide based on effort; not committed). Lives on the block's toolbar/`BlockShell`.

### Right action sidebar
**Scope:** Post-MVP · **Effort:** Medium · **Status:** Idea
A **right-hand sidebar** hosting contextual actions to be defined later (e.g. edit a file, edit a table…). For now just reserve the architectural slot.

### Launch page refactor
**Scope:** MVP · **Effort:** Medium (TBD) · **Status:** Idea
Refactor the launch / landing page. Details to come — captured here so it isn't lost.

### Code converter in chat
**Scope:** Post-MVP · **Effort:** Medium–High · **Status:** Idea
In-chat conversion of a code block between languages (TS → JS → Python, etc.). Already noted as a deferred block follow-on (Claude-powered block transform on `ResponseBody` blocks).

---

## Live Agent Activity Visualization
**Status:** Idea
**Complexity:** High (multi-session, real-time)
**Added:** 2026-05-31

A fluid, pleasant way to **watch agents and sub-agents work in real time** — one of the platform's signature advantages and a core part of Pillar #2 (visualize the ecosystem). This is the **Activité** axis (the runtime), as opposed to the **Définitions** axis (the static catalog of agents/skills/hooks). See `docs/roadmap.md` and the sidebar IA discussion.

**The need:**
- See every **conversation in progress** at a glance.
- Expand each into its **live agent → sub-agent tree**: who is running, who is idle/done/waiting, who spawned whom.
- Per node: current activity (which tool is running), and **context/token budget** (the `ContextBar` already exists for this).
- Make it feel *alive and nice* — smooth transitions when a sub-agent spawns or finishes, status pulses, gentle expand/collapse — not a raw scrolling log.

**Conceptual clarity (decided):** "orchestrator" and "sub-agent" are **not agent types** — they describe a **runtime relation** (who delegates to whom inside a given conversation). The visualization renders that relation live; it does not need a new static category.

**Existing building blocks to reuse:**
- `AgentTree` / `OrchestratorTree` (hierarchical agent views) — repurpose for the live runtime tree.
- `ContextBar` (per-agent token/cost/context %).
- `EventConsole` + the events store — the live hook-event stream (`PreToolUse`, `PostToolUse`, `SubagentStart`, `SubagentStop`, `Usage`) is the data feed.
- `spawn.service` (running `claude` processes).

**Challenges:**
- Deriving a clean tree + node states (active / idle / waiting-for-input / done / error) from the raw event stream.
- Keeping it real-time and smooth without re-render storms (selector-based zustand, animate only what changed).
- Mapping `SubagentStart/Stop` events to spawn/teardown animations.
- Scaling to several concurrent conversations / many sub-agents.

**Relation to other work:**
- This is the heart of the **sidebar redesign** (Définitions vs Activité): Zone 1 "En cours" = this visualization.
- Pairs with multi-project (Phase 0): watch activity across projects.

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
