# Design — `/am-feature`: guided feature workflow with documented decision gates

**Date:** 2026-05-29
**Status:** Approved design — ready for implementation planning
**Project:** claude-agent-manager (Electron + React 18 + TS + Tailwind 4 + zustand)

## Problem

The existing frontend writer (`am-frontend`) produces poor work despite extensive
inline conventions and a 2131-line `react-dev` skill. Root cause is not missing
guidance — it is **dilution**: the decision frameworks that matter (e.g. where state
lives) are buried under ~1900 lines of generic React-101 content that the model
already knows, and that content sometimes contradicts the project rules.

Separately, the project wants a richer, more deliberate way to build features than
the current `am-dev` sub-agent orchestrator allows — one with **real, interactive
work phases** and **decision points whose criteria the user authors**, and where
**every decision taken is recorded** for the feature.

## Goal

A `feature-dev`-style workflow tailored to this codebase that:

- runs as an interactive, multi-phase command in the main thread,
- consults **user-authored playbooks** (input) at named decision gates,
- records each decision in a per-feature **decision journal** (output),
- reuses the existing writer sub-agents instead of duplicating them,
- and, as part of the same work, removes the dilution that causes the current
  bad output.

## Decisions captured during brainstorming

1. "Decisions I document myself" = **both** playbooks (input criteria) **and** a
   decision journal / ADR (output recorded during the run).
2. Form = **new slash command `/am-feature`** running in the main thread (real
   interactive gates). `am-dev` is kept for quick bugs/investigation.
3. Scope = **full-stack** — delegates to `am-frontend` (src/), `am-backend`
   (electron/), `am-search`, `committer`.
4. Initial playbooks = **state-management** and **component-placement-and-splitting**.
   The set is extensible (architecture-approach and IPC-contract can be added later).
5. Gate behavior = **auto-decide when the playbook resolves the decision
   unambiguously** (log + show a one-line note), **stop and ask the user** when
   ambiguous or not covered.
6. Phase 6 review = **dedicated `am-reviewer` sub-agent** with confidence scoring.
7. Implementation approach = **prompt-orchestrated command + markdown playbooks +
   markdown journal** (no new infra beyond the command, the playbooks, and
   `am-reviewer`).

## Architecture

| Piece | Location | Role |
|-------|----------|------|
| `/am-feature` command | `.claude/commands/am-feature.md` | Orchestrator brain, main thread, interactive gates |
| Playbooks | `.claude/playbooks/*.md` | User-authored decision docs (canonical source of truth) |
| Decision journal | `docs/decisions/YYYY-MM-DD-<feature>.md` | One per run, appended live |
| `am-reviewer` | `.claude/agents/am-reviewer.md` | NEW — confidence-scored quality review (Phase 6) |
| `am-search` / `am-frontend` / `am-backend` / `committer` | existing | Reused unchanged |

No new infrastructure: the command is a markdown file, playbooks and journal are
markdown, `am-reviewer` is a standard sub-agent.

## Phases of `/am-feature`

1. **Discovery** — parse the request, classify scope (frontend / backend /
   cross-cutting), **create the decision-journal file**, confirm understanding.
2. **Exploration** — spawn `am-search` agents in parallel (frontend, backend, IPC
   trace as relevant), read the key files they return.
3. **Clarifying questions** — resolve ambiguities; wait for answers (do not skip).
4. **Architecture + decision gates** — design the approach; fire the gates
   (state-management, placement) against their playbooks; auto-decide or ask;
   **log every decision to the journal**; present the plan and wait for approval.
5. **Implementation** — after approval, route to `am-frontend` / `am-backend`
   (backend-first for cross-cutting: IPC → preload → `env.d.ts` → component).
   Gates can re-fire here (e.g. new state introduced mid-build).
6. **Quality review** — spawn `am-reviewer` (1–3 in parallel with distinct focuses:
   bugs/correctness, conventions+playbook-adherence, simplicity/DRY) + run
   `npx electron-vite build` and lint (0-warning policy). Present findings; ask
   fix-now / fix-later / proceed.
