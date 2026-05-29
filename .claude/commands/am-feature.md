---
description: Guided feature development for the Agent Manager app — interactive phases, playbook-driven decision gates, recorded decision journal.
argument-hint: Optional feature description
---

# /am-feature — Guided feature development (Agent Manager)

You orchestrate feature development in the main thread. You understand and decide;
you delegate all code writing to sub-agents. You consult user-authored playbooks at
decision gates and record every decision in a journal.

Initial request: $ARGUMENTS

## Core principles
- **Understand before acting.** Read existing patterns first.
- **Playbook-driven gates.** At a decision a playbook covers, apply it: decide if
  unambiguous, ask the user if not. Record the outcome either way.
- **Delegate code.** Never write/edit code yourself — route to the sub-agents below.
- **Track progress** with TodoWrite.

## Sub-agents
| Agent | Use for |
|-------|---------|
| `am-search` | Locate files, trace IPC, map dependencies |
| `am-frontend` | Write renderer code in `src/` (React/hooks/CSS) |
| `am-backend` | Write main-process code in `electron/` (services, IPC, preload, `src/env.d.ts`) |
| `am-reviewer` | Phase-6 confidence-scored review |
| `committer` | All commits |

## Playbooks (decision gates)
Read from `.claude/playbooks/`:
- `state-management.md` — props vs context vs zustand
- `component-placement.md` — component folder + file splitting

### Gate procedure
When you reach a decision a playbook covers:
1. Read the playbook.
2. Apply its decision tree to the current context.
3. If it resolves unambiguously → record to the journal `{decision, choice, gate, rule, decided-by: auto}`, print one line, proceed.
4. If ambiguous or matches a "When to ASK" condition → STOP, show the playbook options + your recommendation, ask the user, then record `{… decided-by: user}`.

## Phase 1 — Discovery
1. Create a TodoWrite list for all phases.
2. Classify scope: frontend / backend / cross-cutting.
3. Create the journal file `docs/decisions/<today>-<feature-slug>.md` with the
   "Request / context" section filled. (Use the date provided to you; do not invent one.)
4. If the request is unclear, ask what problem, what behavior, what constraints.
5. Summarize understanding; confirm with the user.

## Phase 2 — Exploration
1. Launch 2–3 `am-search` agents IN PARALLEL on different aspects (similar feature,
   architecture/flow, IPC trace as relevant). Each returns 5–10 key files.
2. Read the key files yourself.
3. Present a summary of findings and the patterns discovered.

## Phase 3 — Clarifying questions
1. List every ambiguity: edge cases, error handling, integration points, scope
   boundaries, backward compatibility.
2. Ask them as an organized list. WAIT for answers. Do not skip this phase.

## Phase 4 — Architecture + decision gates
1. Design the approach, reusing established patterns from Phase 2.
2. Run the gate procedure for each decision the playbooks cover (state, placement).
3. Present: the plan (files + order), the decisions taken (with journal references),
   risks. For cross-cutting work order backend before frontend.
4. WAIT for user approval before implementing.

## Phase 5 — Implementation (after approval)
1. Route each change:
   - `electron/services/*`, `electron/ipc/*`, `electron/preload.ts`, `src/env.d.ts` → `am-backend`
   - `src/components/*`, `src/hooks/*`, `src/services/*` → `am-frontend`
2. Cross-cutting order: `am-backend` creates service + IPC handler + preload + `env.d.ts` type, THEN `am-frontend` creates/wires the component.
3. If a new decision surfaces mid-build (e.g. new state), re-run the gate procedure and append to the journal.

## Phase 6 — Quality review
1. Launch `am-reviewer` (1–3 in parallel with distinct focuses: bugs/correctness,
   conventions+playbook-adherence, simplicity/DRY). Pass it the journal path so it
   can check decision adherence.
2. Run the build: `npx electron-vite build` (must pass) and lint (0 errors AND 0 warnings).
3. Present consolidated findings; ask: fix now / fix later / proceed.
4. Address per the user's choice (route fixes back to the writer agents).

## Phase 7 — Summary + commit
1. Finalize the journal: complete "Files changed" and "Open follow-ups".
2. Delegate the commit to `committer` with a conventional message (NO signature).
3. Summarize: what was built, key decisions (link the journal), files modified, next steps.
