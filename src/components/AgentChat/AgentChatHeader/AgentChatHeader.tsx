import { Square, Terminal } from 'lucide-react';

import { Badge } from '@/components/_ui/Badge';
import { Button } from '@/components/_ui/Button';
import { ContextBar } from '@/components/_ui/ContextBar';
import type { SpawnSession } from '@/lib/types';
import { useEventsStore } from '@/store/useEventsStore';

export type AgentChatHeaderProps = {
  agentName: string;
  session: SpawnSession | null;
  isRunning: boolean;
  waitingInput: boolean;
  onKill: () => void;
};

export function AgentChatHeader({ agentName, session, isRunning, waitingInput, onKill }: AgentChatHeaderProps) {
  const context = useEventsStore((s) => s.agentContexts.get(agentName));
  return (
    <div className="relative flex items-center justify-between px-4 py-2 border-b border-border bg-surface-1/50 rounded-t-lg">
      {context && context.percent > 0 ? (
        <ContextBar
          percent={context.percent}
          tokensIn={context.tokensIn}
          tokensOut={context.tokensOut}
          costUsd={context.costUsd}
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
