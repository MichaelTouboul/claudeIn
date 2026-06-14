import type { SkillSummary } from "../../types/skills-mirror.types";

/**
 * Pure union + shadowing for the skills mirror.
 *
 * No filesystem, no Electron imports — unit-testable in isolation (mirrors the
 * `agents.union.ts` split).
 *
 * Semantics (mirrors Claude Code's documented behavior):
 * - Skills are keyed by `name` (frontmatter `name` || dir name).
 * - On a name collision between a user skill and a project skill, the PROJECT
 *   skill is the active one (`shadowed: false`); the user skill is KEPT in the
 *   list marked `shadowed: true` (the UI decides whether to dim it).
 * - No collision → every skill is active (`shadowed: false`).
 * - Inputs are never mutated: fresh summary objects are returned.
 * - Stable order (locked): project group first, then user group; within each
 *   group sorted by `name` ascending (`localeCompare`). Keeps the broadcast diff
 *   stable regardless of filesystem read order.
 */
export function unionSkills(
  userSkills: SkillSummary[],
  projectSkills: SkillSummary[],
): SkillSummary[] {
  const projectNames = new Set(projectSkills.map((s) => s.name));

  const project = projectSkills
    .map((skill) => ({ ...skill, shadowed: false }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const user = userSkills
    .map((skill) => ({ ...skill, shadowed: projectNames.has(skill.name) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return [...project, ...user];
}
