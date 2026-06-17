// @vitest-environment node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { DiffMode, FileStatus } from "../../types/git.types";
import { loadRepoDiff } from "../git/git.service";

let repo: string;
const git = (args: string[]) => execFileSync("git", args, { cwd: repo });

beforeAll(() => {
  repo = fs.mkdtempSync(path.join(os.tmpdir(), "diffrepo-"));
  git(["init", "-q"]);
  git(["config", "user.email", "t@t.t"]);
  git(["config", "user.name", "t"]);
  fs.writeFileSync(path.join(repo, "a.txt"), "one\ntwo\n");
  git(["add", "."]);
  git(["commit", "-qm", "init"]);
  fs.writeFileSync(path.join(repo, "a.txt"), "one\nTWO\n"); // modified
  fs.writeFileSync(path.join(repo, "untracked.txt"), "new\n"); // untracked
});
afterAll(() => fs.rmSync(repo, { recursive: true, force: true }));

describe("loadRepoDiff working mode", () => {
  it("returns modified + untracked-as-added", async () => {
    const d = await loadRepoDiff(repo, DiffMode.Working);
    expect(d.error).toBeUndefined();
    const byPath = Object.fromEntries(d.files.map((f) => [f.path, f]));
    expect(byPath["a.txt"].status).toBe(FileStatus.Modified);
    expect(byPath["untracked.txt"].status).toBe(FileStatus.Added);
  });

  it("returns an error for a non-git dir", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nogit-"));
    const d = await loadRepoDiff(tmp, DiffMode.Working);
    expect(d.error).toBeTruthy();
    expect(d.files).toEqual([]);
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
