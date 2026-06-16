// @vitest-environment node
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "cam-favrepos-"));
process.env.HOME = tmpHome;

const { initDb, getDb } = await import("../core/db");
const repos = await import("../projects/favorite-repos.service");

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

  it("persists a logoDataUrl and reads it back from list", () => {
    const logo = "data:image/svg+xml;base64,PHN2Zz4=";
    const added = repos.add("/work/app", "App", logo);
    expect(added.logoDataUrl).toBe(logo);
    expect(repos.list()[0].logoDataUrl).toBe(logo);
  });

  it("stores logoDataUrl = null when none is provided", () => {
    const added = repos.add("/work/lib");
    expect(added.logoDataUrl).toBeNull();
    expect(repos.list()[0].logoDataUrl).toBeNull();
  });

  it("upsert keeps an existing logo when re-added without one", () => {
    const logo = "data:image/png;base64,AAAA";
    repos.add("/work/app", "App", logo);
    repos.add("/work/app", "Renamed");
    expect(repos.list()[0].logoDataUrl).toBe(logo);
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
