# Chores

Maintenance / cleanup tasks — not features, not bugs. Companion to `docs/feature-requests.md` and `docs/bugs.md`.

> Effort scale: **Low** (~half day) · **Medium** (~1 day) · **High** (multi-day).

---

## Batch captured 2026-06-01

> **Agent frontmatter format (applies to every "create agent" chore below):** new agent definitions MUST follow the format documented at
> https://www.exploreclaudecode.com/#.claude/agents/AGENTS.md and
> https://www.exploreclaudecode.com/#.claude/agents/my-agent/my-agent.md
> (supports both `.claude/agents/<name>.md` and `.claude/agents/<name>/<name>.md` layouts).

### Agent: state-home finder (zustand / context / props)
**Effort:** Medium · **Status:** Open
Create an agent that scans the renderer and flags **state-management candidates** — pieces of state that should move between `useState`/props, React context, and zustand — per the decision tree in `src/CLAUDE.md` (narrowest scope first; context = global+stable only; zustand selector-based). Reports candidates with the recommended home + why.

### Agent: `_ui/` promotion finder
**Effort:** Medium · **Status:** Open
Create an agent that finds **components that should be promoted to `_ui/`** primitives — generic, domain-free, reused by 2+ parents — and conversely flags `_ui/` components that secretly carry domain knowledge. Follows the promotion rules in `src/CLAUDE.md`.

### Agent: folder/component structure cleaner
**Effort:** Medium · **Status:** Open
Create an agent that audits and fixes the **component folder structure** so the folder hierarchy mirrors the component hierarchy (single-owner child nested in its parent; promote on 2+ parents; only `_ui/` gets barrels; PascalCase one-folder-per-component). Proposes moves, then applies them gate-verified.

### Skill + agent: ARIA / accessibility requirements
**Effort:** Medium · **Status:** Open
First create a **skill** that encodes the project's ARIA / a11y requirements (roles, labels, keyboard nav, no nested interactive elements — the kind of `jsx-a11y` rules the lint already enforces). Then create an **agent that uses that skill** to audit and fix accessibility across components.

### Restructure components into a clear app shell
**Effort:** Medium–High · **Status:** Open
Reshape the top-level component tree into an explicit shell:

```
App  (wrapper of the whole app)
├── Header
├── MainContent   (find a fitting name — e.g. Workspace / Shell / Body)
│   ├── Sidebar       (left — full height, down to the bottom)
│   └── Dashboard     (right)
│       ├── Dashboard (top — the dashboard surface itself)
│       └── Console   (bottom — the terminal/console panel)
└── Footer
```

Open naming decision: the middle "MainContent" wrapper needs a better name. Pairs with the sidebar-full-height and window-framing bugs, and the new Footer feature.
