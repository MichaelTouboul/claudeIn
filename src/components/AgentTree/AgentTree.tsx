import { ChevronDown,ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/_ui/Button';
import type { AgentContext } from '@/hooks/useIPC';
import type { AgentFile } from '@/types/agent.types';

import { TreeNode } from './TreeNode/TreeNode';

export type AgentTreeProps = {
  agents: AgentFile[];
  activeAgents: Set<string>;
  agentContexts: Map<string, AgentContext>;
  currentTools?: Map<string, string>;
  selectedId: string | null;
  onSelect: (a: AgentFile) => void;
};

export function AgentTree({
  agents,
  activeAgents,
  agentContexts,
  currentTools,
  selectedId,
  onSelect,
}: AgentTreeProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const { orchestrators, standalones } = useMemo(() => {
    const agentIds = new Set(agents.map((a) => a.id));
    const subAgentIds = new Set<string>();
    for (const a of agents) {
      for (const sub of a.subAgents) {
        if (agentIds.has(sub)) subAgentIds.add(sub);
      }
    }
    return {
      orchestrators: agents.filter((a) => a.subAgents.length > 0),
      standalones: agents.filter((a) => a.subAgents.length === 0 && !subAgentIds.has(a.id)),
    };
  }, [agents]);

  const agentMap = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="h-full overflow-y-auto p-4" style={{ background: 'var(--color-surface-0)' }}>
      <h3
        className="mb-3 px-3"
        style={{
          fontSize: '10px',
          fontWeight: 600,
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          fontFamily: 'var(--font-mono)',
        }}
      >
        Agent Hierarchy
      </h3>

      <div className="space-y-0.5">
        {orchestrators.map((orch) => {
          const isCollapsed = collapsed.has(orch.id);
          const subs = orch.subAgents
            .map((id) => agentMap.get(id))
            .filter((a): a is AgentFile => !!a);

          return (
            <div key={orch.id}>
              <div className="flex items-center">
                <Button intent="ghost" size="icon" onClick={() => toggleCollapse(orch.id)}>
                  {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                </Button>
                <div className="flex-1 min-w-0">
                  <TreeNode
                    agent={orch}
                    depth={0}
                    isActive={activeAgents.has(orch.id)}
                    context={agentContexts.get(orch.id)}
                    currentTool={currentTools?.get(orch.id)}
                    selected={selectedId === orch.id}
                    onSelect={onSelect}
                  />
                </div>
              </div>

              {!isCollapsed && subs.length > 0 ? <div className="ml-3" style={{ borderLeft: '1px solid var(--color-border-subtle)' }}>
                  {subs.map((sub) => (
                    <TreeNode
                      key={sub.id}
                      agent={sub}
                      depth={1}
                      isActive={activeAgents.has(sub.id)}
                      context={agentContexts.get(sub.id)}
                      currentTool={currentTools?.get(sub.id)}
                      selected={selectedId === sub.id}
                      onSelect={onSelect}
                    />
                  ))}
                </div> : null}
            </div>
          );
        })}

        {standalones.length > 0 && orchestrators.length > 0 ? <div className="my-3" style={{ borderTop: '1px solid var(--color-border-subtle)' }} /> : null}

        {standalones.map((a) => (
          <TreeNode
            key={a.id}
            agent={a}
            depth={0}
            isActive={activeAgents.has(a.id)}
            context={agentContexts.get(a.id)}
            currentTool={currentTools?.get(a.id)}
            selected={selectedId === a.id}
            onSelect={onSelect}
          />
        ))}
      </div>

      {agents.length === 0 ? <p
          className="text-center py-12"
          style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
        >
          No agents found
        </p> : null}
    </div>
  );
}
