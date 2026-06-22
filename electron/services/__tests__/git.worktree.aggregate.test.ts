// @vitest-environment node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { loadAllRepoWorktrees } from "../git/git.worktree.aggregate";
import { addWorktree, removeWorktree } from "../git/git.worktree";
import { worktreePath } from "../git/git.worktree.args";

let repoA: string;
let repoB: string;
const git = (cwd: string, args: string[]) => execFileSync("git", args, { cwd });

function initRepo(prefix: string): string {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  git(repo, ["init", "-q", "-b", "main"]);
  git(repo, ["config", "user.email", "t@t.t"]);
  git(repo, ["config", "user.name", "t"]);
  fs.writeFileSync(path.join(repo, "a.txt"), "one\ntwo\nthree\n");
  git(repo, ["add", "."]);
  git(repo, ["commit", "-qm", "init"]);
  return repo;
}

beforeAll(async () => {
  repoA = initRepo("aggA-");
  repoB = initRepo("aggB-");
  // repoA gets a divergent feature worktree.
  await addWorktree(repoA, "feature/x");
  const wt = worktreePath(repoA, "feature/x");
  fs.writeFileSync(path.join(wt, "a.txt"), "one\nTWO\nthree\nfour\n");
  git(wt, ["add", "."]);
  git(wt, ["commit", "-qm", "change"]);
});

afterAll(() => {
  fs.rmSync(repoA, { recursive: true, force: true });
  fs.rmSync(repoB, { recursive: true, force: true });
});

describe("loadAllRepoWorktrees", () => {
  it("returns [] for an empty repo list", async () => {
    expect(await loadAllRepoWorktrees([])).toEqual([]);
  });

  it("aggregates each repo's branch info + per-worktree stats, keyed by repoPath", async () => {
    const all = await loadAllRepoWorktrees([repoA, repoB]);
    expect(all.map((r) => r.repoPath)).toEqual([repoA, repoB]);

    const a = all.find((r) => r.repoPath === repoA)!;
    expect(a.branchInfo.error).toBeUndefined();
    // base worktree + the feature worktree
    expect(a.branchInfo.worktrees.length).toBe(2);
    const feature = a.stats.find((s) => s.path.includes("feature-x"));
    expect(feature?.ahead).toBe(1);

    const b = all.find((r) => r.repoPath === repoB)!;
    expect(b.branchInfo.worktrees.length).toBe(1);
  });

  it("isolates a bad repo path: it appears with an error, others still resolve", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aggBad-"));
    const all = await loadAllRepoWorktrees([tmp, repoB]);
    expect(all).toHaveLength(2);
    const bad = all.find((r) => r.repoPath === tmp)!;
    expect(bad.branchInfo.error).toBeTruthy();
    expect(bad.stats).toEqual([]);
    const good = all.find((r) => r.repoPath === repoB)!;
    expect(good.branchInfo.error).toBeUndefined();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("dedupes repeated repo paths", async () => {
    const all = await loadAllRepoWorktrees([repoB, repoB]);
    expect(all).toHaveLength(1);
  });
});
