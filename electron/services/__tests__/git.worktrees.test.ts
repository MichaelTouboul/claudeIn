// @vitest-environment node
import { describe, expect, it } from "vitest";

import { parseWorktrees } from "../git/git.parse";

describe("parseWorktrees", () => {
  it("parses `git worktree list --porcelain` into branch entries", () => {
    const porcelain = [
      "worktree /repo",
      "HEAD abc123",
      "branch refs/heads/main",
      "",
      "worktree /repo/.wt/feature",
      "HEAD def456",
      "branch refs/heads/feature/redesign",
      "",
    ].join("\n");

    expect(parseWorktrees(porcelain)).toEqual([
      { path: "/repo", branch: "main", detached: false },
      { path: "/repo/.wt/feature", branch: "feature/redesign", detached: false },
    ]);
  });

  it("marks a detached worktree (no branch line) as detached with a null branch", () => {
    const porcelain = ["worktree /repo/.wt/detached", "HEAD abc123", "detached", ""].join("\n");

    expect(parseWorktrees(porcelain)).toEqual([
      { path: "/repo/.wt/detached", branch: null, detached: true },
    ]);
  });

  it("skips a prunable (missing-dir) worktree while keeping valid ones", () => {
    const porcelain = [
      "worktree /repo",
      "HEAD abc123",
      "branch refs/heads/main",
      "",
      "worktree /repo/.wt/stale",
      "HEAD def456",
      "branch refs/heads/stale",
      "prunable gitdir file points to non-existent location",
      "",
    ].join("\n");

    expect(parseWorktrees(porcelain)).toEqual([
      { path: "/repo", branch: "main", detached: false },
    ]);
  });

  it("returns an empty list for empty output", () => {
    expect(parseWorktrees("")).toEqual([]);
  });
});
