# Feature Requests — MVP

The MVP scope, in two parts:
1. **Official Claude Code Desktop features** (from `docs/research/claude-code-desktop-feature-audit.md`, desktop sections only) — the target surface ClaudeIn aims to match/mirror.
2. **Features the app itself brings** — for now, **agent management** (from `docs/feature-requests.md`).

Status legend: ✅ done · 🟡 partial · ⬜ not started · ➖ out of MVP scope (parked).
Companion files: `feature-requests-no-mvp.md` (everything else), `roadmap.md` (strategy), `bugs.md`, `chores.md`.

---

## Part 1 — Official Claude Code Desktop features (the target)

Source: feature audit §15 (Code tab), §16 (Settings sections), §17 (Cowork). Each line = what the official desktop app does + where ClaudeIn stands.

### Sessions & workspace
- **Run many sessions in parallel** (sidebar list, each its own history/folder) — 🟡 tabbed workspace + `SessionsPanel` (3-tier, scope-filtered) shipped; live status (live/recent/idle) done.
- **Per-session Git worktree isolation** — ⬜ (worktrees used for dev only, not user sessions).
- **Environment picker** Local / Remote(cloud) / SSH — ➖ local only (cloud/SSH out of MVP).
- **Session viewer** (open a conversation, read history) — ✅ main-area `SessionViewer` (read + **live-tail**).
- **Session resume** (continue a past session) — ✅ "Continue as is" via `AgentChat resumeSessionId`; **compact-on-resume** ⬜ (no CLI flag — deferred).
- **Continue in** (move session to web / IDE) — ➖ parked.
- **Remote/scheduled tasks** — ➖ parked.

### Prompt & chat
- **Rich prompt box** — `+` attachments / skills / connectors, `@mention` files, drag-drop images/PDFs, interrupt mid-action — 🟡 chat input exists; `/` & `@` autocomplete ⬜; upload dropdown ⬜; interrupt/kill ✅.
- **View modes** Normal / Verbose / Summary — ⬜.
- **Side chat** (ask using session context without polluting the thread, `/btw`) — 🟡 a *global* chat modal exists; session-context side chat ⬜.
- **Permission modes** (Ask / Auto-accept / Plan / Auto / Bypass) — ⬜.

### Panes (the desktop multi-pane workspace)
- **Integrated terminal** — ✅ `TerminalView` (Console).
- **Chat pane** — ✅ `AgentChat`.
- **Diff view** (file-by-file review, comment on lines, AI review) — ⬜.
- **Preview pane** (embedded browser, dev servers, screenshots, self-verify) — ⬜.
- **File editor pane** — ⬜.
- **Plan / Tasks / Subagent panes** — ⬜ (Tasks = the live-activity work, see Part 2).
- **Split-view / drag-resize panes, Views menu** — ➖ parked.

### PR / Git
- **PR monitoring** (CI status, auto-fix, auto-merge, notify on finish) — ⬜.

### Usage & config
- **Usage ring** (per-session context + plan usage) — 🟡 context bar ✅; **plan-usage % is NOT mirrorable** (no official API — established) so ClaudeIn shows local activity instead.
- **Shared config with CLI** (CLAUDE.md, MCP, hooks, skills, settings, models) — ✅ **the `~/.claude` live mirror** (settings/agents/skills/memory/MCP — backend live; agents/skills FE live).
- **Settings sections** (Connectors, Extensions, Capabilities, Usage, Billing, Privacy) — 🟡 settings/MCP read live (backend); **no settings UI yet** ⬜.
- **Computer use** (control the screen) — ➖ parked.

### Cowork (Claude Desktop tab)
- Agentic tasks without a terminal, file creation (xlsx/pptx/docx/pdf), Dispatch, VM isolation — ➖ entirely parked (not an MVP axis for ClaudeIn).

---

## Part 2 — What ClaudeIn brings: agent management

Agent-management features from `docs/feature-requests.md` (ClaudeIn's differentiator beyond the terminal).

- **Browse / inspect agents** (`.claude/agents/*.md`, frontmatter, body, memory, annex) — ✅ `AgentDetail` + tabs.
- **Edit / create / delete agents** (CRUD on agent files) — ✅ create/update/delete + memory CRUD; delete-from-detail-tab ✅ (fixed this session).
- **Live agents mirror** (lists update live as files change) — ✅ agents mirror backend + FE wired live (union user+project, shadowing).
- **Agent memory management** — ✅ `MemoryManager`.
- **Live Agent Activity Visualization** (watch agents/sub-agents work in real time: tree, status, context per node) — ⬜ planned (core of Pillar 2). Building blocks exist (`OrchestratorTree`, `ContextBar`, events store, `spawn.service`).
- **Click an active agent → show its activity** (current tool, live stream) — ⬜.
- **Action-awaited notifications** (signal when an agent waits for input: sidebar badge for project scope, dashboard-tab notif for user scope) — 🟡 `waiting` indicator wired in `SessionsPanel` (piloted sessions only); full notification UX ⬜.
- **Agent Templates** (one-click starter agents: reviewer, test-writer, refactorer…) — ⬜ (Low effort).
- **Optimization Insights** (suggest model downgrades, context warnings, memory-size warnings) — ⬜ (High effort).

---

## Cross-cutting MVP shell items (done)
- App-shell restructure (Header/Workspace/DashboardArea/Footer) — ✅
- Chrome-style tabbed multi-project workspace — ✅
- Rename to **ClaudeIn** + logo — ✅
- Header consumption/activity meter (local activity from transcripts; per-model costs) — ✅
- `_ui/` primitive consolidation + code-quality agent suite — ✅
- **Conversations panel** (3-tier scope-filtered sessions list with live/recent/idle status, main-area viewer with **live-tail**, resume, per-item **pin/archive/soft-delete** via `conversation_meta`) — ✅ (the first big end-to-end FE surface of the `~/.claude` live mirror).
