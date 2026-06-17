import { Square, Terminal } from 'lucide-react';

import { Badge } from '@/components/_ui/Badge';
import { Button } from '@/components/_ui/Button';
import { ContextBar } from '@/components/_ui/ContextBar';
import type { SpawnSession } from '@/lib/types';
import { contextPercentForAgent } from '@/store/dashboard/sessionContext';
import { useEventsStore } from '@/store/dashboard/useEventsStore';

export type AgentChatHeaderProps = {
  agentName: string;
  session: SpawnSession | null;
  isRunning: boolean;
  waitingInput: boolean;
  onKill: () => void;
};

export function AgentChatHeader({ agentName, session, isRunning, waitingInput, onKill }: AgentChatHeaderProps) {
  const context = useEventsStore((s) => s.agentContexts.get(agentName));
  // Backend context %: prefer this conversation's value (keyed by its
  // claudeSessionId), else the agent's live session(s). The renderer never
  // computes the percent — it's the same backend value the sidebar bar shows.
  const sessionId = session?.claudeSessionId;
  const percent = useEventsStore((s) =>
    (sessionId ? s.sessionContexts.get(sessionId) : undefined) ??
    contextPercentForAgent(s.presence, s.sessionContexts, agentName),
  );
  return (
    <div className="relative flex items-center justify-between px-4 py-2 border-b border-border bg-surface-1/50 rounded-t-lg">
      {percent !== null && percent !== undefined && percent > 0 ? (
        <ContextBar
          percent={percent}
          tokensIn={context?.tokensIn ?? 0}
          tokensOut={context?.tokensOut ?? 0}
          costUsd={context?.costUsd ?? 0}
        />
      ) : null}
      <div className="relative flex items-center gap-2">
        <Terminal size={14} className="text-accent" />
        <span className="text-xs font-medium text-fg">
          {session ? `${agentName} — session` : agentName}
        </span>
        {session ? (
          <Badge
            shape="pill"
            variant={isRunning ? "green" : session.status === "done" ? "gray" : "red"}
            className={`text-[10px] ${isRunning ? "animate-pulse" : ""}`}
          >
            {session.status}
          </Badge>
        ) : null}
        {waitingInput ? (
          <Badge shape="pill" variant="yellow" className="text-[10px] animate-pulse">
            awaiting response
          </Badge>
        ) : null}
      </div>
      {isRunning ? (
        <Button intent="danger" size="sm" onClick={onKill} className="relative">
          <Square size={10} />
          Stop
        </Button>
      ) : null}
    </div>
  );
}
