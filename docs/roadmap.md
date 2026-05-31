# Roadmap & Product Strategy

> Reframed 2026-05-31. This app is a **Claude Code companion / experience optimizer**, not an "agent manager". See `CLAUDE.md` → "What This Is" for the five pillars.

## Competitive reality (why the strategy is what it is)

In **April 2026 Anthropic shipped a redesigned first-party Claude Code Desktop App** that already does, for free: multi-session sidebar, large-changeset diff viewer, preview pane (HTML/PDF/local servers), integrated terminal + file editor, MCP parity, Side Chat branching, and **Routines** (scheduled/triggered runs).

**Implication:** "nicer chat + diffs + multi-session + MCP" is now table-stakes given away by Anthropic. We must **not** bet the product on it. Our base UI exists only as the *vehicle* that carries the differentiators.

The two genuinely **unowned lanes** (and our stated differentiators):
1. **Automatic context optimization with a UI** — `/compact` is invisible and unsteerable; the best file-selection tech (Aider repo-map, AiderDesk embeddings) is Aider-only and unvisualized. Nobody offers a live "context budget" that shows what's in the window, why, and auto-curates it for Claude Code. **Clearest open lane.**
2. **In-app Jira/Linear ticket → driven session** — Cyrus does ticket→agent but headless (no UI pairing the live ticket with the agent). Vibe Kanban uses its own task system, not your real board. Unowned.

## Sequencing (decided)

**Phase 0 (base) → Phase 1 (Context Optimizer) → Phase 2 (Jira-driven).** The base is deliberately lean; the moat is Phase 1.

### Phase 0 — MVP: companion base *(lean, mostly reuse)*

The vehicle + ecosystem visualization (the one area where the base already beats Anthropic slightly).

- Rich chat: markdown, syntax-highlighted code, **inline image + paste**, copy/paste, persistent scrollback. *(reuse: session viewer + chat spawn)*
- **Ecosystem visualization**: `CLAUDE.md`/memory editor, sub-agents + skills browser. *(reuse: MemoryManager, AgentTree)*
- **Multi-project parallel sessions (cross-repo)** — CHEAP: each session is an independent `claude` process with its own cwd, no shared state, no git collision. Just manage N processes + N views + a switcher/dashboard. *(reuse: project scanning + SQLite event store)*
- **Live token/context gauge** — sets up Phase 1. *(reuse: event store)*

**Do NOT build** (Anthropic gives free, or wrong scope): worktrees / same-repo concurrent agents, checkpoints, preview pane, integrated terminal, voice, our own kanban.

> Distinction that matters: **cross-repo** parallel sessions = trivial (separate processes). **Same-repo** concurrent agents = hard (needs worktrees) — deferred/skip; not our need.

### Phase 1 — Context Optimizer *(the moat)*

Live "Context Budget" panel: what's in the window, why, where the waste is, **+ automatic curation**.
- Borrow: **Aider repo-map** (tree-sitter + PageRank) for file selection · **Repomix `--compress`** for compression · Claude server-side compaction.

### Phase 2 — Jira-driven dev

Real Jira/Linear ticket pane in-app → session pre-loaded with **curated** ticket context (consumes Phase 1 to avoid Atlassian-MCP token bloat) → write status/comments back.
- Blueprint: Cyrus pipeline, but add the side-by-side ticket↔agent UI it lacks.

## Repos to study

| Repo | Study | For phase |
|---|---|---|
| `Aider-AI/aider` | repo-map: tree-sitter symbols + NetworkX PageRank ranking | 1 |
| `yamadashy/repomix` | `--compress` (tree-sitter key-element extraction) + per-file token counts | 1 |
| `cline/cline` | `ContextManager` (trims history to fit window) + shadow-git checkpoints | 1 |
| `winfunc/opcode` (ex-Claudia) | session/MCP UI, usage analytics, agent mgmt — parity checklist | 0 |
| `hotovo/aider-desk` | LanceDB vector context selector + Projects→Tasks dashboard | 1 |
| `cyrusagents/cyrus` | Linear/GitHub webhook → worktree → session → stream-back pipeline | 2 |

## Landscape (reference)

GUI desktop: opcode/Claudia (~20k★ OSS), Nimbalyst (ex-Crystal), Conductor, Sculptor, cmux (~18k★).
Web/mobile: claudecodeui (~10k★), claude-code-webui.
Ticket→agent: Cyrus (headless).
Context tech: Aider, Repomix, Cline.
