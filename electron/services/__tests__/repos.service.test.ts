// @vitest-environment node
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

    const seen: string[] = [];
    repos.setReposRunner(async ({ cwd }) => {
      seen.push(cwd);
      return `label for ${cwd}`;
    });

    const result = await repos.scanRepos("/work");

    expect(scanCandidatesMock).toHaveBeenCalledWith("/work");
    // user scope dropped
    expect(result.map((r) => r.path)).toEqual(["/work/a", "/work/b"]);
    expect(result[0].label).toBe("label for /work/a");
    expect(result[1].label).toBe("label for /work/b");
    // ran once per project repo, with cwd = repo path
    expect(seen).toEqual(["/work/a", "/work/b"]);
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
