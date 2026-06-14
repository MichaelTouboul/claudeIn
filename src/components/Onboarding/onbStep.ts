/**
 * The onboarding flow's finite steps. Single source of truth for which screen
 * the `OnboardingPage` state machine renders. Modeled as an `as const` enum so a
 * step→behavior `Record` map can drive the view (no fallback chains — per
 * CLAUDE.md). The order also defines the linear progression of the flow.
 */
export const OnbStep = {
  Welcome: "welcome",
  ConsentUser: "consent-user",
  SearchUser: "search-user",
  ProfileReview: "profile-review",
  ConsentRepos: "consent-repos",
  ReposPick: "repos-pick",
  Done: "done",
} as const;
export type OnbStep = (typeof OnbStep)[keyof typeof OnbStep];
