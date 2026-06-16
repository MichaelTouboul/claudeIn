import type { AgentScope, AgentSummary, HookConfig, McpServerEntry, SkillSummary } from '@/lib/types';
import { LibraryCategory } from '@/store/dashboard/useDashboardUIStore';

import { AgentsZone } from '../AgentsZone/AgentsZone';
import { HooksZone } from '../HooksZone/HooksZone';
import { McpZone } from '../McpZone/McpZone';
import { SkillsZone } from '../SkillsZone/SkillsZone';

export type LibraryCategoryDetailProps = {
  category: LibraryCategory;
  agents: AgentSummary[];
  skills: SkillSummary[];
  hooks: HookConfig[];
  mcp: McpServerEntry[];
  selectedAgentId: string | null;
  selectedSkillPath: string | null;
  scopeTab: AgentScope;
  onScopeChange: (scope: AgentScope) => void;
  onSelectAgent: (a: AgentSummary) => void;
  onSelectSkill: (s: SkillSummary) => void;
  onAgentAction: (action: string, agentName: string) => void;
  onNewAgent: () => void;
};

/**
 * The drilled-in list for one library category (LEVEL 1 of the drill-down). Each
 * category follows the SAME grammar — a filter input above redesigned, scope-
 * tinted rows with a per-item More menu — via its own Zone component.
 *
 * Routing note: the spec (library-drilldown.html) draws the item *detail* in
 * this sidebar column; we deliberately route "open" to a CENTER tab instead
 * (richer editor, owned by a parallel task) — the sidebar stays the browser.
 * `onSelectAgent`/`onSelectSkill` are the `addTab` callbacks wired in LibraryNav.
 */
export function LibraryCategoryDetail({
  category,
  agents,
  skills,
  hooks,
  mcp,
  selectedAgentId,
  selectedSkillPath,
  scopeTab,
  onScopeChange,
  onSelectAgent,
  onSelectSkill,
  onAgentAction,
  onNewAgent,
}: LibraryCategoryDetailProps) {
  if (category === LibraryCategory.Agents) {
    return (
      <AgentsZone
        agents={agents}
        scope={scopeTab}
        onScopeChange={onScopeChange}
        selectedId={selectedAgentId}
        onSelect={onSelectAgent}
        onAgentAction={onAgentAction}
        onNewAgent={onNewAgent}
      />
    );
  }

  if (category === LibraryCategory.Skills) {
    return (
      <SkillsZone skills={skills} selectedSkillPath={selectedSkillPath} onSelectSkill={onSelectSkill} />
    );
  }

  if (category === LibraryCategory.Hooks) {
    return <HooksZone hooks={hooks} />;
  }

  return <McpZone mcp={mcp} />;
}
