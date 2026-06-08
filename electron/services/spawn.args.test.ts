// @vitest-environment node
import { describe, expect, it } from "vitest";

import { ALLOWED_MODELS, buildSpawnArgs } from "./spawn.args";

describe("buildSpawnArgs", () => {
  it("always emits the base --print stream flags and ends with the mission", () => {
    const args = buildSpawnArgs({ agentName: "_main", mission: "do it" });
    expect(args[0]).toBe("--print");
    expect(args).toContain("--output-format");
    expect(args).toContain("stream-json");
    expect(args[args.length - 1]).toBe("do it");
  });

  it("adds --agent for a real agent name (fresh spawn)", () => {
    const args = buildSpawnArgs({ agentName: "code-reviewer", mission: "go" });
    const i = args.indexOf("--agent");
    expect(i).toBeGreaterThan(-1);
    expect(args[i + 1]).toBe("code-reviewer");
  });

  it("omits --agent for the _main pseudo-agent", () => {
    const args = buildSpawnArgs({ agentName: "_main", mission: "go" });
    expect(args).not.toContain("--agent");
  });

  it("uses --resume instead of --agent when resuming", () => {
    const args = buildSpawnArgs({ agentName: "code-reviewer", mission: "go", resumeSessionId: "sess-1" });
    expect(args).not.toContain("--agent");
    const i = args.indexOf("--resume");
    expect(i).toBeGreaterThan(-1);
    expect(args[i + 1]).toBe("sess-1");
  });

  it("pushes --model <id> before the final mission arg when a model is provided", () => {
    const args = buildSpawnArgs({ agentName: "_main", mission: "go", model: "claude-opus-4-8" });
    const i = args.indexOf("--model");
    expect(i).toBeGreaterThan(-1);
    expect(args[i + 1]).toBe("claude-opus-4-8");
    // model flag must precede the trailing mission argument
    expect(i + 1).toBeLessThan(args.length - 1);
    expect(args[args.length - 1]).toBe("go");
  });

  it("omits --model entirely when no model is provided (claude default)", () => {
    const args = buildSpawnArgs({ agentName: "_main", mission: "go" });
    expect(args).not.toContain("--model");
  });

  it("threads --model alongside --resume", () => {
    const args = buildSpawnArgs({
      agentName: "_main",
      mission: "go",
      resumeSessionId: "sess-1",
      model: "claude-sonnet-4-6",
    });
    expect(args).toContain("--resume");
    const i = args.indexOf("--model");
    expect(args[i + 1]).toBe("claude-sonnet-4-6");
  });

  it("accepts every allowlisted model id", () => {
    for (const id of ALLOWED_MODELS) {
      const args = buildSpawnArgs({ agentName: "_main", mission: "go", model: id });
      const i = args.indexOf("--model");
      expect(args[i + 1]).toBe(id);
    }
  });

  it("drops a model id that is NOT on the allowlist (no --model forwarded)", () => {
    const args = buildSpawnArgs({ agentName: "_main", mission: "go", model: "evil; rm -rf /" });
    expect(args).not.toContain("--model");
    expect(args[args.length - 1]).toBe("go");
  });

  it("drops an empty model string", () => {
    const args = buildSpawnArgs({ agentName: "_main", mission: "go", model: "" });
    expect(args).not.toContain("--model");
  });
});
