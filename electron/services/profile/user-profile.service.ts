import { getDb } from "../core/db";
import {
  defaultUserProfile,
  rowToUserProfile,
  userProfileBindValues,
} from "./user-profile.map";
import type { UserProfile } from "../../types/user.interface";

/**
 * User profile persistence — the `user_profile` singleton (id = 1) is the single
 * source of truth for "onboarding done" (`onboardingCompletedAt != null`). JSON
 * columns (`plugins`, `capabilities`, `domains`) are serialized on the way in and
 * parsed on the way out by `user-profile.map`. sql.js is synchronous; all calls
 * are guarded by the DB wrapper, never `.then()`/`.catch()`.
 */

const UPSERT_SQL = `INSERT INTO user_profile (
    id, claude_user_path, name, role, plugins, capabilities, summary, domains,
    workflow, onboarding_completed_at, generated_at, updated_at
  ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    claude_user_path = excluded.claude_user_path,
    name = excluded.name,
    role = excluded.role,
    plugins = excluded.plugins,
    capabilities = excluded.capabilities,
    summary = excluded.summary,
    domains = excluded.domains,
    workflow = excluded.workflow,
    onboarding_completed_at = excluded.onboarding_completed_at,
    generated_at = excluded.generated_at,
    updated_at = excluded.updated_at`;

/** The persisted profile, or `null` when onboarding has never written one. */
export function getUserProfile(): UserProfile | null {
  const row = getDb().prepare("SELECT * FROM user_profile WHERE id = 1").get();
  return row ? rowToUserProfile(row) : null;
}

/** Upsert the singleton profile, stamping `updatedAt`. Returns the stored value. */
export function saveUserProfile(profile: UserProfile): UserProfile {
  const stored: UserProfile = { ...profile, updatedAt: new Date().toISOString() };
  getDb().prepare(UPSERT_SQL).run(...userProfileBindValues(stored));
  return stored;
}

/** Merge a partial onto the current profile (or defaults) and persist it. */
export function updateUserProfile(partial: Partial<UserProfile>): UserProfile {
  const base = getUserProfile() ?? defaultUserProfile();
  return saveUserProfile({ ...base, ...partial });
}

/** Stamp `onboardingCompletedAt`, creating the profile from defaults if absent. */
export function completeOnboarding(): UserProfile {
  return updateUserProfile({ onboardingCompletedAt: new Date().toISOString() });
}

/** Dev reset: clear the user profile and all favorite repos. */
export function resetUser(): void {
  getDb().exec("DELETE FROM user_profile; DELETE FROM favorite_repos;");
}
