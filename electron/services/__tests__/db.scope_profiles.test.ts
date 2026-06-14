// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

// db.ts reads HOME at module load to compute the DB path, so set it before the
// dynamic imports below.
const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "cam-scopeprofiles-"));
process.env.HOME = tmpHome;

const { initDb, getDb } = await import("../core/db");

beforeAll(async () => {
  await initDb();
});

describe("scope_profiles table", () => {
  it("exists after init with the expected columns", async () => {
    // idempotent: a second init must not throw or change the schema
    await initDb();
    const cols = getDb()
      .prepare("PRAGMA table_info(scope_profiles)")
      .all()
      .map((r) => r.name);
    expect(cols).toEqual(
      expect.arrayContaining(["scope_path", "scope", "profile_md", "inputs_hash", "generated_at"])
    );
  });

  it("has scope_path as the primary key", () => {
    const pkCols = getDb()
      .prepare("PRAGMA table_info(scope_profiles)")
      .all()
      .filter((r) => r.pk === 1)
      .map((r) => r.name);
    expect(pkCols).toEqual(["scope_path"]);
  });
});
