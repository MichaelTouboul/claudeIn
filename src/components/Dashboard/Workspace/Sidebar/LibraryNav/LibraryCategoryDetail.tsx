import type { AgentScope, AgentSummary, HookConfig, McpServerEntry, SkillSummary } from '@/lib/types';
import { LibraryCategory } from '@/store/dashboard/useDashboardUIStore';

import { AgentsZone } from '../AgentsZone/AgentsZone';
import { HookRow } from '../HookRow/HookRow';
import { McpRow } from '../McpRow/McpRow';
import { SkillRow } from '../SkillRow/SkillRow';

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
 * The drilled-in list for one library category. Reuses the EXACT components the
 * old PanelsArea rendered (AgentsZone/AgentList, SkillRow, HookRow) plus the new
 * McpRow, so nothing reachable before the switch is lost. Empty states are kept
 * minimal here — the polished detail panes come in a later phase.
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
      <div className="pt-1">
        {skills.length > 0 ? (
          skills.map((s) => (
            <SkillRow
              key={s.filePath}
              skill={s}
              selected={selectedSkillPath === s.filePath}
              onSelect={onSelectSkill}
            />
          ))
        ) : (
          <EmptyHint label="No skills" />
        )}
      </div>
    );
  }

  if (category === LibraryCategory.Hooks) {
    return (
      <div className="pt-1">
        {hooks.length > 0 ? (
          hooks.map((h) => <HookRow key={`${h.event}:${h.matcher}`} hook={h} />)
        ) : (
          <EmptyHint label="No hooks" />
        )}
      </div>
    );
  }

  return (
    <div className="pt-1">
      {mcp.length > 0 ? (
        mcp.map((server) => <McpRow key={`${server.scope}:${server.name}`} server={server} />)
      ) : (
        <EmptyHint label="No MCP servers" />
      )}
    </div>
  );
}

function EmptyHint({ label }: { label: string }) {
  return (
    <p className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
      {label}
    </p>
  );
}
