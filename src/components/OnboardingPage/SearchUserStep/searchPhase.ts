/**
 * Internal phases of the SearchUser step. Drives which UI the step renders
 * (progress vs. the locate-failed picker prompt vs. an error). `as const` enum +
 * behavior map — no fallback chains.
 */
export const SearchPhase = {
  /** `locate` then `buildUserProfile` are running. */
  Working: "working",
  /** `locate` returned null — ask the user to point to `.claude`. */
  LocateFailed: "locate-failed",
  /** A call rejected — let the user retry. */
  Error: "error",
} as const;
export type SearchPhase = (typeof SearchPhase)[keyof typeof SearchPhase];
