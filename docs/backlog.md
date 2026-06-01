# Backlog — at-a-glance index

One table for all **open** feature requests, chores, and bugs. Detail lives in `feature-requests.md`, `chores.md`, `bugs.md`; clusters (build-together groups) are defined at the top of `feature-requests.md`.

> Effort: **Low** ~½ day · **Med** ~1 day · **High** multi-day. Scope: **MVP** · **Post** (Post-MVP) · **P0+** (After Phase 0) · **Fut** (Future) · **Idea**.

| Type | Item | Cluster | Scope | Effort |
|---|---|---|---|---|
| feature | Footer status band (git branch, VS Code-style) | A · App shell | MVP | Low |
| feature | Header global usage bar | A · App shell | MVP | Low–Med |
| feature | Rename app + logo (ClaudIn/ClaudeIn) | A · App shell | MVP | Low+Med |
| bug | macOS title-bar overlaps header UI | A · App shell | — | Low–Med |
| feature | `/` and `@` autocomplete menus | B · Chat input | MVP | Med |
| feature | Upload button → dropdown of types | B · Chat input | MVP | Low–Med |
| bug | Chat input placeholder overlaps format bar | B · Chat input | — | Low |
| bug | Cursor focus on a proposed interaction | B · Chat input | — | Low |
| feature | Audio prompt input (speech-to-text) | B · Chat input | Post | Med–High |
| feature | Table export (PDF / Excel) | C · Block actions | PDF=MVP | Low/Med |
| feature | Code converter in chat | C · Block actions | Post | Med–High |
| feature | Real-time mirror of `.claude` (umbrella) | D · Live activity | P0+ | High |
| feature | Live Agent Activity Visualization | D · Live activity | Idea | High |
| feature | Click an active agent → show its activity | D · Live activity | MVP | Med |
| feature | Visualize background tasks | D · Live activity | MVP | Med |
| feature | Action-awaited notifications | D · Live activity | MVP | Med |
| feature | Dashboard Persistence | F · Sessions | Post | Med |
| feature | Session Search | F · Sessions | Idea | Med |
| feature | Session Resume (stale `SessionViewer` ref — reframe) | F · Sessions | — | Med |
| feature | Session Usage Analytics | F · Sessions | — | Med |
| feature | Auto-Update (electron-updater) | G · Ship | Fut | Med |
| feature | Packaging & Distribution (sign/notarize/DMG) | G · Ship | Fut | Med |
| feature | Dashboard `+` button (new dashboard: discussion / user agent) | — | MVP | Med |
| feature | Right action sidebar (edit file/table) | — | Post | Med |
| feature | Launch page refactor | — | MVP | Med |
| feature | Agent Templates | — | Idea | Low |
| feature | Optimization Insights | — | Idea | High |
| feature | Stop Thinking Button (Chat) | — | — | Low |
| feature | Playwright E2E / UI verification | — | Idea | Med |
| chore | `_ui/` Radix follow-ups (Tabs→Radix, EditField→Select, ResizeHandle→Separator) | E follow-up | — | Low–Med |

**Done (2026-06-01):** tabbed workspace · app-shell restructure · `_ui/` Radix consolidation + a11y pass · code-quality agent suite · dead-code sweeps. See the "Done" sections of `chores.md` / `feature-requests.md`.
