// @vitest-environment node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  mergeBranchArgs,
  worktreeAddArgs,
  worktreePath,
  worktreeRemoveArgs,
} from "../git/git.worktree.args";
import {
  addWorktree,
  loadWorktreeStat,
  loadWorktreeStats,
  mergeWorktree,
  removeWorktree,
} from "../git/git.worktree";

describe("worktree arg builders", () => {
  it("places a new worktree under <repo>/.worktrees/<safe-branch>", () => {
    expect(worktreePath("/repo", "feature/x")).toBe(
      path.join("/repo", ".worktrees", "feature-x"),
    );
  });

  it("creates a branch with -b when createBranch is true", () => {
    expect(worktreeAddArgs("/repo/.worktrees/feat", "feat", true)).toEqual([
      "worktree",
      "add",
      "-b",
      "feat",
      "/repo/.worktrees/feat",
    ]);
  });

  it("checks out an existing branch without -b", () => {
    expect(worktreeAddArgs("/repo/.worktrees/feat", "feat", false)).toEqual([
      "worktree",
      "add",
      "/repo/.worktrees/feat",
      "feat",
    ]);
  });

  it("adds --force to remove only when forced", () => {
    expect(worktreeRemoveArgs("/p", false)).toEqual(["worktree", "remove", "/p"]);
    expect(worktreeRemoveArgs("/p", true)).toEqual([
      "worktree",
      "remove",
      "--force",
      "/p",
    ]);
  });

  it("builds a non-interactive merge", () => {
    expect(mergeBranchArgs("feature/x")).toEqual(["merge", "--no-edit", "feature/x"]);
  });
});

let repo: string;
const git = (args: string[], cwd = repo) => execFileSync("git", args, { cwd });

beforeAll(() => {
  repo = fs.mkdtempSync(path.join(os.tmpdir(), "wtrepo-"));
  git(["init", "-q", "-b", "main"]);
  git(["config", "user.email", "t@t.t"]);
  git(["config", "user.name", "t"]);
  fs.writeFileSync(path.join(repo, "a.txt"), "one\ntwo\nthree\n");
  git(["add", "."]);
  git(["commit", "-qm", "init"]);
});
afterAll(() => fs.rmSync(repo, { recursive: true, force: true }));

describe("loadWorktreeStat", () => {
  it("reports zero stats for the base branch worktree itself", async () => {
    const stat = await loadWorktreeStat(repo, repo, "main");
    expect(stat.error).toBeUndefined();
    expect(stat).toMatchObject({ additions: 0, deletions: 0, ahead: 0, base: "main" });
  });

  it("counts adds/dels and ahead commits for a divergent worktree", async () => {
    // Create a feature worktree, commit changes there, then stat it vs main.
    const wt = worktreePath(repo, "feature/ahead");
    git(worktreeAddArgs(wt, "feature/ahead", true));
    fs.writeFileSync(path.join(wt, "a.txt"), "one\nTWO\nthree\nfour\n"); // 1 del, 2 add
    git(["add", "."], wt);
    git(["commit", "-qm", "change"], wt);

    const stat = await loadWorktreeStat(wt, repo, "feature/ahead");
    expect(stat.error).toBeUndefined();
    expect(stat.ahead).toBe(1);
    expect(stat.additions).toBeGreaterThanOrEqual(2);
    expect(stat.deletions).toBeGreaterThanOrEqual(1);
    expect(stat.base).toBe("main");

    git(worktreeRemoveArgs(wt, true));
  });

  it("returns an error (not a throw) for a non-git path", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nogit-"));
    const stat = await loadWorktreeStat(tmp, tmp, null);
    expect(stat.error).toBeTruthy();
    expect(stat).toMatchObject({ additions: 0, deletions: 0, ahead: 0 });
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

describe("loadWorktreeStats", () => {
  it("returns one stat per worktree, keyed by path", async () => {
    const add = await addWorktree(repo, "feature/stats");
    expect(add.ok).toBe(true);
    const wt = worktreePath(repo, "feature/stats");
    fs.writeFileSync(path.join(wt, "c.txt"), "x\n");
    git(["add", "."], wt);
    git(["commit", "-qm", "c"], wt);

    const stats = await loadWorktreeStats(repo);
    // git reports realpaths (macOS /private symlink), so match by basename
    // rather than the mkdtemp path. The base worktree is the non-.worktrees one.
    const base = stats.find((s) => !s.path.includes(".worktrees"));
    const feature = stats.find((s) => s.path.includes("feature-stats"));
    expect(base).toMatchObject({ ahead: 0 });
    expect(feature?.ahead).toBe(1);

    await removeWorktree(repo, wt, true);
  });

  it("returns [] for a non-git path", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nogit2-"));
    expect(await loadWorktreeStats(tmp)).toEqual([]);
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

describe("worktree mutations", () => {
  it("adds then removes a worktree, reporting ok", async () => {
    const add = await addWorktree(repo, "chore/tmp");
    expect(add.ok).toBe(true);
    const created = worktreePath(repo, "chore/tmp");
    expect(fs.existsSync(created)).toBe(true);

    const rm = await removeWorktree(repo, created, true);
    expect(rm.ok).toBe(true);
    expect(fs.existsSync(created)).toBe(false);
  });

  it("surfaces git's stderr (not a throw) when add fails", async () => {
    // Re-adding the SAME branch name into an existing path collides.
    await addWorktree(repo, "dup/branch");
    const again = await addWorktree(repo, "dup/branch");
    expect(again.ok).toBe(false);
    expect(again.message.length).toBeGreaterThan(0);
    await removeWorktree(repo, worktreePath(repo, "dup/branch"), true);
  });

  it("merges a worktree branch into base with a clean fast-forward", async () => {
    const add = await addWorktree(repo, "feature/merge-me");
    expect(add.ok).toBe(true);
    const wt = worktreePath(repo, "feature/merge-me");
    fs.writeFileSync(path.join(wt, "b.txt"), "new file\n");
    git(["add", "."], wt);
    git(["commit", "-qm", "add b"], wt);

    const merged = await mergeWorktree(repo, "feature/merge-me");
    expect(merged.ok).toBe(true);
    expect(fs.existsSync(path.join(repo, "b.txt"))).toBe(true);

    await removeWorktree(repo, wt, true);
  });
});
