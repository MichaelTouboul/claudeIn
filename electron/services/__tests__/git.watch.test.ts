// @vitest-environment node
import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../core/broadcast", () => ({ broadcast: vi.fn() }));

import { broadcast } from "../core/broadcast";
import type { GitBranchInfo } from "../../types/git.types";
import { unwatchGitBranch, watchGitBranch } from "../git/git.watch";

const broadcastMock = vi.mocked(broadcast);

let repo: string;

function git(args: string[], cwd: string): void {
  execFileSync("git", args, { cwd, stdio: "ignore" });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type BranchChangedEvent = { type: string; repoPath: string; info: GitBranchInfo };

function branchEvents(): BranchChangedEvent[] {
  return broadcastMock.mock.calls
    .map((c) => c[0] as Partial<BranchChangedEvent>)
    .filter((d): d is BranchChangedEvent => d.type === "git:branch-changed")
    .map((d) => ({ type: d.type, repoPath: d.repoPath, info: d.info }));
}

// Poll until predicate holds (≤5s); re-fire onTick each iteration to defeat
// fs.watch's macOS startup race (a change in the first ms can be dropped).
async function waitFor(predicate: () => boolean, onTick?: () => void): Promise<void> {
  for (let i = 0; i < 200 && !predicate(); i++) {
    await sleep(25);
    if (onTick) onTick();
  }
}

beforeEach(() => {
  repo = fs.mkdtempSync(path.join(os.tmpdir(), "cam-gitwatch-"));
  git(["init", "-q", "-b", "main"], repo);
  git(["config", "user.email", "t@t.dev"], repo);
  git(["config", "user.name", "T"], repo);
  fs.writeFileSync(path.join(repo, "f.txt"), "hi\n");
  git(["add", "."], repo);
  git(["commit", "-q", "-m", "init"], repo);
  broadcastMock.mockClear();
});

afterEach(async () => {
  await unwatchGitBranch(repo);
  fs.rmSync(repo, { recursive: true, force: true });
});

describe("watchGitBranch", () => {
  it("broadcasts git:branch-changed with the new branch when HEAD switches", async () => {
    await watchGitBranch(repo);

    // Create + switch to a new branch — rewrites .git/HEAD.
    git(["checkout", "-q", "-b", "feature"], repo);

    await waitFor(() => branchEvents().some((e) => e.info.current === "feature"));

    const evts = branchEvents().filter((e) => e.info.current === "feature");
    expect(evts.length).toBeGreaterThan(0);
    expect(evts[0].repoPath).toBe(repo);
    expect(evts[0].info.current).toBe("feature");
  });

  it("unwatch stops further broadcasts", async () => {
    await watchGitBranch(repo);
    await unwatchGitBranch(repo);
    broadcastMock.mockClear();

    git(["checkout", "-q", "-b", "other"], repo);
    await sleep(200);

    expect(branchEvents()).toHaveLength(0);
  });
});
