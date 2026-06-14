import type { AgentSummary } from "../../types/agents-mirror.types";

/**
 * Pure union + shadowing for the agents mirror.
 *
 * No filesystem, no Electron imports — unit-testable in isolation (mirrors the
 * `settings.merge.ts` split).
 *
 * Semantics (mirrors Claude Code's documented behavior):
 * - Agents are keyed by `id` (frontmatter `name`).
 * - On a name collision between a user agent and a project agent, the PROJECT
 *   agent is the active one (`shadowed: false`); the user agent is KEPT in the
 *   list marked `shadowed: true` (the UI decides whether to dim it).
 * - No collision → every agent is active (`shadowed: false`).
 * - Inputs are never mutated: fresh summary objects are returned.
 * - Stable order (locked): project group first, then user group; within each
 *   group sorted by `id` ascending (`localeCompare`). Keeps the broadcast diff
 *   stable regardless of filesystem read order.
 */
export function unionAgents(
  userAgents: AgentSummary[],
  projectAgents: AgentSummary[],
): AgentSummary[] {
  const projectIds = new Set(projectAgents.map((a) => a.id));

  const project = projectAgents
    .map((agent) => ({ ...agent, shadowed: false }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const user = userAgents
    .map((agent) => ({ ...agent, shadowed: projectIds.has(agent.id) }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return [...project, ...user];
}
