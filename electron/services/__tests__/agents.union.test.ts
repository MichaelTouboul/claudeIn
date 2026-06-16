// @vitest-environment node
import { describe, expect, it } from "vitest";

import { unionAgents } from "../agents/agents.union";
import type { AgentSummary } from "../../types/agents-mirror.types";

function summary(id: string, scope: AgentSummary["scope"]): AgentSummary {
  return {
    id,
    scope,
    filePath: `/fake/${scope}/${id}.md`,
    relativePath: `${id}.md`,
    folder: "",
    frontmatter: { name: id, description: `${id} desc` },
    subAgents: [],
    shadowed: false,
    source: scope === "plugin" ? "some-pack" : null,
  };
}

describe("unionAgents", () => {
  it("no collision → every agent active (shadowed:false), all present", () => {
    const result = unionAgents([summary("alpha", "user")], [summary("beta", "project")]);
    expect(result.map((a) => a.id)).toEqual(["beta", "alpha"]); // project group first, then user
    expect(result.every((a) => a.shadowed === false)).toBe(true);
  });

  it("name collision → project wins (active), user kept but shadowed:true", () => {
    const result = unionAgents([summary("dup", "user")], [summary("dup", "project")]);
    const proj = result.find((a) => a.scope === "project" && a.id === "dup");
    const usr = result.find((a) => a.scope === "user" && a.id === "dup");
    expect(proj?.shadowed).toBe(false);
    expect(usr?.shadowed).toBe(true); // shadowed user agent stays in the list
    expect(result).toHaveLength(2); // both kept, none dropped
  });

  it("stable order: project group first then user group, each sorted by id ascending", () => {
    const result = unionAgents(
      [summary("zeta", "user"), summary("alpha", "user")],
      [summary("yankee", "project"), summary("bravo", "project")],
    );
    expect(result.map((a) => `${a.scope}:${a.id}`)).toEqual([
      "project:bravo",
      "project:yankee",
      "user:alpha",
      "user:zeta",
    ]);
  });

  it("empty inputs → empty output", () => {
    expect(unionAgents([], [])).toEqual([]);
  });

  it("plugin agents are appended after project + user, sorted by id, never shadowed", () => {
    const result = unionAgents(
      [summary("alpha", "user")],
      [summary("beta", "project")],
      [summary("zulu", "plugin"), summary("kilo", "plugin")],
    );
    expect(result.map((a) => `${a.scope}:${a.id}`)).toEqual([
      "project:beta",
      "user:alpha",
      "plugin:kilo",
      "plugin:zulu",
    ]);
    expect(result.filter((a) => a.scope === "plugin").every((a) => a.shadowed === false)).toBe(true);
  });

  it("a plugin agent sharing a name with a project agent does NOT shadow it (separate scope)", () => {
    const result = unionAgents(
      [],
      [summary("dup", "project")],
      [summary("dup", "plugin")],
    );
    expect(result.find((a) => a.scope === "plugin" && a.id === "dup")?.shadowed).toBe(false);
    expect(result.find((a) => a.scope === "project" && a.id === "dup")?.shadowed).toBe(false);
  });

  it("does not mutate its inputs (returns fresh summaries with shadowed set)", () => {
    const user = [summary("dup", "user")];
    unionAgents(user, [summary("dup", "project")]);
    expect(user[0].shadowed).toBe(false); // original untouched
  });
});
