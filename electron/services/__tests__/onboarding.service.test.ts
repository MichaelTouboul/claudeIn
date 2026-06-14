// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

import { scanCandidates } from "../system/onboarding.service";
import type { Candidate } from "../../types/onboarding.types";

let tmpRoot: string;

function mkClaude(dir: string) {
  fs.mkdirSync(path.join(dir, ".claude"), { recursive: true });
}

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cam-onboarding-"));
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

function byPath(candidates: Candidate[]): Map<string, Candidate> {
  return new Map(candidates.map((c) => [c.path, c]));
}

describe("scanCandidates", () => {
  it("returns a dir with a root-level .claude as a project candidate", async () => {
    const repo = path.join(tmpRoot, "repo-a");
    mkClaude(repo);

    const found = await scanCandidates(tmpRoot);
    const c = byPath(found).get(repo);
    expect(c).toBeDefined();
    expect(c).toMatchObject({ path: repo, scope: "project", hasClaude: true, plugins: [] });
  });

  it("does NOT descend into a found candidate (nested .claude excluded)", async () => {
    const repo = path.join(tmpRoot, "repo-a");
    mkClaude(repo);
    // A nested project inside an already-found candidate.
    const nested = path.join(repo, "packages", "inner");
    mkClaude(nested);

    const found = await scanCandidates(tmpRoot);
    const paths = found.map((c) => c.path);
    expect(paths).toContain(repo);
    expect(paths).not.toContain(nested);
  });

  it("does not scan dirs on the skip-list (e.g. node_modules)", async () => {
    const skipped = path.join(tmpRoot, "node_modules", "pkg");
    mkClaude(skipped);

    const found = await scanCandidates(tmpRoot);
    expect(found.map((c) => c.path)).not.toContain(skipped);
  });

  it("reports plugins:['babysitter'] when .a5c sits beside .claude", async () => {
    const repo = path.join(tmpRoot, "repo-plugin");
    mkClaude(repo);
    fs.mkdirSync(path.join(repo, ".a5c"), { recursive: true });

    const found = await scanCandidates(tmpRoot);
    const c = byPath(found).get(repo);
    expect(c?.plugins).toEqual(["babysitter"]);
  });

  it("maps a root-level (=== root) .claude to user scope", async () => {
    mkClaude(tmpRoot);

    const found = await scanCandidates(tmpRoot);
    const c = byPath(found).get(tmpRoot);
    expect(c).toMatchObject({ path: tmpRoot, scope: "user", hasClaude: true });
  });
});
