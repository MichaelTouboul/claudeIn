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
