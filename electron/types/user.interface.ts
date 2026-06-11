/**
 * Capability counts for the user-scope `.claude` setup, sourced from the
 * existing mirror services (`getAgents` / `getSkillsMirror` / `getMcp`) plus the
 * effective settings hooks. `agents` carries both a count and the agent names so
 * the UI can list them; the others are plain counts.
 */
export interface Capabilities {
  agents: { count: number; names: string[] };
  skills: number;
  mcp: number;
  hooks: number;
}

/**
 * The fixed-schema user profile — a DB singleton (`user_profile`, id = 1).
 *
 * Deterministic fields (`claudeUserPath`, `plugins`, `capabilities`) are filled
 * by a scan and are read-only / re-scannable. LLM fields (`summary`, `domains`,
 * `workflow`) are editable. `onboardingCompletedAt` is the single source of
 * truth for "onboarding done" — non-null once the user finishes the flow.
 */
export interface UserProfile {
  /** Located `.claude` user dir (e.g. `$HOME/.claude`), or null when unknown. */
  claudeUserPath: string | null;
  name: string | null;
  role: string | null;
  /** Detected plugin names alongside the user `.claude` (e.g. `['babysitter']`). */
  plugins: string[];
  capabilities: Capabilities;
  /** LLM narrative summary of the setup. */
  summary: string | null;
  /** LLM-inferred domain tags. */
  domains: string[];
  /** LLM-inferred preferred workflow. */
  workflow: string | null;
  /** ISO timestamp set by `completeOnboarding`; null until onboarding is done. */
  onboardingCompletedAt: string | null;
  /** ISO timestamp the profile was last (re)generated, or null. */
  generatedAt: string | null;
  /** ISO timestamp the profile row was last written, or null. */
  updatedAt: string | null;
}

/** A repo the user pinned on the Home page. `path` is the primary key. */
export interface FavoriteRepo {
  path: string;
  /** Optional display label; falls back to the path's basename in the UI. */
  label: string | null;
  /** ISO timestamp the favorite was added. */
  addedAt: string;
}
