import { Search } from 'lucide-react';
import { useState } from 'react';

import { Input } from '@/components/_ui/Input';
import type { AgentScope, AgentSummary } from '@/lib/types';

import { AgentList } from '../AgentList/AgentList';
import { AgentsEmpty } from './AgentsEmpty/AgentsEmpty';
import { AgentTabs } from './AgentTabs/AgentTabs';
import { NewAgentButton } from './NewAgentButton/NewAgentButton';
import { agentsForScope, filterAgents, scopeCounts } from './utils';

export type AgentsZoneProps = {
  agents: AgentSummary[];
  scope: AgentScope;
  onScopeChange: (scope: AgentScope) => void;
  selectedId: string | null;
  onSelect: (a: AgentSummary) => void;
  onAgentAction: (action: string, agentName: string) => void;
  onNewAgent: () => void;
};

/**
 * The redesigned Agents zone: Project / User / Plugin segmented tabs (each with
 * a count), a name+description filter, a scrollable list of rich agent rows, and
 * a "New agent" footer. Switching tabs clears the filter (mock behavior).
 */
export function AgentsZone({
  agents,
  scope,
  onScopeChange,
  selectedId,
  onSelect,
  onAgentAction,
  onNewAgent,
}: AgentsZoneProps) {
  const [query, setQuery] = useState('');
  const counts = scopeCounts(agents);
  const scoped = agentsForScope(agents, scope);
  const visible = filterAgents(scoped, query);

  const switchScope = (next: AgentScope) => {
    setQuery('');
    onScopeChange(next);
  };

  return (
    <div className="flex flex-col min-h-0">
      <div className="px-3 pb-2">
        <AgentTabs value={scope} counts={counts} onChange={switchScope} />
      </div>

      <div className="px-3 pb-2.5">
        <Input
          size="sm"
          placeholder="Filter agents…"
          leadingIcon={<Search size={13} />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Filter agents"
        />
      </div>

      <div className="flex-1 overflow-y-auto pt-0.5">
        {visible.length > 0 ? (
          <AgentList
            agents={visible}
            selectedId={selectedId}
            onSelect={onSelect}
            onAgentAction={onAgentAction}
          />
        ) : (
          <AgentsEmpty scope={scope} filtered={scoped.length > 0} />
        )}
      </div>

      <NewAgentButton onClick={onNewAgent} />
    </div>
  );
}
