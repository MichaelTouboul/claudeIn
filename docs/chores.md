# Chores

Maintenance / cleanup tasks — not features, not bugs. Companion to `docs/feature-requests.md` and `docs/bugs.md`.

> Effort scale: **Low** (~half day) · **Medium** (~1 day) · **High** (multi-day).

---

## Batch captured 2026-06-01

> Done (2026-06-01): the code-quality agent suite — `state-home-finder`, `ui-promotion-finder`, `component-structure-cleaner`, the `aria-requirements` skill, and `accessibility-auditor` — now live in `.claude/agents/` + `.claude/skills/`. Agent frontmatter format reference: [[reference-agent-frontmatter-format]] (saved in memory).

### Restructure components into a clear app shell
**Effort:** Medium–High · **Status:** In progress (spec + plan done; executing in a worktree)
Reshape the top-level component tree into an explicit shell. Naming decided: `Workspace` (middle) / `DashboardArea` (right) / `Dashboard` (top pane) / `Console` (bottom).

```
App
├── Header
├── Workspace
│   ├── Sidebar          (left — full height)
│   └── DashboardArea    (right)
│       ├── WorkspaceBar (project tabs)
│       ├── Dashboard    (internal tabs + bodies)
│       └── Console      (terminal panel)
└── Footer
```

Spec: `docs/superpowers/specs/2026-06-01-app-shell-restructure-design.md`. Pairs with the sidebar-full-height + window-framing bugs and the Footer feature.
