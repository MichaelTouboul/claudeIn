// @vitest-environment node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { loadGitBranchInfo } from "../git/git.service";

let repo: string;
const git = (args: string[]) => execFileSync("git", args, { cwd: repo });

beforeAll(() => {
  repo = fs.mkdtempSync(path.join(os.tmpdir(), "branchrepo-"));
  git(["init", "-q", "-b", "main"]);
  git(["config", "user.email", "t@t.t"]);
  git(["config", "user.name", "t"]);
  fs.writeFileSync(path.join(repo, "a.txt"), "one\n");
  git(["add", "."]);
  git(["commit", "-qm", "init"]);
});
afterAll(() => fs.rmSync(repo, { recursive: true, force: true }));

describe("loadGitBranchInfo", () => {
  it("reports the current branch and the repo's own worktree", async () => {
    const info = await loadGitBranchInfo(repo);
    expect(info.error).toBeUndefined();
    expect(info.current).toBe("main");
    expect(info.worktrees.some((w) => w.branch === "main")).toBe(true);
  });

  it("includes a second linked worktree once one is added", async () => {
    const wtDir = path.join(repo, ".wt", "feature");
    git(["worktree", "add", "-q", "-b", "feature/x", wtDir]);
    const info = await loadGitBranchInfo(repo);
    expect(info.worktrees.some((w) => w.branch === "feature/x")).toBe(true);
  });

  it("returns an error for a non-git dir", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nogit-branch-"));
    const info = await loadGitBranchInfo(tmp);
    expect(info.error).toBeTruthy();
    expect(info.current).toBeNull();
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
