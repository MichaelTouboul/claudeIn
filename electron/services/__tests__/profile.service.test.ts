// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

// db.ts reads HOME at module load to compute the DB path, so set it before the
// dynamic imports below.
const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "cam-profilesvc-"));
process.env.HOME = tmpHome;

const { initDb } = await import("../core/db");
const profile = await import("../profile/profile.service");
const { computeInputsHash } = await import("../profile/profile.hash");

type SpawnCall = { command: string; cwd: string; prompt: string };

let calls: SpawnCall[];
let cannedStdout: string;
let scopeRoot: string;

function writeClaudeTree(root: string): void {
  fs.mkdirSync(path.join(root, ".claude", "agents"), { recursive: true });
  fs.writeFileSync(path.join(root, ".claude", "agents", "explorer.md"), "# Explorer\n");
  fs.writeFileSync(path.join(root, ".claude", "settings.json"), "{}\n");
}

beforeAll(async () => {
  await initDb();
  // Stub the spawn seam: record each invocation, return canned stdout. No
  // real `claude` / network is ever invoked in tests.
  profile.setProfileRunner(async ({ command, cwd, prompt }) => {
    calls.push({ command, cwd, prompt });
    return cannedStdout;
  });
});

afterAll(() => {
  fs.rmSync(tmpHome, { recursive: true, force: true });
});

beforeEach(() => {
  calls = [];
  cannedStdout = "## Profile\n\nThis scope configures one explorer agent.";
  scopeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cam-scope-"));
  writeClaudeTree(scopeRoot);
});

describe("ingestScope", () => {
  it("invokes claude --print with cwd=scopePath and a prompt mentioning .claude + plugins", async () => {
    await profile.ingestScope(scopeRoot, "project", ["babysitter"]);

    expect(calls).toHaveLength(1);
    const call = calls[0];
    expect(call.command).toContain("claude");
    expect(call.command).toContain("--print");
    expect(call.cwd).toBe(scopeRoot);
    expect(call.prompt).toContain(".claude");
    expect(call.prompt.toLowerCase()).toContain("babysitter");
  });

  it("persists the row and returns a ScopeProfile whose profileMd is the stdout", async () => {
    const result = await profile.ingestScope(scopeRoot, "project", []);

    expect(result.scopePath).toBe(scopeRoot);
    expect(result.scope).toBe("project");
    expect(result.profileMd).toBe(cannedStdout);
    expect(result.generatedAt).toBeTruthy();

    const stored = profile.getProfile(scopeRoot);
    expect(stored).not.toBeNull();
    expect(stored?.profileMd).toBe(cannedStdout);
  });
});

describe("getProfile / listProfiles round-trip", () => {
  it("getProfile returns null for an unknown scope", () => {
    expect(profile.getProfile(path.join(scopeRoot, "nope"))).toBeNull();
  });

  it("listProfiles includes an ingested scope", async () => {
    await profile.ingestScope(scopeRoot, "project", []);
    const all = profile.listProfiles();
    expect(all.map((p) => p.scopePath)).toContain(scopeRoot);
  });
});

describe("refreshProfile", () => {
  it("overwrites the row and updates generatedAt", async () => {
    const first = await profile.ingestScope(scopeRoot, "project", []);

    // change canned output + ensure a later timestamp
    cannedStdout = "## Updated profile";
    await new Promise((r) => setTimeout(r, 5));

    const refreshed = await profile.refreshProfile(scopeRoot);
    expect(refreshed.profileMd).toBe("## Updated profile");
    expect(refreshed.generatedAt >= first.generatedAt).toBe(true);
    expect(refreshed.generatedAt).not.toBe(first.generatedAt);

    // a single row remains (upsert, not insert)
    const stored = profile.listProfiles().filter((p) => p.scopePath === scopeRoot);
    expect(stored).toHaveLength(1);
    expect(stored[0].profileMd).toBe("## Updated profile");
  });
});

describe("inputs_hash", () => {
  it("changes when the .claude tree changes", async () => {
    const hashBefore = await computeInputsHash(scopeRoot);

    // mutate the .claude tree (add a file)
    await new Promise((r) => setTimeout(r, 5));
    fs.writeFileSync(path.join(scopeRoot, ".claude", "skills.md"), "# new\n");

    const hashAfter = await computeInputsHash(scopeRoot);
    expect(hashAfter).not.toBe(hashBefore);
  });

  it("is stable when the .claude tree is unchanged", async () => {
    const h1 = await computeInputsHash(scopeRoot);
    const h2 = await computeInputsHash(scopeRoot);
    expect(h2).toBe(h1);
  });
});
