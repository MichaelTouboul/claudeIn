// @vitest-environment node
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

import type { UserProfile } from "../../types/user.interface";

// db.ts reads HOME at module load to compute the DB path, so set it before the
// dynamic imports below.
const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "cam-userprofile-svc-"));
process.env.HOME = tmpHome;

const { initDb, getDb } = await import("../core/db");
const svc = await import("../profile/user-profile.service");

const sample: UserProfile = {
  claudeUserPath: "/home/me/.claude",
  name: "Ada",
  role: "Engineer",
  plugins: ["babysitter"],
  capabilities: { agents: { count: 2, names: ["a", "b"] }, skills: 3, mcp: 1, hooks: 4 },
  stack: ["TypeScript", "Node"],
  domains: ["backend", "infra"],
  onboardingCompletedAt: null,
  generatedAt: "2026-06-11T00:00:00.000Z",
  updatedAt: "2026-06-11T00:00:00.000Z",
};

beforeAll(async () => {
  await initDb();
});

beforeEach(() => {
  getDb().exec("DELETE FROM user_profile; DELETE FROM favorite_repos;");
});

describe("getUserProfile", () => {
  it("returns null when no profile row exists", () => {
    expect(svc.getUserProfile()).toBeNull();
  });

  it("returns the saved profile, deserializing JSON columns", () => {
    const stored = svc.saveUserProfile(sample);
    const got = svc.getUserProfile();
    // saveUserProfile re-stamps updatedAt; compare against the stored value.
    expect(got).toEqual(stored);
    expect(got?.capabilities.agents.names).toEqual(["a", "b"]);
    expect(got?.stack).toEqual(["TypeScript", "Node"]);
    expect(got?.domains).toEqual(["backend", "infra"]);
  });

  it("defaults stack to [] for a legacy row written without it", () => {
    // simulate a pre-stack row: insert a singleton with a NULL stack column.
    getDb()
      .prepare(
        "INSERT INTO user_profile (id, name, domains) VALUES (1, ?, ?)",
      )
      .run("Legacy", JSON.stringify(["backend"]));
    const got = svc.getUserProfile();
    expect(got?.stack).toEqual([]);
    expect(got?.domains).toEqual(["backend"]);
  });
});

describe("saveUserProfile", () => {
  it("upserts a singleton row (id = 1), overwriting on a second save", () => {
    svc.saveUserProfile(sample);
    svc.saveUserProfile({ ...sample, name: "Grace" });

    const rows = getDb().prepare("SELECT id FROM user_profile").all();
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(1);
    expect(svc.getUserProfile()?.name).toBe("Grace");
  });
});

describe("updateUserProfile", () => {
  it("merges a partial onto the existing profile", () => {
    svc.saveUserProfile(sample);
    const updated = svc.updateUserProfile({ role: "Architect", domains: ["frontend"] });

    expect(updated.role).toBe("Architect");
    expect(updated.domains).toEqual(["frontend"]);
    // untouched fields preserved
    expect(updated.name).toBe("Ada");
    expect(updated.capabilities.skills).toBe(3);
  });

  it("creates a profile from defaults when none exists yet", () => {
    const updated = svc.updateUserProfile({ name: "Solo" });
    expect(updated.name).toBe("Solo");
    expect(updated.plugins).toEqual([]);
    expect(updated.stack).toEqual([]);
    expect(updated.capabilities).toEqual({
      agents: { count: 0, names: [] },
      skills: 0,
      mcp: 0,
      hooks: 0,
    });
    expect(updated.onboardingCompletedAt).toBeNull();
  });
});

describe("completeOnboarding", () => {
  it("stamps onboarding_completed_at on the existing profile", () => {
    svc.saveUserProfile(sample);
    const done = svc.completeOnboarding();
    expect(done.onboardingCompletedAt).toBeTruthy();
    expect(svc.getUserProfile()?.onboardingCompletedAt).toBe(done.onboardingCompletedAt);
  });

  it("creates a profile if none exists, still stamping the timestamp", () => {
    const done = svc.completeOnboarding();
    expect(done.onboardingCompletedAt).toBeTruthy();
  });
});

describe("resetUser", () => {
  it("clears both user_profile and favorite_repos", () => {
    svc.saveUserProfile(sample);
    getDb()
      .prepare("INSERT INTO favorite_repos (path, label, added_at) VALUES (?, ?, ?)")
      .run("/repo", "Repo", "2026-06-11T00:00:00.000Z");

    svc.resetUser();

    expect(svc.getUserProfile()).toBeNull();
    expect(getDb().prepare("SELECT path FROM favorite_repos").all()).toHaveLength(0);
  });
});
