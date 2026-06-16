// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

import { scanPluginAgents } from "../agents/plugin-agents";

let tmpHome: string;
let prevHome: string | undefined;

beforeEach(() => {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "cam-plugins-"));
  prevHome = process.env.HOME;
  process.env.HOME = tmpHome;
});

afterEach(() => {
  process.env.HOME = prevHome;
  fs.rmSync(tmpHome, { recursive: true, force: true });
});

function writeAgent(dir: string, file: string, frontmatter: Record<string, unknown>, body = "x") {
  fs.mkdirSync(dir, { recursive: true });
  const fm = Object.entries(frontmatter)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join("\n");
  fs.writeFileSync(path.join(dir, file), `---\n${fm}\n---\n${body}\n`);
}

/** Lay down a plugins registry + one installed plugin pack carrying agents. */
function installPlugin(opts: {
  key: string;
  installPath: string;
  packName?: string;
  agents?: { file: string; fm: Record<string, unknown> }[];
}) {
  const pluginsDir = path.join(tmpHome, ".claude", "plugins");
  fs.mkdirSync(pluginsDir, { recursive: true });
  const registryPath = path.join(pluginsDir, "installed_plugins.json");
  const registry = fs.existsSync(registryPath)
    ? JSON.parse(fs.readFileSync(registryPath, "utf-8"))
    : { version: 2, plugins: {} };
  registry.plugins[opts.key] = [{ scope: "user", installPath: opts.installPath }];
  fs.writeFileSync(registryPath, JSON.stringify(registry));

  fs.mkdirSync(opts.installPath, { recursive: true });
  if (opts.packName) {
    fs.writeFileSync(
      path.join(opts.installPath, "plugin.json"),
      JSON.stringify({ name: opts.packName }),
    );
  }
  for (const a of opts.agents ?? []) {
    writeAgent(path.join(opts.installPath, "agents"), a.file, a.fm);
  }
}

describe("scanPluginAgents", () => {
  it("reads agents shipped inside installed plugins, tagging scope=plugin + source=pack", () => {
    const installPath = path.join(tmpHome, ".claude", "plugins", "cache", "mp", "quality", "1.0.0");
    installPlugin({
      key: "quality-pack@mp",
      installPath,
      packName: "quality-pack",
      agents: [{ file: "code-reviewer.md", fm: { name: "code-reviewer", description: "Reviews PRs", color: "green" } }],
    });

    const agents = scanPluginAgents();
    const cr = agents.find((a) => a.id === "code-reviewer");
    expect(cr).toBeDefined();
    expect(cr?.scope).toBe("plugin");
    expect(cr?.source).toBe("quality-pack");
    expect(cr?.frontmatter.description).toBe("Reviews PRs");
    expect(cr?.shadowed).toBe(false);
  });

  it("derives the source from the install key when plugin.json has no name", () => {
    const installPath = path.join(tmpHome, ".claude", "plugins", "cache", "mp", "github", "1.0.0");
    installPlugin({
      key: "github-pack@market",
      installPath,
      agents: [{ file: "pr.md", fm: { name: "pr-summarizer", description: "Summarizes PRs" } }],
    });

    const agents = scanPluginAgents();
    expect(agents.find((a) => a.id === "pr-summarizer")?.source).toBe("github-pack");
  });

  it("skips plugins without an agents/ dir and never throws", () => {
    const installPath = path.join(tmpHome, ".claude", "plugins", "cache", "mp", "noagents", "1.0.0");
    installPlugin({ key: "noagents@mp", installPath, packName: "noagents" });
    expect(() => scanPluginAgents()).not.toThrow();
    expect(scanPluginAgents()).toEqual([]);
  });

  it("missing plugins registry → empty list, never throws", () => {
    expect(() => scanPluginAgents()).not.toThrow();
    expect(scanPluginAgents()).toEqual([]);
  });

  it("skips agent files lacking a frontmatter name", () => {
    const installPath = path.join(tmpHome, ".claude", "plugins", "cache", "mp", "p", "1.0.0");
    installPlugin({
      key: "p@mp",
      installPath,
      packName: "p",
      agents: [{ file: "nameless.md", fm: { description: "no name" } }],
    });
    expect(scanPluginAgents()).toEqual([]);
  });
});
