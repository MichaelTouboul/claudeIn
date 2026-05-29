# /am-feature Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive, feature-dev-style `/am-feature` command for the Agent Manager app, driven by user-authored decision playbooks and producing a per-feature decision journal, reusing the existing writer sub-agents and adding a confidence-scored reviewer.

**Architecture:** A prompt-orchestrated slash command (`.claude/commands/am-feature.md`) runs the 7 phases in the main thread. At named decision gates it reads markdown playbooks in `.claude/playbooks/` and either auto-decides (logging to a journal under `docs/decisions/`) or stops to ask the user. Code is written by the existing `am-frontend`/`am-backend`/`am-search`/`committer` sub-agents; a new `am-reviewer` sub-agent runs the Phase-6 review.

**Tech Stack:** Claude Code slash commands + sub-agents (markdown + YAML frontmatter), Electron + React 18 + TypeScript + Tailwind 4 + zustand (the target codebase). No runtime code is added — all artifacts are markdown.

**Note on "tests":** these artifacts are markdown prompt files, not executable code. "Verify" steps are structural checks (`grep`/inspection) plus, for the command, one end-to-end smoke run on a trivial feature. There is no unit-test framework involved. Commits are conventional and carry **no signature/trailer** (project rule).

**Branch:** `feat/am-feature-workflow` (already created; the design spec is already committed there).

---

## File Structure

| File | Status | Responsibility |
|------|--------|----------------|
| `.claude/playbooks/state-management.md` | Create | Decision doc: props vs context vs zustand |
| `.claude/playbooks/component-placement.md` | Create | Decision doc: component location + 300-line file splitting |
| `.claude/agents/am-reviewer.md` | Create | Confidence-scored review sub-agent (Phase 6) |
| `.claude/commands/am-feature.md` | Create | The 7-phase orchestrating command |
| `docs/decisions/README.md` | Create | Explains the journal dir + keeps it in git |
| `.claude/skills/react-dev/SKILL.md` | Modify | Trim 2131 → ~250 lines (remove generic React-101) |
| `.claude/agents/am-frontend.md` | Modify | Point state/placement sections at the playbooks |
| `.claude/am-frontend` | Delete | Stray 0-byte file |

---

## Task 1: state-management playbook

**Files:**
- Create: `.claude/playbooks/state-management.md`

- [ ] **Step 1: Write the playbook file**

