export type Candidate = {
  /** Repo root containing the `.claude` dir (the scan root for a root-level `.claude`). */
  path: string;
  scope: "user" | "project";
  hasClaude: true;
  /** Detected plugin names, e.g. `['babysitter']` when `.a5c` is present. */
  plugins: string[];
};
