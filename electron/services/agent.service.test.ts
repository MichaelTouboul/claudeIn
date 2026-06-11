// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

import { getAgentByPath } from "./agent.service";

/**
 * Regression coverage for the agent-management view bug: clicking a PROJECT-scope
 * agent (visible in the sidebar via the mirror) must resolve its full content in
 * the management view. The legacy `getAgent(name)` only scanned
 * `~/.claude/agents`, so project agents resolved to null → "Agent not found".
 *
 * `getAgentByPath` resolves an agent from the absolute file path carried by the
 * mirror summary, so it works for BOTH user and project scopes.
 */

let tmpHome: string;
let prevHome: string | undefined;
let projectDir: string;

function writeAgent(dir: string, fileName: string, name: string, body: string): string {
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${fileName}.md`);
  fs.writeFileSync(filePath, `---\nname: ${name}\ndescription: ${name} desc\n---\n${body}\n`, "utf-8");
  return filePath;
}

beforeEach(() => {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "cam-agent-svc-"));
  prevHome = process.env.HOME;
  process.env.HOME = tmpHome;
  projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "cam-agent-proj-"));
});

afterEach(() => {
  process.env.HOME = prevHome;
  fs.rmSync(tmpHome, { recursive: true, force: true });
  fs.rmSync(projectDir, { recursive: true, force: true });
});

describe("getAgentByPath", () => {
  it("resolves a USER-scope agent from its absolute path", async () => {
    const filePath = writeAgent(
      path.join(tmpHome, ".claude", "agents"),
      "tw-user",
      "tw-user",
      "user agent body",
    );

    const agent = await getAgentByPath(filePath);
    expect(agent).not.toBeNull();
    expect(agent?.id).toBe("tw-user");
    expect(agent?.body).toBe("user agent body");
    expect(agent?.filePath).toBe(filePath);
  });

  it("resolves a PROJECT-scope agent from its absolute path (the bug)", async () => {
    // This agent lives in <projectDir>/.claude/agents, NOT in ~/.claude/agents.
    // The legacy getAgent(name) would never find it.
    const filePath = writeAgent(
      path.join(projectDir, ".claude", "agents"),
      "tw-repo",
      "tw-repo",
      "project agent body",
    );

    const agent = await getAgentByPath(filePath);
    expect(agent).not.toBeNull();
    expect(agent?.id).toBe("tw-repo");
    expect(agent?.body).toBe("project agent body");
    expect(agent?.filePath).toBe(filePath);
    // relativePath/folder resolved against the agent's OWN agents root.
    expect(agent?.relativePath).toBe("tw-repo.md");
    expect(agent?.folder).toBe("");
  });

  it("returns null for a missing or name-less file", async () => {
    expect(await getAgentByPath(path.join(projectDir, "nope.md"))).toBeNull();

    const nameless = path.join(projectDir, ".claude", "agents", "blank.md");
    fs.mkdirSync(path.dirname(nameless), { recursive: true });
    fs.writeFileSync(nameless, "---\ndescription: no name\n---\nbody", "utf-8");
    expect(await getAgentByPath(nameless)).toBeNull();
  });

  it("attaches memory files living next to a project agent", async () => {
    const agentsDir = path.join(projectDir, ".claude", "agents", "tw-mem");
    const filePath = writeAgent(agentsDir, "tw-mem", "tw-mem", "body");
    const memDir = path.join(agentsDir, "memory");
    fs.mkdirSync(memDir, { recursive: true });
    fs.writeFileSync(path.join(memDir, "NOTES.md"), "notes", "utf-8");

    const agent = await getAgentByPath(filePath);
    expect(agent?.memoryFiles.map((m) => m.name)).toContain("NOTES.md");
  });
});