Content (extracted/condensed from the existing `react-dev` skill's "Choosing Where State Lives" section — single source of truth from now on):

```markdown
---
name: state-management
gate: "Where should this piece of state live?"
triggers:
  - adding a new useState/useReducer
  - lifting state up
  - a value is needed by more than one component
  - a prop is being passed through more than one level
---

# Playbook — State Management

## Decision
For any piece of state being added or moved, decide its home: **props**, **React context**, or **zustand** (`src/store/useAppStore.ts`).

## Criteria (decision tree)
- **Q1 — Does only ONE direct child consume this value?**
  YES → **props** (one hop, parent → direct child).
- **Q2 — Do MULTIPLE components in a SINGLE subtree need it** (they share a common ancestor)?
  YES → **context** at that common ancestor. ALWAYS split into two contexts: one for reactive data, one for stable handlers, so handler-only consumers don't re-render on data change.
- **Q3 — Is it shared across INDEPENDENT subtrees, or truly app-global** (current user, selected project, theme, locale, connection status), or must it survive unmount?
  YES → **zustand** (`useAppStore`, selector-based: `useAppStore((s) => s.x)`).

## When to ASK the user (do NOT auto-decide)
- The value is borderline between Q2 and Q3 (one wide subtree that nearly spans the app).
- It is local UI state (e.g. a modal's `isOpen`) that someone wants in a global store — flag the smell, ask.
- More than one reasonable home exists and the choice affects >3 files.

## Anti-patterns (auto-flag, never produce)
| Smell | Fix |
|---|---|
| Same prop passed through 3+ levels with no intermediate consumer | Move to context |
| Component takes 10–20+ props just to wire one child | Most are subtree-shared → context |
| One giant context with 30+ values | Split into data + actions, or by concern |
| Everything dumped in zustand "because it's easier than props" | Move local UI state back to its owner |
| Component takes a `setX` prop only to forward it | Context or zustand |

## Reference implementation
- Context split pattern + custom `useFoo()` hooks: see `.claude/skills/react-dev/SKILL.md` ("Choosing Where State Lives").
- Store: `src/store/useAppStore.ts`.
```

- [ ] **Step 2: Verify structure**

Run: `grep -E '^(name|gate|triggers):|^## (Decision|Criteria|When to ASK|Anti-patterns)' .claude/playbooks/state-management.md`
Expected: matches for `name`, `gate`, `triggers`, and all four `##` sections.

- [ ] **Step 3: Commit**

```bash
git add .claude/playbooks/state-management.md
git commit -m "feat(am-feature): add state-management decision playbook"
```

---

## Task 2: component-placement playbook

**Files:**
- Create: `.claude/playbooks/component-placement.md`

- [ ] **Step 1: Write the playbook file**

Content (extracted/condensed from `am-frontend.md`'s "Folder Structure" + "File Size Limit"):

```markdown
---
name: component-placement
gate: "Where does this component live, and does a file need splitting?"
triggers:
  - creating a new component
  - a child component starts being used by a second parent
  - a file approaches or exceeds 300 lines
---

# Playbook — Component Placement & File Splitting

## Decision
Two linked decisions: (a) which folder a component belongs in, and (b) when/how to split a file that grows too large.

## Criteria — placement (decision tree)
- **Used by exactly ONE parent?** → nest it INSIDE that parent's folder (`AgentChat/AgentChatHeader/`). Parent–child = folder nesting.
- **Used independently by the app (not owned by one parent)?** → sibling folder at the same level under `src/components/`.
- **Now used by MORE THAN ONE parent? → promote:**
  - generic, reusable, no domain knowledge → `src/components/_ui/` (add an `index.ts` barrel — `_ui/` only).
  - otherwise → `src/components/` root, as a sibling of its former parents.
- **Max nesting: 2 levels.** Deeper → split or promote.
- Folder name = component name in **PascalCase**. A `.css` file ONLY if the component has its own styles (never an empty one).

## Criteria — file splitting (hard rule: no file > 300 lines)
When a file nears 300 lines, split, in this order of preference:
1. Extract sub-components into their own folders under `src/components/`.
2. Extract custom hooks into `src/hooks/`.
3. Extract pure helpers into a sibling file (e.g. `AgentChat/utils.ts`).
4. Extract local types into a sibling file (e.g. `AgentChat/types.ts`).

## When to ASK the user (do NOT auto-decide)
- Promotion target is ambiguous: is the component a generic `_ui/` primitive or a domain sibling?
- A split would change the public surface of a widely-imported component.
- The natural split crosses the frontend/backend boundary.

## Out of scope
- Do NOT restructure `src/hooks/`, `src/services/`, `src/store/`, `src/types/` — they stay flat. One-folder-per-component applies to `src/components/` only.

## Reference
- Full folder-structure rules and examples: `.claude/agents/am-frontend.md`.
```

- [ ] **Step 2: Verify structure**

Run: `grep -E '^(name|gate|triggers):|^## ' .claude/playbooks/component-placement.md`
Expected: frontmatter keys + `## Decision`, `## Criteria — placement`, `## Criteria — file splitting`, `## When to ASK the user`, `## Out of scope`, `## Reference`.

- [ ] **Step 3: Commit**

```bash
git add .claude/playbooks/component-placement.md
git commit -m "feat(am-feature): add component-placement decision playbook"
```

---

## Task 3: am-reviewer sub-agent

**Files:**
- Create: `.claude/agents/am-reviewer.md`

- [ ] **Step 1: Write the agent file**

```markdown
---
name: am-reviewer
description: "Confidence-scored code reviewer for the Agent Manager app. Reviews the diff against project conventions, the decision playbooks, and the run's decision journal. Reports only high-confidence issues. Never edits code. Trigger on: am-reviewer, review this diff, quality review."
model: sonnet
color: red
tools:
  - Read
  - Grep
  - Glob
  - Bash(git diff *)
  - Bash(git status)
disallowedTools:
  - Write
  - Edit
  - Agent
maxTurns: 20
skills:
  - react-dev
---

# am-reviewer — Agent Manager Code Reviewer

You review code with high precision to minimize false positives. You never modify code; you report.

## Review scope
By default review unstaged changes from `git diff`. The caller may pass explicit files or a decision-journal path to check against.

## What you check
1. **Project conventions** — the rules in `.claude/agents/am-frontend.md` and `.claude/agents/am-backend.md`, `CLAUDE.md`, the 300-line file limit, the 0-warning lint policy, design-system tokens (no hardcoded Tailwind colors), TS strictness (no `any`), unique-key rule, import order.
2. **Playbook adherence** — read `.claude/playbooks/*.md`. Code that violates a playbook rule (e.g. prop drilling 3+ levels, state placed wrong, a component in the wrong folder) is a high-confidence issue.
3. **Decision-journal adherence** — if given a journal path (`docs/decisions/*.md`), read it. Any code that contradicts a logged decision is a high-confidence issue; cite the decision id (e.g. "contradicts D2").
4. **Bugs** — logic errors, null/undefined handling, race conditions, leaks, IPC channel/type mismatches between handler, preload, and `env.d.ts`.

## Confidence scoring (0–100)
- 0–49: likely false positive or pre-existing — do not report.
- 50–74: real but minor/nitpick — do not report.
- 75–79: probably real — do not report unless it directly breaks functionality.
- **≥ 80: report it.** Confirmed real, will be hit in practice, or directly named by a project rule / playbook / journal decision.

**Only report issues with confidence ≥ 80.** Quality over quantity.

## Output
State what you reviewed (files + whether a journal was provided). Then, grouped **Critical** then **Important**, for each issue:
- one-line description + confidence score
- `file:line`
- the violated rule, playbook section, or journal decision id (or the bug explanation)
- a concrete fix

If nothing reaches 80, say so and give a one-line confirmation the diff meets standards.
```

- [ ] **Step 2: Verify frontmatter and tool restrictions**

Run: `grep -E '^(name|model|color|maxTurns):|am-frontend.md|playbooks/|docs/decisions|≥ 80|Only report issues' .claude/agents/am-reviewer.md`
Expected: name=am-reviewer, model=sonnet, and references to am-frontend.md, playbooks/, docs/decisions, and the ≥80 threshold.

- [ ] **Step 3: Verify it cannot write code**

Run: `grep -E 'disallowedTools|Write|Edit|Agent' .claude/agents/am-reviewer.md`
Expected: `Write`, `Edit`, `Agent` all appear under `disallowedTools`.

- [ ] **Step 4: Commit**

```bash
git add .claude/agents/am-reviewer.md
git commit -m "feat(am-feature): add am-reviewer confidence-scored review agent"
```

---

## Task 4: docs/decisions journal directory

**Files:**
- Create: `docs/decisions/README.md`

- [ ] **Step 1: Write the README (keeps the dir in git and documents the journal)**

```markdown
# Decision journals

One file per `/am-feature` run: `YYYY-MM-DD-<feature-slug>.md`.
Created and appended live by the `/am-feature` command. Each file records the
request, every decision taken at a gate (which playbook rule applied, decided by
auto or user), the files changed, and open follow-ups.

Format:

    # Feature: <name>  ·  am-feature  ·  YYYY-MM-DD
    ## Request / context
    ## Decisions
    ### D1 — <decision> -> <choice>
    - Gate: <playbook> · Rule: <rule> · Decided by: auto|user
    ## Files changed
    ## Open follow-ups
```

- [ ] **Step 2: Verify**

Run: `test -f docs/decisions/README.md && echo OK`
Expected: `OK`.

- [ ] **Step 3: Commit**

```bash
git add docs/decisions/README.md
git commit -m "feat(am-feature): add decision-journal directory + format doc"
```

---

## Task 5: /am-feature command

**Files:**
- Create: `.claude/commands/am-feature.md`

- [ ] **Step 1: Write the command file**

```markdown
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
```

- [ ] **Step 2: Verify all referenced paths and agents exist**

Run:
```bash
grep -oE '\.claude/playbooks/[a-z-]+\.md' .claude/commands/am-feature.md | sort -u | while read f; do test -f "$f" && echo "OK $f" || echo "MISSING $f"; done
for a in am-search am-frontend am-backend am-reviewer; do test -f ".claude/agents/$a.md" && echo "OK agent $a" || echo "MISSING agent $a"; done
```
Expected: `OK` for both playbooks and all four agents (committer is a global agent, not in this repo — that is expected).

- [ ] **Step 3: Verify phase + gate structure**

Run: `grep -E '^## Phase [1-7]|### Gate procedure' .claude/commands/am-feature.md`
Expected: Phases 1–7 all present, plus the Gate procedure heading.

- [ ] **Step 4: Commit**

```bash
git add .claude/commands/am-feature.md
git commit -m "feat(am-feature): add /am-feature orchestrating command"
```

---

## Task 6: Trim react-dev skill + point am-frontend at the playbooks

**Files:**
- Modify: `.claude/skills/react-dev/SKILL.md`
- Modify: `.claude/agents/am-frontend.md`

- [ ] **Step 1: Trim the skill — keep only project-specific, non-obvious content**

Open `.claude/skills/react-dev/SKILL.md`. DELETE the generic React-101 sections (the model already knows them, and they contradict project rules with `import React`, `PropTypes`, `.jsx`):
- "Core Concepts" (Components, JSX, Props, State)
- "React Hooks" (useState/useEffect/useContext/useReducer/useMemo/useCallback/useRef tutorials)
- "State Management Patterns" generic examples
- "Custom Hooks" generic examples
- "Performance Optimization" generic section
- "Best Practices" generic list
- "Additional Examples"

KEEP and refine:
- The frontmatter `name`/`description`.
- "Choosing Where State Lives (Source of Truth)" (the decision tree + the context data/actions split reference implementation) — this is the canonical reference the `state-management` playbook points to.

Target: ~250 lines or fewer.

- [ ] **Step 2: Verify the trim**

Run: `wc -l .claude/skills/react-dev/SKILL.md && grep -cE 'import React|PropTypes|\.jsx' .claude/skills/react-dev/SKILL.md`
Expected: line count ≤ ~300; the grep count is `0` (no generic-contradiction patterns remain).

- [ ] **Step 3: Point am-frontend's state + placement sections at the playbooks**

In `.claude/agents/am-frontend.md`, replace the bulk of the "State Management — Source of Truth" prose with a short pointer (keep one-paragraph intent), and add a pointer in the folder-structure intro:

```markdown
## State Management — Source of Truth

The canonical decision procedure (props vs context vs zustand) lives in the
`.claude/playbooks/state-management.md` playbook. Before adding or moving any state,
apply that playbook. Symptoms that force escalation (prop drilling, mega-prop
interfaces, mis-scoped global state) are listed there.
```

And near the top of "Folder Structure":

```markdown
> Placement and file-splitting decisions follow `.claude/playbooks/component-placement.md`.
> The rules below are the detailed reference that playbook points to.
```

- [ ] **Step 4: Verify the pointers**

Run: `grep -E 'playbooks/state-management\.md|playbooks/component-placement\.md' .claude/agents/am-frontend.md`
Expected: both playbook references present.

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/react-dev/SKILL.md .claude/agents/am-frontend.md
git commit -m "refactor(am-feature): trim react-dev to canonical reference, point am-frontend at playbooks"
```

---

## Task 7: Remove the stray 0-byte file + end-to-end smoke test

**Files:**
- Delete: `.claude/am-frontend`

- [ ] **Step 1: Confirm it is the stray 0-byte file, then remove it**

Run: `test -f .claude/am-frontend && ! test -s .claude/am-frontend && git rm --cached --ignore-unmatch .claude/am-frontend; rm -f .claude/am-frontend; ls .claude/am-frontend 2>&1 || echo "removed"`
Expected: `removed`. (The `-s` guard ensures we only delete it if it is empty.)

- [ ] **Step 2: Commit the cleanup**

```bash
git add -A .claude/
git commit -m "chore(am-feature): remove stray empty .claude/am-frontend file"
```

- [ ] **Step 3: End-to-end smoke test (manual, interactive)**

In a Claude Code session at the repo root, run a trivial feature through the command:

Run: `/am-feature add a small "copy to clipboard" button to the SessionViewer header`

Expected behavior to confirm:
- Phase 1 creates `docs/decisions/<today>-copy-to-clipboard*.md` with a "Request / context" section.
- Phase 2 dispatches `am-search` and reports key files (incl. `SessionViewer.tsx`).
- A placement gate fires: the button is a candidate `_ui/` primitive vs a SessionViewer child → if ambiguous, the command STOPS and asks; the decision is written to the journal.
- Phase 5 delegates the actual edit to `am-frontend` (the command itself writes no code).
- Phase 6 runs `am-reviewer` + `npx electron-vite build`.
- Phase 7 finalizes the journal and delegates the commit to `committer`.

- [ ] **Step 4: Verify the journal was produced**

Run: `ls docs/decisions/*.md | grep -v README && grep -E '^### D[0-9]+ ' docs/decisions/*copy*.md`
Expected: a journal file exists with at least one `### D1` decision entry.

---

## Self-Review

**Spec coverage:**
- Playbooks (state-management, component-placement) → Tasks 1, 2. ✓
- Decision journal dir/format → Task 4 + command Phase 1/7. ✓
- `/am-feature` 7 phases + gate mechanism → Task 5. ✓
- `am-reviewer` with confidence scoring + journal/playbook adherence → Task 3. ✓
- Reuse existing writer agents (no duplication) → Task 5 routing table. ✓
- Trim react-dev + point am-frontend at playbooks (fix dilution) → Task 6. ✓
- Remove stray 0-byte file → Task 7. ✓
- am-dev unchanged → no task touches it. ✓

**Placeholder scan:** Playbook/command/agent contents are full and concrete. The
only `<...>` tokens are inside the journal *template* (the format users/command
fill at runtime), which is intentional, not a plan gap.

**Type/name consistency:** Agent names (`am-search`, `am-frontend`, `am-backend`,
`am-reviewer`, `committer`), playbook filenames, and the `docs/decisions/` path are
used identically across Tasks 3–7 and match the spec. ✓

No gaps found.
