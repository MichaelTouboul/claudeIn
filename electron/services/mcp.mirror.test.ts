// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

// Mock broadcast up front so it's in place for the Phase 3 watch tests too.
vi.mock("./broadcast", () => ({ broadcast: vi.fn() }));

import { getMcp, unwatchMcp } from "./mcp.mirror";

let tmpHome: string;
let prevHome: string | undefined;
let userClaudeDir: string;

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

beforeEach(() => {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "cam-mcp-"));
  prevHome = process.env.HOME;
  process.env.HOME = tmpHome;
  userClaudeDir = path.join(tmpHome, ".claude");
  fs.mkdirSync(userClaudeDir, { recursive: true });
});

afterEach(() => {
  unwatchMcp(); // tear down any watchers/timers a test started
  process.env.HOME = prevHome;
  fs.rmSync(tmpHome, { recursive: true, force: true });
});

describe("mcp.mirror getMcp — source reads", () => {
  it("reads ~/.claude/settings.json mcpServers as the user-settings source", () => {
    writeJson(path.join(userClaudeDir, "settings.json"), {
      mcpServers: { fromUserSettings: { command: "node", args: ["s.js"] } },
    });
    const snap = getMcp();
    expect(snap.projectPath).toBeNull();
    const s = snap.servers.find((x) => x.name === "fromUserSettings");
    expect(s).toMatchObject({ source: "user-settings", scope: "user", transport: "stdio", target: "node" });
    // Heavy detail (args/env) is NOT in the snapshot.
    expect(s).not.toHaveProperty("args");
  });

  it("pulls ONLY mcpServers/projects from a large ~/.claude.json (ignores the bulk)", () => {
    const bulkHistory = Array.from({ length: 500 }, (_, i) => ({ d: `entry ${i}` }));
    writeJson(path.join(tmpHome, ".claude.json"), {
      numStartups: 42,
      history: bulkHistory, // ~the kind of payload that bloats the real file
      mcpServers: { globalHttp: { url: "https://x/mcp", type: "http" } },
      projects: { "/some/other/proj": { mcpServers: { strayProject: { command: "x" } } } },
    });
    const snap = getMcp();
    const names = snap.servers.map((s) => s.name);
    expect(names).toContain("globalHttp");
    // No projectPath given → the per-project store is not merged in.
    expect(names).not.toContain("strayProject");
    const g = snap.servers.find((s) => s.name === "globalHttp");
    expect(g).toMatchObject({ source: "user-global", transport: "http", target: "https://x/mcp" });
    expect(JSON.stringify(snap)).not.toContain("entry 0"); // bulk never enters the snapshot
  });

  it("merges projects[projectPath].mcpServers from ~/.claude.json under user-global", () => {
    const projDir = fs.mkdtempSync(path.join(os.tmpdir(), "cam-mcp-proj-"));
    writeJson(path.join(tmpHome, ".claude.json"), {
      mcpServers: { globalOne: { command: "g" } },
      projects: { [projDir]: { mcpServers: { localToProject: { command: "lp" } } } },
    });
    const snap = getMcp(projDir);
    const local = snap.servers.find((s) => s.name === "localToProject");
    expect(local).toMatchObject({ source: "user-global", target: "lp" });
    fs.rmSync(projDir, { recursive: true, force: true });
  });

  it("reads <project>/.mcp.json (both wrapped and bare top-level map)", () => {
    const projWrapped = fs.mkdtempSync(path.join(os.tmpdir(), "cam-mcp-pw-"));
    writeJson(path.join(projWrapped, ".mcp.json"), {
      mcpServers: { wrapped: { url: "https://w/sse", type: "sse" } },
    });
    expect(getMcp(projWrapped).servers.find((s) => s.name === "wrapped")).toMatchObject({
      source: "project-mcp-json",
      scope: "project",
      transport: "sse",
    });
    fs.rmSync(projWrapped, { recursive: true, force: true });

    const projBare = fs.mkdtempSync(path.join(os.tmpdir(), "cam-mcp-pb-"));
    writeJson(path.join(projBare, ".mcp.json"), { bare: { command: "b" } });
    expect(getMcp(projBare).servers.find((s) => s.name === "bare")).toMatchObject({
      source: "project-mcp-json",
      target: "b",
    });
    fs.rmSync(projBare, { recursive: true, force: true });
  });

  it("reads <project>/.claude/settings.json mcpServers as project-settings", () => {
    const projDir = fs.mkdtempSync(path.join(os.tmpdir(), "cam-mcp-ps-"));
    writeJson(path.join(projDir, ".claude", "settings.json"), {
      mcpServers: { projSettingsSrv: { command: "p" } },
    });
    expect(getMcp(projDir).servers.find((s) => s.name === "projSettingsSrv")).toMatchObject({
      source: "project-settings",
      scope: "project",
    });
    fs.rmSync(projDir, { recursive: true, force: true });
  });

  it("ignores missing and invalid-JSON sources without throwing", () => {
    fs.writeFileSync(path.join(userClaudeDir, "settings.json"), "{ not valid json ");
    // ~/.claude.json absent entirely.
    expect(() => getMcp()).not.toThrow();
    expect(getMcp().servers).toEqual([]);
  });

  it("project-settings shadows user-settings on a name collision (project wins)", () => {
    const projDir = fs.mkdtempSync(path.join(os.tmpdir(), "cam-mcp-shadow-"));
    writeJson(path.join(userClaudeDir, "settings.json"), {
      mcpServers: { dup: { command: "user-cmd" }, onlyUser: { command: "u" } },
    });
    writeJson(path.join(projDir, ".claude", "settings.json"), {
      mcpServers: { dup: { command: "proj-cmd" } },
    });
    const snap = getMcp(projDir);
    const userDup = snap.servers.find((s) => s.source === "user-settings" && s.name === "dup");
    const projDup = snap.servers.find((s) => s.source === "project-settings" && s.name === "dup");
    expect(userDup?.shadowed).toBe(true);
    expect(projDup?.shadowed).toBe(false);
    expect(projDup?.target).toBe("proj-cmd");
    expect(snap.servers.find((s) => s.name === "onlyUser")?.shadowed).toBe(false);
    fs.rmSync(projDir, { recursive: true, force: true });
  });

  it("user-only scope (no projectPath) contributes no project sources", () => {
    writeJson(path.join(userClaudeDir, "settings.json"), { mcpServers: { u: { command: "u" } } });
    const snap = getMcp();
    expect(snap.servers.every((s) => s.scope === "user")).toBe(true);
  });
});
