// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

// Mock broadcast now so it's in place for the watch test too.
vi.mock("./broadcast", () => ({ broadcast: vi.fn() }));

import { broadcast } from "./broadcast";
import { getMemory, unwatchMemory, watchMemory } from "./memory.mirror";
import type { MemorySnapshot } from "../types/memory-mirror.types";

const broadcastMock = vi.mocked(broadcast);

let tmpHome: string;
let prevHome: string | undefined;
let userClaudeDir: string;
let projDir: string;

/** Auto-memory dir for a project, matching the service's encoding. */
function autoMemoryDir(project: string): string {
  const encoded = project.replace(/\//g, "-").replace(/^-/, "");
  return path.join(tmpHome, ".claude", "projects", encoded, "memory");
}

beforeEach(() => {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "cam-mem-"));
  prevHome = process.env.HOME;
  process.env.HOME = tmpHome;
  userClaudeDir = path.join(tmpHome, ".claude");
  fs.mkdirSync(userClaudeDir, { recursive: true });
  projDir = fs.mkdtempSync(path.join(os.tmpdir(), "cam-mem-proj-"));
  broadcastMock.mockClear();
});

afterEach(() => {
  unwatchMemory(); // always tear down watchers/timers to avoid leaks
  process.env.HOME = prevHome;
  fs.rmSync(tmpHome, { recursive: true, force: true });
  fs.rmSync(projDir, { recursive: true, force: true });
});

function write(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

/** macOS recursive fs.watch can take a beat to arm — settle before mutating. */
function settle(ms = 150): Promise<void> {
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

interface MemoryChangedPush {
  type?: string;
  snapshot?: MemorySnapshot;
}

function changedPushes(): MemoryChangedPush[] {
  return broadcastMock.mock.calls
    .map(([d]) => d as MemoryChangedPush)
    .filter((d) => d.type === "memory_changed");
}

describe("memory.mirror getMemory", () => {
  it("detects user ~/.claude/CLAUDE.md with user scope/source and firstLine", () => {
    write(path.join(userClaudeDir, "CLAUDE.md"), "\n# User memory\nbody");
    const snap = getMemory();
    expect(snap.projectPath).toBeNull();
    const entry = snap.entries.find((e) => e.source === "user-claude-md");
    expect(entry?.scope).toBe("user");
    expect(entry?.firstLine).toBe("# User memory");
    expect(entry?.size).toBeGreaterThan(0);
    expect(entry).not.toHaveProperty("content");
  });

  it("detects project root + .claude CLAUDE.md as project-claude-md", () => {
    write(path.join(projDir, "CLAUDE.md"), "# Project root");
    write(path.join(projDir, ".claude", "CLAUDE.md"), "# Project dot-claude");
    const snap = getMemory(projDir);
    const project = snap.entries.filter((e) => e.source === "project-claude-md");
    expect(project.map((e) => e.firstLine).sort()).toEqual([
      "# Project dot-claude",
      "# Project root",
    ]);
    expect(project.every((e) => e.scope === "project")).toBe(true);
  });

  it("detects nested CLAUDE.md with nested source, excluding root and .claude", () => {
    write(path.join(projDir, "CLAUDE.md"), "# root");
    write(path.join(projDir, "src", "CLAUDE.md"), "# nested src");
    const snap = getMemory(projDir);
    const nested = snap.entries.filter((e) => e.source === "nested-claude-md");
    expect(nested).toHaveLength(1);
    expect(nested[0].firstLine).toBe("# nested src");
    expect(nested[0].path).toBe(path.join(projDir, "src", "CLAUDE.md"));
  });

  it("skips node_modules and dotdirs in the nested walk", () => {
    write(path.join(projDir, "node_modules", "pkg", "CLAUDE.md"), "# should be skipped");
    write(path.join(projDir, ".hidden", "CLAUDE.md"), "# also skipped");
    const snap = getMemory(projDir);
    expect(snap.entries.filter((e) => e.source === "nested-claude-md")).toHaveLength(0);
  });

  it("detects auto-memory *.md including MEMORY.md", () => {
    const memDir = autoMemoryDir(projDir);
    write(path.join(memDir, "MEMORY.md"), "# Index");
    write(path.join(memDir, "note.md"), "# Note");
    write(path.join(memDir, "ignore.txt"), "not markdown");
    const snap = getMemory(projDir);
    const auto = snap.entries.filter((e) => e.source === "auto-memory");
    expect(auto.map((e) => path.basename(e.path)).sort()).toEqual(["MEMORY.md", "note.md"]);
    expect(auto.every((e) => e.scope === "project")).toBe(true);
  });

  it("sets hasImports only when an @import line leads a line", () => {
    write(path.join(userClaudeDir, "CLAUDE.md"), "# Title\n@./shared.md");
    write(path.join(projDir, "CLAUDE.md"), "# Title\nemail user@example.com");
    const snap = getMemory(projDir);
    expect(snap.entries.find((e) => e.source === "user-claude-md")?.hasImports).toBe(true);
    expect(snap.entries.find((e) => e.source === "project-claude-md")?.hasImports).toBe(false);
  });

  it("skips missing files and never throws (no project)", () => {
    expect(() => getMemory()).not.toThrow();
    expect(getMemory().entries).toEqual([]);
  });

  it("orders entries user → project → nested → auto-memory", () => {
    write(path.join(userClaudeDir, "CLAUDE.md"), "# user");
    write(path.join(projDir, "CLAUDE.md"), "# project");
    write(path.join(projDir, "pkg", "CLAUDE.md"), "# nested");
    write(path.join(autoMemoryDir(projDir), "MEMORY.md"), "# auto");
    const sources = getMemory(projDir).entries.map((e) => e.source);
    expect(sources).toEqual([
      "user-claude-md",
      "project-claude-md",
      "nested-claude-md",
      "auto-memory",
    ]);
  });
});

describe("memory.mirror watchMemory", () => {
  it("broadcasts a recomputed snapshot when a watched CLAUDE.md changes", async () => {
    watchMemory(projDir);
    await settle();
    write(path.join(projDir, "CLAUDE.md"), "# fresh project memory");
    await waitFor(() =>
      changedPushes().some((d) =>
        d.snapshot?.entries.some((e) => e.firstLine === "# fresh project memory"),
      ),
    );
    const push = changedPushes().find((d) =>
      d.snapshot?.entries.some((e) => e.firstLine === "# fresh project memory"),
    );
    expect(
      push?.snapshot?.entries.find((e) => e.firstLine === "# fresh project memory")?.source,
    ).toBe("project-claude-md");
  });

  it("broadcasts when an auto-memory file changes (recursive watch)", async () => {
    const memDir = autoMemoryDir(projDir);
    fs.mkdirSync(memDir, { recursive: true });
    watchMemory(projDir);
    await settle();
    write(path.join(memDir, "MEMORY.md"), "# new auto entry");
    await waitFor(() =>
      changedPushes().some((d) =>
        d.snapshot?.entries.some((e) => e.source === "auto-memory" && e.firstLine === "# new auto entry"),
      ),
    );
  });

  it("does not re-broadcast when the snapshot is unchanged (diff guard)", async () => {
    write(path.join(projDir, "CLAUDE.md"), "# stable");
    watchMemory(projDir);
    await settle();
    // Re-write byte-identical content → snapshot unchanged → no push.
    write(path.join(projDir, "CLAUDE.md"), "# stable");
    await new Promise((r) => setTimeout(r, 400)); // past the 150ms debounce
    expect(changedPushes().length).toBe(0);
  });
});
