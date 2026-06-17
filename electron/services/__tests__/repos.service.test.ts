// @vitest-environment node
import os from "node:os";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Candidate } from "../../types/onboarding.types";

// Mock scanCandidates so no real filesystem scan runs.
const scanCandidatesMock = vi.fn<(root?: string) => Promise<Candidate[]>>();
vi.mock("../system/onboarding.service", () => ({
  scanCandidates: (root?: string) => scanCandidatesMock(root),
}));

const repos = await import("../projects/repos.service");

const userCandidate: Candidate = { path: "/home/me", scope: "user", hasClaude: true, plugins: [] };
const projectA: Candidate = { path: "/work/a", scope: "project", hasClaude: true, plugins: [] };
const projectB: Candidate = {
  path: "/work/b",
  scope: "project",
  hasClaude: true,
  plugins: ["babysitter"],
};

beforeEach(() => {
  scanCandidatesMock.mockReset();
});

describe("scanRepos", () => {
  it("filters to scope=project and attaches a per-repo LLM label via the runner seam", async () => {
    scanCandidatesMock.mockResolvedValue([userCandidate, projectA, projectB]);

    const seenCwds: string[] = [];
    let call = 0;
    // Distinguish repos via the stub's return value, NOT via cwd: cwd is now
    // always os.tmpdir() so the per-repo label run never pollutes a scanned repo.
    repos.setReposRunner(async ({ cwd }) => {
      seenCwds.push(cwd);
      call += 1;
      return `label ${call}`;
    });

    const result = await repos.scanRepos("/work");

    expect(scanCandidatesMock).toHaveBeenCalledWith("/work");
    // user scope dropped
    expect(result.map((r) => r.path)).toEqual(["/work/a", "/work/b"]);
    expect(result[0].label).toBe("label 1");
    expect(result[1].label).toBe("label 2");
    // ran once per project repo, ALWAYS with cwd = os.tmpdir() (never the repo path)
    expect(seenCwds).toHaveLength(2);
    expect(seenCwds).toEqual([os.tmpdir(), os.tmpdir()]);
    expect(seenCwds).not.toContain("/work/a");
    expect(seenCwds).not.toContain("/work/b");
  });

  it("sets label = null when the runner throws for a repo", async () => {
    scanCandidatesMock.mockResolvedValue([projectA]);
    repos.setReposRunner(async () => {
      throw new Error("boom");
    });

    const result = await repos.scanRepos();
    expect(result).toHaveLength(1);
    expect(result[0].label).toBeNull();
    // Non-existent repo path → no logo detected.
    expect(result[0].logoDataUrl).toBeNull();
    // Non-existent repo path → undetectable language.
    expect(result[0].language).toBeNull();
  });

  it("returns [] when no project repos are found", async () => {
    scanCandidatesMock.mockResolvedValue([userCandidate]);
    const result = await repos.scanRepos();
    expect(result).toEqual([]);
  });
});
