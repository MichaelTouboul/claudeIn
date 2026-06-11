// @vitest-environment node
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "cam-favrepos-"));
process.env.HOME = tmpHome;

const { initDb, getDb } = await import("./db");
const repos = await import("./favorite-repos.service");

beforeAll(async () => {
  await initDb();
});

beforeEach(() => {
  getDb().exec("DELETE FROM favorite_repos;");
});

describe("favorite-repos service", () => {
  it("list returns [] when empty", () => {
    expect(repos.list()).toEqual([]);
  });

  it("add inserts a repo with a label and returns it", () => {
    const added = repos.add("/work/app", "App");
    expect(added.path).toBe("/work/app");
    expect(added.label).toBe("App");
    expect(added.addedAt).toBeTruthy();
    expect(repos.list().map((r) => r.path)).toEqual(["/work/app"]);
  });

  it("add without a label stores label = null", () => {
    const added = repos.add("/work/lib");
    expect(added.label).toBeNull();
    expect(repos.list()[0].label).toBeNull();
  });

  it("add is idempotent on the path primary key (no duplicate, label updates)", () => {
    repos.add("/work/app", "App");
    repos.add("/work/app", "Renamed");
    const all = repos.list();
    expect(all).toHaveLength(1);
    expect(all[0].label).toBe("Renamed");
  });

  it("remove deletes by path", () => {
    repos.add("/work/app", "App");
    repos.add("/work/lib", "Lib");
    repos.remove("/work/app");
    expect(repos.list().map((r) => r.path)).toEqual(["/work/lib"]);
  });

  it("list is ordered by added_at ascending", () => {
    repos.add("/b");
    repos.add("/a");
    expect(repos.list().map((r) => r.path)).toEqual(["/b", "/a"]);
  });
});
