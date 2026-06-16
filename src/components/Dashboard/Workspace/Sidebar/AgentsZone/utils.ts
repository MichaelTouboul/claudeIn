import { AgentScope, type AgentSummary } from '@/lib/types';

/** Agents for a scope, hiding the user copy that a project agent shadows. */
export function agentsForScope(agents: AgentSummary[], scope: AgentScope): AgentSummary[] {
  return agents.filter((a) => a.scope === scope && !a.shadowed);
}

/** Per-scope counts for the tab labels (shadowed user agents excluded). */
export function scopeCounts(agents: AgentSummary[]): Record<AgentScope, number> {
  return {
    [AgentScope.Project]: agentsForScope(agents, AgentScope.Project).length,
    [AgentScope.User]: agentsForScope(agents, AgentScope.User).length,
    [AgentScope.Plugin]: agentsForScope(agents, AgentScope.Plugin).length,
  };
}

/** Narrow a list by a case-insensitive substring of the name or description. */
export function filterAgents(agents: AgentSummary[], query: string): AgentSummary[] {
  const q = query.trim().toLowerCase();
  if (!q) return agents;
  return agents.filter(
    (a) =>
      a.id.toLowerCase().includes(q) ||
      (a.frontmatter.description ?? '').toLowerCase().includes(q),
  );
}
