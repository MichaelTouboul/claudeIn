// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

import type { AgentsSnapshot } from "../../types/agents-mirror.types";
import type { SkillsSnapshot } from "../../types/skills-mirror.types";
import type { McpSnapshot } from "../../types/mcp-mirror.types";
import type { SettingsSnapshot } from "../../types/settings.types";

// Mock the mirror/settings services so fillUserProfile reads canned counts and
// never touches the real filesystem.
const getAgentsMock = vi.fn<() => AgentsSnapshot>();
const getSkillsMock = vi.fn<() => SkillsSnapshot>();
const getMcpMock = vi.fn<() => McpSnapshot>();
const getSettingsMock = vi.fn<() => SettingsSnapshot>();

vi.mock("../agents/agents.mirror", () => ({ getAgents: () => getAgentsMock() }));
vi.mock("../skills/skills.mirror", () => ({ getSkillsMirror: () => getSkillsMock() }));
vi.mock("../mcp/mcp.mirror", () => ({ getMcp: () => getMcpMock() }));
vi.mock("../settings/settings.service", () => ({ getSettings: () => getSettingsMock() }));

const search = await import("../search/user-search.service");

const agentSummary = (id: string): AgentsSnapshot["agents"][number] =>
  ({
    id,
    scope: "user",
    filePath: `/u/${id}.md`,
    relativePath: `${id}.md`,
    folder: "",
    frontmatter: { name: id },
    subAgents: [],
    shadowed: false,
  }) as unknown as AgentsSnapshot["agents"][number];

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cam-usersearch-"));
  process.env.HOME = tmp;
  getAgentsMock.mockReset();
  getSkillsMock.mockReset();
  getMcpMock.mockReset();
  getSettingsMock.mockReset();
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("locateClaudeUser", () => {
  it("returns $HOME/.claude when it exists", () => {
    fs.mkdirSync(path.join(tmp, ".claude"), { recursive: true });
    expect(search.locateClaudeUser()).toBe(path.join(tmp, ".claude"));
  });

  it("returns null when no candidate exists", () => {
    expect(search.locateClaudeUser()).toBeNull();
  });
});

describe("fillUserProfile", () => {
  it("counts capabilities via the mirror services and narrates via the runner seam", async () => {
    const claudePath = path.join(tmp, ".claude");
    fs.mkdirSync(claudePath, { recursive: true });

    getAgentsMock.mockReturnValue({
      projectPath: null,
      agents: [agentSummary("alpha"), agentSummary("beta")],
    });
    getSkillsMock.mockReturnValue({
      projectPath: null,
      skills: [{ name: "s1" }, { name: "s2" }, { name: "s3" }] as SkillsSnapshot["skills"],
    });
    getMcpMock.mockReturnValue({
      projectPath: null,
      servers: [{ name: "m1" }] as McpSnapshot["servers"],
    });
    getSettingsMock.mockReturnValue({
      projectPath: null,
      layers: [],
      effective: { hooks: { PreToolUse: [1], PostToolUse: [1] } },
      provenance: {},
    } as unknown as SettingsSnapshot);

    const calls: { cwd: string; prompt: string }[] = [];
    search.setUserSearchRunner(async ({ cwd, prompt }) => {
      calls.push({ cwd, prompt });
      return JSON.stringify({
        name: "Ada Lovelace",
        role: "Backend engineer at Tastewise",
        summary: "A focused backend setup.",
        domains: ["backend", "infra"],
        workflow: "tdd",
      });
    });

    const profile = await search.fillUserProfile(claudePath);

    expect(profile.claudeUserPath).toBe(claudePath);
    expect(profile.name).toBe("Ada Lovelace");
    expect(profile.role).toBe("Backend engineer at Tastewise");
    expect(profile.capabilities).toEqual({
      agents: { count: 2, names: ["alpha", "beta"] },
      skills: 3,
      mcp: 1,
      hooks: 2,
    });
    expect(profile.summary).toBe("A focused backend setup.");
    expect(profile.domains).toEqual(["backend", "infra"]);
    expect(profile.workflow).toBe("tdd");
    expect(profile.generatedAt).toBeTruthy();

    expect(calls).toHaveLength(1);
    expect(calls[0].cwd).toBe(claudePath);
    expect(calls[0].prompt).toContain(".claude");
    // the prompt now asks for identity fields too
    expect(calls[0].prompt).toContain("name");
    expect(calls[0].prompt).toContain("role");
  });

  it("tolerates non-JSON narrative output (summary = raw text, empty domains)", async () => {
    const claudePath = path.join(tmp, ".claude");
    fs.mkdirSync(claudePath, { recursive: true });

    getAgentsMock.mockReturnValue({ projectPath: null, agents: [] });
    getSkillsMock.mockReturnValue({ projectPath: null, skills: [] });
    getMcpMock.mockReturnValue({ projectPath: null, servers: [] });
    getSettingsMock.mockReturnValue({
      projectPath: null,
      layers: [],
      effective: {},
      provenance: {},
    } as unknown as SettingsSnapshot);

    search.setUserSearchRunner(async () => "just a plain narrative");

    const profile = await search.fillUserProfile(claudePath);
    expect(profile.summary).toBe("just a plain narrative");
    expect(profile.name).toBeNull();
    expect(profile.role).toBeNull();
    expect(profile.domains).toEqual([]);
    expect(profile.workflow).toBeNull();
    expect(profile.capabilities.hooks).toBe(0);
  });
});
