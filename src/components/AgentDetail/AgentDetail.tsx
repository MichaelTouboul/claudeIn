import { useEffect, useState } from 'react';

import { DetailStatus } from '@/components/_ui/DetailStatus';
import { api } from '@/services/api';
import type { AgentFile } from '@/types/agent.types';

import { AgentDetailContent } from './AgentDetailContent/AgentDetailContent';

export type AgentDetailProps = {
  agentId: string;
  onDelete: (name: string) => void;
  onAgentUpdated?: (agent: AgentFile) => void;
};

type LoadState = 'loading' | 'loaded' | 'not-found';

/**
 * Fetches the full agent on-demand from its id (the list holds only lightweight
 * summaries) and renders the detail once loaded. Re-fetches when `agentId`
 * changes. Loading / not-found states are surfaced inline.
 */
export function AgentDetail({ agentId, onDelete, onAgentUpdated }: AgentDetailProps) {
  const [agent, setAgent] = useState<AgentFile | null>(null);
  const [state, setState] = useState<LoadState>('loading');

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    setAgent(null);
    void api.getAgent(agentId).then((result) => {
      if (cancelled) return;
      if (result) {
        setAgent(result);
        setState('loaded');
      } else {
        setState('not-found');
      }
    });
    return () => { cancelled = true; };
  }, [agentId]);

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
