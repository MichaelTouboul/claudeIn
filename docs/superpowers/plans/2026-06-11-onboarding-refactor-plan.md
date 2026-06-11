# Onboarding Refactor — Implementation Plan

Spec: `docs/superpowers/specs/2026-06-11-onboarding-refactor-design.md`.

Phases are sequential (each depends on the previous). Each phase runs in an
isolated worktree via feature-dev (strict TDD, gate-verified), then merges to
main and pushes. Gate = `npm run lint` (0 errors/warnings) + `npm run typecheck`
+ `npx electron-vite build` + tests. Hard rules: no `any`, 300-line file limit,
`@/` imports, enum+behavior-map (no fallback chains), named exports only.

## P1 — Data + backend (no UI)

1. **DB** (`electron/services/db.ts`): add `user_profile` (singleton id=1) and
   `favorite_repos` tables in the `CREATE TABLE IF NOT EXISTS` block; additive,
   idempotent. Keep `scope_profiles`.
2. **Types** (`electron/types/`): `UserProfile` interface (+ `Capabilities`),
   `FavoriteRepo` interface, `RepoCandidate` (scan + LLM label). Export via barrel.
3. **`user-profile.service.ts`**: `getUserProfile / saveUserProfile /
   updateUserProfile / completeOnboarding / resetUser`. Unit tests.
4. **`user-search.service.ts`**: `locateClaudeUser()` (deterministic: `$HOME/.claude`
   + fallbacks → path | null); `fillUserProfile(claudePath)` (counts via
   `unionAgents/unionSkills/getMcp` + narrative via `setProfileRunner` seam). Tests
   stub the runner — no real `claude`/network.
5. **`favorite-repos.service.ts`**: `list / add / remove`. Tests.
6. **`repos.service`** (or extend `onboarding.service`): `scanRepos()` = `scanCandidates`
   filtered to scope=project + per-repo LLM label (via seam).
7. **IPC**: register `user:*`, `repos:scan`, `favoriteRepos:*`, `dialog:open-directory`.
   Declare every method in `src/env.d.ts`. Thin adapters only.

Acceptance: services unit-tested with stubbed runner; gate green; renderer untouched.

## P2 — Router shell

1. `useAppStore`: add `currentPage` (`as const` enum) + `navigate`. Boot decision
   from `user:getProfile` (`onboarding_completed_at`).
2. Extract today's `Header + Workspace + Footer` into `DashboardPage`.
3. `App.tsx` renders one of `OnboardingPage` (stub) / `HomePage` (stub) /
   `DashboardPage` by `currentPage`. "⌂ Accueil" control returns home from Dashboard.
4. Remove the `localStorage` onboarding flag path; `OnboardingGate` no longer
   mounted (old wizard kept until P4 but not gating).

Acceptance: app boots to home when profile complete, else onboarding stub; dashboard
reachable and identical to today; gate green.

## P3 — Home page (layout A)

1. `HomePage` + sub-components (<300 lines each): greeting + profile link;
   favorite-repos grid (open → `navigate('dashboard')` + select project) + "+ add"
   (folder picker → `favoriteRepos:add`); Actions row ("Agent scope-user", "Task"
   disabled).
2. `UserProfileView` (read + inline edit) wired to `user:getProfile/saveProfile`.
3. Hooks: `useUserProfile`, `useFavoriteRepos`.

Acceptance: home shows real favorites + profile; add/remove favorite works; open
navigates to dashboard; gate green.

## P4 — Onboarding flow

1. `OnboardingPage` state machine (`OnbStep` enum + behavior map): Welcome →
   ConsentUser → SearchUser → ProfileReview → ConsentRepos → ReposPick → Done.
   Each screen its own component (<300 lines).
2. Wire to P1 IPC; reuse `UserProfileView` at ProfileReview.
3. `Done` → `user:complete` → `navigate('home')`.
4. Remove old `OnboardingWizard/OnboardingGate/ScanStep/IngestStep/useOnboarding`
   + their tests. Keep `ProfileView` (narrative).

Acceptance: full first-run flow works end-to-end (runner stubbed in tests); no skip;
old wizard removed; gate green.

## P5 — Dev reset + polish

1. Dev-only "Reset onboarding (dev)" control (`import.meta.env.DEV`) → `user:reset`
   → `navigate('onboarding')`.
2. Polish, empty states, a11y pass on new interactive UI.

Acceptance: reset re-triggers onboarding in dev; gate green.