7. **Summary + commit** — finalize the journal (decisions + files changed +
   follow-ups), delegate the commit to `committer`, summarize.

## Gate mechanism

A **decision gate** is a named checkpoint bound to a playbook. When the workflow
reaches a decision the playbook covers:

1. Read `.claude/playbooks/<gate>.md`.
2. Apply its decision tree to the current context.
3. **Unambiguous** → record `{decision, rationale, rule applied, decided-by: auto}`
   to the journal, display a one-line note, proceed.
4. **Ambiguous or not covered** → STOP, show the playbook's options + recommendation,
   ask the user, then record `{… decided-by: user}`.

Gates fire in Phase 4 (design) and may re-fire in Phase 5 (implementation).

## Playbook format (authored by the user)

```markdown
---
name: state-management
gate: "Where does this state live?"
triggers: adding/lifting state, new shared value, prop passed >1 level
---
## Decision
<the question>
## Criteria (decision tree)
Q1 only one direct child consumes it?      -> props
Q2 one subtree, multiple consumers?        -> context (split data/actions)
Q3 independent subtrees / app-global?      -> zustand (useAppStore)
## When to ASK the user (do not auto-decide)
- <ambiguity conditions>
## Anti-patterns
- <smells + fixes>
```

Initial playbooks are **extracted** from existing content (the `react-dev` skill's
"Choosing Where State Lives" section and `am-frontend`'s folder/splitting rules),
not written from scratch.

## Decision journal format (output)

```markdown
# Feature: <name>  ·  am-feature  ·  2026-05-29
## Request / context
## Decisions
### D1 — State for X -> context (data/actions split)
- Gate: state-management · Rule: Q2 · Decided by: auto
### D2 — Place ChatToolbar -> sibling of AgentChat
- Gate: component-placement · Rule: used by 1 parent · Decided by: user
## Files changed
## Open follow-ups
```

## `am-reviewer` sub-agent (new)

- **Model:** sonnet. **Tools:** Read, Grep, Glob, `Bash(git diff *)`, `Bash(git status)`;
  no Write/Edit/Agent.
- **Preloads** (via `skills:`/context) the playbooks and references `am-frontend`
  conventions + `CLAUDE.md`.
- **Scope:** unstaged `git diff` by default; caller may pass explicit files.
- **Confidence scoring 0–100; reports only issues ≥ 80**, grouped Critical / Important.
- **Decision-adherence check:** reads the run's decision journal; any code that
  contradicts a logged decision or a playbook rule is reported as a high-confidence
  issue with the journal/playbook reference.
- **Output:** per issue — description, confidence, `file:line`, the violated
  rule/playbook reference, and a concrete fix. If nothing ≥ 80, confirm the code
  meets standards.

## Relationship to existing pieces & cleanup (serves this work)

- `am-dev`: unchanged, remains the lightweight path for quick bugs/investigation.
- `am-frontend` / `am-backend` / `am-search` / `committer`: reused as-is.
- **Single source of truth:** the state-management and placement decision trees move
  **into the playbooks** (canonical); `am-frontend` references them instead of
  duplicating.
- **Fix the dilution (original bug):** trim the `react-dev` skill from 2131 → ~250
  lines, removing the generic React-101 content (and with it the contradictions:
  `import React`, `PropTypes`, `.jsx`).
- Remove the stray 0-byte `.claude/am-frontend` file.

## Out of scope (YAGNI)

- No `am-decider` sub-agent (gate logic stays inline in the command — a sub-agent
  cannot ask the user mid-run, so escalation would bubble up anyway).
- No background Workflow/babysitter engine (kills interactive gates).
- architecture-approach and IPC-contract playbooks are deferred until needed.

## Open questions / follow-ups

- Number of parallel `am-reviewer` instances in Phase 6 (1 vs 3) — decide during
  implementation based on how noisy a single reviewer is.
- Whether `am-dev` should eventually delegate to `/am-feature` for anything it
  classifies as a "feature" — revisit once `/am-feature` has real usage.
