import { useEffect, useState } from 'react';

import { DetailStatus } from '@/components/_ui/DetailStatus';
import { api } from '@/services/api';
import type { AgentFile } from '@/types/agent.types';

import { AgentDetailContent } from './AgentDetailContent/AgentDetailContent';

export type AgentDetailProps = {
  agentId: string;
  /**
   * Absolute path of the agent file, from the sidebar mirror summary. Project
   * AND user agents carry one. When present we resolve by path
   * (`getAgentByPath`), which is scope-agnostic — the id-only `getAgent` only
   * scans `~/.claude/agents`, so a project agent would resolve to null
   * ("Agent not found"). Optional so id-only callers still work.
   */
  filePath?: string;
  onDelete: (name: string) => void;
  onAgentUpdated?: (agent: AgentFile) => void;
};

type LoadState = 'loading' | 'loaded' | 'not-found';

/**
 * Fetches the full agent on-demand and renders the detail once loaded. Prefers
 * the scope-agnostic `getAgentByPath` (so project-scope agents open correctly),
 * falling back to the id-based `getAgent` when no path is supplied. Re-fetches
 * when the agent changes. Loading / not-found states are surfaced inline.
 */
export function AgentDetail({ agentId, filePath, onDelete, onAgentUpdated }: AgentDetailProps) {
  const [agent, setAgent] = useState<AgentFile | null>(null);
  const [state, setState] = useState<LoadState>('loading');

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    setAgent(null);
    const lookup = filePath ? api.getAgentByPath(filePath) : api.getAgent(agentId);
    void lookup.then((result) => {
      if (cancelled) return;
      if (result) {
        setAgent(result);
        setState('loaded');
      } else {
        setState('not-found');
      }
    });
    return () => { cancelled = true; };
  }, [agentId, filePath]);

  // Keep the in-tab view in sync after an edit/save, then bubble up.
  const handleAgentUpdated = (updated: AgentFile) => {
    setAgent(updated);
    onAgentUpdated?.(updated);
  };

  if (state === 'loading') return <DetailStatus message="Loading agent…" />;
  if (state === 'not-found' || !agent) return <DetailStatus message="Agent not found." />;

  return (
    <AgentDetailContent agent={agent} onDelete={onDelete} onAgentUpdated={handleAgentUpdated} />
  );
}
