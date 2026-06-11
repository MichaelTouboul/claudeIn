# Onboarding Refactor — Design

**Date:** 2026-06-11
**Status:** Approved (brainstorming)

## Goal

Turn the current modal onboarding wizard into a real first-run experience and
introduce a top-level **3-page app**: **Onboarding → Home → Dashboard**. Build a
fixed-schema **user profile** filled by an LLM and persisted in DB, plus a
**favorite-repos** concept surfaced on a real **Home page**. The app must never
re-show onboarding once completed; a dev-only reset re-triggers it.

Much business logic already exists and is **reused**, not rewritten:
- `onboarding.service.scanCandidates(root)` — bounded FS scan for `.claude` dirs + plugin detection (`.a5c` → babysitter).
- `profile.service` — agentic `claude --print` runner via the `setProfileRunner` seam (subscription auth, no API-key migration).
- `agents.union` / `skills.union` / `mcp.mirror` — user-scope capability sources (for counts).
- Chrome-style tabbed Workspace — becomes the internals of the Dashboard page, unchanged.

## Navigation model (decided: top-level router)

`useAppStore` gains `currentPage: 'onboarding' | 'home' | 'dashboard'` + `navigate(page)`.
Home is a **page of its own**, not a tab. Multi-project tabs live **inside** the
Dashboard page.

- `App.tsx` becomes a router: chooses the page at boot and renders `<OnboardingPage>` / `<HomePage>` / `<DashboardPage>`.
- `DashboardPage` = today's `Header + Workspace + Footer`, extracted as-is.
- Boot decision: `user_profile.onboarding_completed_at != null` → `home`, else → `onboarding`.
- Home → "open" on a favorite repo → `navigate('dashboard')` + select that project. A "⌂ Accueil" control in the Dashboard header returns home.

Model finite `currentPage` / `OnbStep` state as an `as const` enum + value→behavior
`Record` map — **no fallback chains** (per CLAUDE.md).

## Data model (new DB tables)

```
user_profile  (singleton, id = 1)
  claude_user_path TEXT,
  name TEXT, role TEXT,
  plugins JSON,                -- detected plugin names
  capabilities JSON,           -- { agents: {count, names}, skills: count, mcp: count, hooks: count }
  summary TEXT,                -- LLM narrative
  domains JSON,                -- LLM tags
  workflow TEXT,               -- LLM-inferred preferred workflow
  onboarding_completed_at TEXT,
  generated_at TEXT, updated_at TEXT

favorite_repos
  path TEXT PRIMARY KEY,
  label TEXT,
  added_at TEXT
```

- `scope_profiles` (narrative) **stays** — orthogonal.
- DB is the single source of truth for "onboarding done". The `localStorage`
  flag (`claudein:onboardingCompleted`) is removed.
- Deterministic fields (paths, counts, plugins) vs LLM fields (summary, domains,
  workflow). Deterministic fields are read-only / re-scan; LLM fields are editable.

## Backend — services & IPC

- **`user-search.service.ts`**
  - `locateClaudeUser()` — deterministic: `$HOME/.claude`, then a small fallback
    list; returns `null` when not found (UI then asks the user to point to it).
  - `fillUserProfile(claudePath)` — reuses `unionAgents/unionSkills/getMcp` for
    counts + `claude --print` (via `setProfileRunner` seam) for summary/domains/workflow.
- **`user-profile.service.ts`** — `getUserProfile / saveUserProfile / updateUserProfile / completeOnboarding / resetUser`.
- **`favorite-repos.service.ts`** — `list / add / remove`.
- **IPC** (`domain:action`): `user:locate`, `user:buildProfile`, `user:getProfile`,
  `user:saveProfile`, `user:complete`, `user:reset`; `repos:scan` (reuses
  `scanCandidates` filtered to scope=project + LLM label), `favoriteRepos:list/add/remove`;
  `dialog:open-directory` (new — `dialog.ipc` only has `open-file` today).
- All declared in `src/env.d.ts`. New shared types in `electron/types/` with the
  barrel; file naming by kind (`*.type.ts` / `*.interface.ts`).

## Onboarding flow (no skip, consent-gated)

`OnboardingPage` is a state machine (`OnbStep` enum + step→behavior `Record`):

1. **Welcome** — single "Commencer" button.
2. **ConsentUser** — explains the search; "Autoriser" (no skip).
3. **SearchUser** — `locate` + `buildProfile`, progress screen. If `locate` fails →
   prompt the user to point to `.claude` (folder picker).
4. **ProfileReview** — shows the filled profile, **editable**; "Confirmer".
5. **ConsentRepos** — "Autoriser" the repo search.
6. **ReposPick** — scanned repos (+ LLM labels), checkboxes for favorites,
   "Ajouter un dossier" (folder picker).
7. **Done** — "Tout est prêt" → `completeOnboarding()` → `navigate('home')`.

## User profile UI

Fixed schema: **Identity / Environment / Capabilities / Working style**. A
`UserProfileView` (read + inline edit) is reused at step 4 **and** from Home.

## Home page (layout: stacked sections)

`HomePage`: greeting + profile link at top; **Favorite repos** grid (one card per
repo → "open" goes to Dashboard) + a "+ add" card; an Actions row: "Agent
scope-user" (opens a user-scope chat) + "Task" (disabled for now). Split into
sub-components to stay under the 300-line limit.

## Dev reset

`user:reset` clears `user_profile` + `favorite_repos`. Exposed **only** when
`import.meta.env.DEV` — a discreet "Reset onboarding (dev)" control in the
Footer/Header.

## Migration

The current `OnboardingWizard` / `OnboardingGate` / `ScanStep` / `IngestStep` UI is
**replaced** by the new flow (the FS scan and the `--print` seam are reused; the
wizard UI is removed). `ProfileView` (narrative scope profile) stays.

## Build sequencing (testable phases, commit between each)

- **P1** — DB tables + types + backend services + IPC + tests (no UI).
- **P2** — Router shell (`App` → 3 pages, extract `DashboardPage`), boot decision.
- **P3** — Home page (real favorites/profile data).
- **P4** — Full onboarding flow + removal of the old wizard.
- **P5** — Dev reset + polish.

Each phase: gate (lint/typecheck/build/tests) green → merge to main → push.
