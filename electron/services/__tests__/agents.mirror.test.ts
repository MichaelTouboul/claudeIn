// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

// Mock broadcast now so it's in place for Phase 3's watch test too.
vi.mock("../core/broadcast", () => ({ broadcast: vi.fn() }));

import { broadcast } from "../core/broadcast";
import { getAgents, unwatchAgents, watchAgents } from "../agents/agents.mirror";
import type { AgentsSnapshot } from "../../types/agents-mirror.types";

const broadcastMock = vi.mocked(broadcast);

let tmpHome: string;
let prevHome: string | undefined;
let userAgentsDir: string;

beforeEach(() => {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "cam-agents-"));
  prevHome = process.env.HOME;
  process.env.HOME = tmpHome;
  userAgentsDir = path.join(tmpHome, ".claude", "agents");
  fs.mkdirSync(userAgentsDir, { recursive: true });
  broadcastMock.mockClear();
});

afterEach(() => {
  unwatchAgents(); // always tear down watchers/timers to avoid leaks
  process.env.HOME = prevHome;
  fs.rmSync(tmpHome, { recursive: true, force: true });
});

/** macOS recursive fs.watch can take a beat to arm — settle before mutating. */
function settle(ms = 80): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function waitFor(predicate: () => boolean, timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (predicate()) return resolve();
      if (Date.now() - start > timeout) return reject(new Error("timeout"));
      setTimeout(tick, 20);
    };
    tick();
  });
}

interface AgentsChangedPush {
  type?: string;
  snapshot?: AgentsSnapshot;
}

function changedPushes(): AgentsChangedPush[] {
  return broadcastMock.mock.calls
    .map(([d]) => d as AgentsChangedPush)
    .filter((d) => d.type === "agents_changed");
}

function writeAgent(dir: string, file: string, frontmatter: Record<string, unknown>, body = "x") {
  fs.mkdirSync(dir, { recursive: true });
  const fm = Object.entries(frontmatter)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join("\n");
  fs.writeFileSync(path.join(dir, file), `---\n${fm}\n---\n${body}\n`);
}

describe("agents.mirror getAgents", () => {
  it("reads user .md frontmatter into lightweight summaries (no body/memory/annex)", () => {
    writeAgent(userAgentsDir, "alpha.md", { name: "alpha", description: "A" });
    const snap = getAgents();
    expect(snap.projectPath).toBeNull();
    const alpha = snap.agents.find((a) => a.id === "alpha");
    expect(alpha?.scope).toBe("user");
    expect(alpha?.frontmatter.name).toBe("alpha");
    expect(alpha).not.toHaveProperty("body"); // heavy content excluded
    expect(alpha).not.toHaveProperty("memoryFiles");
  });

  it("skips the memory/ subdirectory and .md files lacking a name", () => {
    writeAgent(userAgentsDir, "good.md", { name: "good", description: "G" });
    writeAgent(path.join(userAgentsDir, "memory"), "note.md", {
      name: "should-be-skipped",
      description: "x",
    });
    writeAgent(userAgentsDir, "nameless.md", { description: "no name field" });
    const ids = getAgents().agents.map((a) => a.id);
    expect(ids).toEqual(["good"]);
  });

  it("walks nested folders and sets folder/relativePath", () => {
    writeAgent(path.join(userAgentsDir, "sub"), "nested.md", { name: "nested", description: "N" });
    const nested = getAgents().agents.find((a) => a.id === "nested");
    expect(nested?.folder).toBe("sub");
    expect(nested?.relativePath).toBe(path.join("sub", "nested.md"));
  });

  it("project scope: adds project agents and project shadows user on name collision", () => {
    const projDir = fs.mkdtempSync(path.join(os.tmpdir(), "cam-proj-"));
    const projAgentsDir = path.join(projDir, ".claude", "agents");
    writeAgent(userAgentsDir, "dup.md", { name: "dup", description: "user version" });
    writeAgent(userAgentsDir, "only-user.md", { name: "only-user", description: "U" });
    writeAgent(projAgentsDir, "dup.md", { name: "dup", description: "project version" });

    const snap = getAgents(projDir);
    expect(snap.projectPath).toBe(projDir);
    const projDup = snap.agents.find((a) => a.id === "dup" && a.scope === "project");
    const userDup = snap.agents.find((a) => a.id === "dup" && a.scope === "user");
    expect(projDup?.shadowed).toBe(false);
    expect(userDup?.shadowed).toBe(true);
    expect(snap.agents.find((a) => a.id === "only-user")?.shadowed).toBe(false);
    fs.rmSync(projDir, { recursive: true, force: true });
  });

  it("missing user agents dir → empty list, never throws", () => {
    fs.rmSync(userAgentsDir, { recursive: true, force: true });
    expect(() => getAgents()).not.toThrow();
    expect(getAgents().agents).toEqual([]);
  });
});

describe("agents.mirror watchAgents", () => {
  it("broadcasts a recomputed snapshot when a watched .md changes (incl. nested)", async () => {
    watchAgents();
    await settle();
    writeAgent(path.join(userAgentsDir, "sub"), "fresh.md", { name: "fresh", description: "F" });
    await waitFor(() =>
      changedPushes().some((d) => d.snapshot?.agents.some((a) => a.id === "fresh")),
    );
    const push = changedPushes().find((d) => d.snapshot?.agents.some((a) => a.id === "fresh"));
    expect(push?.snapshot?.agents.find((a) => a.id === "fresh")?.scope).toBe("user");
  });

  it("does not re-broadcast when the snapshot is unchanged (diff guard)", async () => {
    writeAgent(userAgentsDir, "alpha.md", { name: "alpha", description: "A" });
    watchAgents();
    await settle();
    // Re-write byte-identical content → snapshot unchanged → no push.
    writeAgent(userAgentsDir, "alpha.md", { name: "alpha", description: "A" });
    await new Promise((r) => setTimeout(r, 400)); // past the 150ms debounce
    expect(changedPushes().length).toBe(0);
  });
});
