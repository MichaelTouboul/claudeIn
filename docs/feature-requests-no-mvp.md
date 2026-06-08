# Feature Requests — Post-MVP / backlog

Everything from the old `feature-requests.md` that is **not** in the MVP scope (MVP = official Claude Code Desktop features + agent management → see `feature-requests-mvp.md`). Organized by theme; raw idea backlog.

Status legend: ✅ done · 🟡 partial · ⬜ not started.
Effort: **Low** (~half day) · **Medium** (~1 day) · **High** (multi-day).

---

## Already done this cycle (kept for record)
- **Real-time mirror of `~/.claude`** (umbrella) — ✅ backend complete (settings · agents · skills · memory · MCP · conversation live-tail); FE live for agents/skills + the conversations panel. *Was the big "After Phase 0" umbrella; now largely shipped.*
- **App-shell restructure** — ✅
- **Rename app + logo (ClaudeIn)** — ✅
- **Header usage bar** — ✅ shipped as the header **activity meter** (local activity from transcripts + per-model costs). NB: true *plan-usage %* is not mirrorable (no official API) — see the MVP file.
- **Session Resume** (continue a past session) — ✅ shipped in the conversations viewer.
- **Code-quality agent suite + `_ui/` consolidation** — ✅

---

## Chat input UX
- **`/` and `@` autocomplete menus** — ⬜ Medium. `/` surfaces all commands; `@` surfaces files/agents/etc. Seam exists (`matchSlashQuery` in `RichEditor/serialize.ts`). (Partially overlaps the `cam-ask` picker already shipped.)
- **Upload button → dropdown** of upload types (image/file/folder/paste…) — ⬜ Low–Medium.
- **Audio prompt input** (speech-to-text) — ⬜ Medium–High.
- **Stop Thinking button** (prominent "Stop generating" in the chat area, wired to `handleKill`) — ⬜ Low.
- **Native slash commands — deferred from v1** (v1 ships only `/model` + a registry honesty pass; see `docs/superpowers/specs/2026-06-08-native-slash-commands-v1-design.md`) — ⬜:
  - `/cost` (Low, local — show this conversation's tokens/%/cost from data already tracked) and `/help` (Low, local — list working commands). Easy follow-ups.
  - `/init` (Medium — app-crafted prompt to generate/update `CLAUDE.md` via `--print`) and `/review` (Medium — PR/diff review prompt).
  - `/mcp` `/memory` `/config` `/permissions` (Medium each) — need a dedicated app view first; then a `kind:'view'` registry entry.
  - **Custom user/project commands** (`.claude/commands/*.md`) + **skills runner** surfaced in the slash menu (High, Pillar 2) — a separate larger feature.
  - Removed as N/A under the GUI/`--print`: `/vim` `/doctor` `/terminal-setup` `/login` `/logout` `/status`.

## ResponseBody block actions
- **Table export → PDF** (Low) / **Excel** (Medium, TBD) — ⬜. On the `TableBlock`/`BlockShell` toolbar.
- **Code converter in chat** (Claude-powered language transform on a code block) — ⬜ Medium–High.

## Shell / layout
- **Footer status band** (VS Code-style: git branch, status) — ⬜ Low. Footer slot exists, needs content.
- **Right action sidebar** (contextual actions: edit file/table…) — ⬜ Medium. Reserve the slot.
- **Launch page refactor** — ⬜ Medium (details TBD).
- **Dashboard `+` button behaviour** — 🟡 the `+` opens a launcher; the full "New discussion vs user-scope agent" choice + user-scope-vs-project-scope dashboard model is unresolved. Needs a small product decision.

## Sessions & persistence
- **Session Search** (full-text across a project's sessions: keyword/agent/tool/date) — ⬜ Medium. *This is the "archive / énormément de conversations" surface = conversations tranche 2 (global + search/virtualization).*
- **Dashboard Persistence** (save/restore named dashboards per project: open tabs, selection, scroll) — ⬜ Medium.
- **Session Usage Analytics** (per-day/agent/model token+cost breakdowns in CostDashboard) — 🟡 per-model costs + CostDashboard partially cover this.

## Ship / ops
- **Auto-Update** (electron-updater + GitHub Releases) — ⬜ Medium, future.
- **Packaging & Distribution** (code signing, notarization, DMG, Homebrew cask) — ⬜ Medium, future.
- **Playwright E2E / UI verification** (Electron API `_electron.launch`, not browser-MCP, because `window.api` needs the real app) — ⬜ Medium.

---

> For the prioritized plan / strategy / competitive landscape, see `docs/roadmap.md`.
