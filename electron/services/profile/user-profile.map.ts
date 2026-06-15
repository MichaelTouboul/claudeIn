import type { Capabilities, UserProfile } from "../../types/user.interface";

const EMPTY_CAPABILITIES: Capabilities = {
  agents: { count: 0, names: [] },
  skills: 0,
  mcp: 0,
  hooks: 0,
};

/** A blank profile — used as the merge base before any scan/onboarding runs. */
export function defaultUserProfile(): UserProfile {
  return {
    claudeUserPath: null,
    name: null,
    role: null,
    plugins: [],
    capabilities: EMPTY_CAPABILITIES,
    domains: [],
    onboardingCompletedAt: null,
    generatedAt: null,
    updatedAt: null,
  };
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || value.length === 0) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function asText(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/** Map a `user_profile` DB row to the typed `UserProfile`, deserializing JSON. */
export function rowToUserProfile(row: Record<string, unknown>): UserProfile {
  return {
    claudeUserPath: asText(row.claude_user_path),
    name: asText(row.name),
    role: asText(row.role),
    plugins: parseJson<string[]>(row.plugins, []),
    capabilities: parseJson<Capabilities>(row.capabilities, defaultUserProfile().capabilities),
    domains: parseJson<string[]>(row.domains, []),
    onboardingCompletedAt: asText(row.onboarding_completed_at),
    generatedAt: asText(row.generated_at),
    updatedAt: asText(row.updated_at),
  };
}

/** Positional bind values for the singleton upsert, in column order (id = 1). */
export function userProfileBindValues(profile: UserProfile): unknown[] {
  return [
    profile.claudeUserPath,
    profile.name,
    profile.role,
    JSON.stringify(profile.plugins),
    JSON.stringify(profile.capabilities),
    JSON.stringify(profile.domains),
    profile.onboardingCompletedAt,
    profile.generatedAt,
    profile.updatedAt,
  ];
}
