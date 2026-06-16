// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

// db.ts reads HOME at module load to compute the DB path, so set it before the
// dynamic imports below.
const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "cam-userprofile-db-"));
process.env.HOME = tmpHome;

const { initDb, getDb } = await import("../core/db");

beforeAll(async () => {
  await initDb();
});

describe("user_profile table", () => {
  it("exists after init with the expected columns", async () => {
    // idempotent: a second init must not throw or change the schema
    await initDb();
    const cols = getDb()
      .prepare("PRAGMA table_info(user_profile)")
      .all()
      .map((r) => r.name);
    expect(cols).toEqual(
      expect.arrayContaining([
        "id",
        "claude_user_path",
        "name",
        "role",
        "plugins",
        "capabilities",
        "summary",
        "stack",
        "domains",
        "workflow",
        "onboarding_completed_at",
        "generated_at",
        "updated_at",
      ]),
    );
  });

  it("has id as the primary key (singleton)", () => {
    const pkCols = getDb()
      .prepare("PRAGMA table_info(user_profile)")
      .all()
      .filter((r) => r.pk === 1)
      .map((r) => r.name);
    expect(pkCols).toEqual(["id"]);
  });
});

describe("favorite_repos table", () => {
  it("exists after init with the expected columns", () => {
    const cols = getDb()
      .prepare("PRAGMA table_info(favorite_repos)")
      .all()
      .map((r) => r.name);
    expect(cols).toEqual(expect.arrayContaining(["path", "label", "added_at"]));
  });

  it("has path as the primary key", () => {
    const pkCols = getDb()
      .prepare("PRAGMA table_info(favorite_repos)")
      .all()
      .filter((r) => r.pk === 1)
      .map((r) => r.name);
    expect(pkCols).toEqual(["path"]);
  });

  it("leaves scope_profiles untouched", () => {
    const cols = getDb()
      .prepare("PRAGMA table_info(scope_profiles)")
      .all()
      .map((r) => r.name);
    expect(cols).toEqual(
      expect.arrayContaining(["scope_path", "scope", "profile_md", "inputs_hash", "generated_at"]),
    );
  });
});
