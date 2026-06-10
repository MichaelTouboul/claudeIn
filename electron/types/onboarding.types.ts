export type Candidate = {
  /** Repo root containing the `.claude` dir (the scan root for a root-level `.claude`). */
  path: string;
  scope: "user" | "project";
  hasClaude: true;
  /** Detected plugin names, e.g. `['babysitter']` when `.a5c` is present. */
  plugins: string[];
};

/** A persisted per-scope narrative understanding of a `.claude` setup. */
export type ScopeProfile = {
  /** Scope root the profile describes (the candidate's `path`). */
  scopePath: string;
  scope: "user" | "project";
  /** The LLM-generated narrative markdown profile of the scope's `.claude`. */
  profileMd: string;
  /** ISO timestamp of when the profile was generated. */
  generatedAt: string;
};
