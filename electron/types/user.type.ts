import type { Candidate } from "./onboarding.types";

/**
 * A scanned project repo (root-level `.claude`, scope = project) enriched with a
 * one-line LLM label produced by the repo-scan runner seam. Reuses the FS scan
 * `Candidate` shape and attaches the generated `label`.
 */
export type RepoCandidate = Candidate & {
  /** Short LLM-generated description of the repo, or null when unavailable. */
  label: string | null;
};
