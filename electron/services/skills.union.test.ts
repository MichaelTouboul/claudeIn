// @vitest-environment node
import { describe, expect, it } from "vitest";

import { unionSkills } from "./skills.union";
import type { SkillSummary } from "../types/skills-mirror.types";

function summary(name: string, scope: SkillSummary["scope"]): SkillSummary {
  return {
    name,
    description: `${name} desc`,
    scope,
    filePath: `/fake/${scope}/${name}/SKILL.md`,
    lineCount: 1,
    shadowed: false,
  };
}

describe("unionSkills", () => {
  it("no collision → every skill active (shadowed:false), all present", () => {
    const result = unionSkills([summary("alpha", "user")], [summary("beta", "project")]);
    expect(result.map((s) => s.name)).toEqual(["beta", "alpha"]); // project group first, then user
    expect(result.every((s) => s.shadowed === false)).toBe(true);
  });

  it("name collision → project wins (active), user kept but shadowed:true", () => {
    const result = unionSkills([summary("dup", "user")], [summary("dup", "project")]);
    const proj = result.find((s) => s.scope === "project" && s.name === "dup");
    const usr = result.find((s) => s.scope === "user" && s.name === "dup");
    expect(proj?.shadowed).toBe(false);
    expect(usr?.shadowed).toBe(true); // shadowed user skill stays in the list
    expect(result).toHaveLength(2); // both kept, none dropped
  });

  it("stable order: project group first then user group, each sorted by name ascending", () => {
    const result = unionSkills(
      [summary("zeta", "user"), summary("alpha", "user")],
      [summary("yankee", "project"), summary("bravo", "project")],
    );
    expect(result.map((s) => `${s.scope}:${s.name}`)).toEqual([
      "project:bravo",
      "project:yankee",
      "user:alpha",
      "user:zeta",
    ]);
  });

  it("empty inputs → empty output", () => {
    expect(unionSkills([], [])).toEqual([]);
  });

  it("does not mutate its inputs (returns fresh summaries with shadowed set)", () => {
    const user = [summary("dup", "user")];
    unionSkills(user, [summary("dup", "project")]);
    expect(user[0].shadowed).toBe(false); // original untouched
  });
});
