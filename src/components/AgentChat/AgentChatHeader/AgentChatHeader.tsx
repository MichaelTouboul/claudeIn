import { Square, Terminal } from 'lucide-react';

import { Button } from '@/components/_ui/Button';
import type { SpawnSession } from '@/types/spawn.types';

export type AgentChatHeaderProps = {
  agentName: string;
  session: SpawnSession | null;
  isRunning: boolean;
  waitingInput: boolean;
  onKill: () => void;
};

export function AgentChatHeader({ agentName, session, isRunning, waitingInput, onKill }: AgentChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-1/50 rounded-t-lg">
      <div className="flex items-center gap-2">
        <Terminal size={14} className="text-accent" />
        <span className="text-xs font-medium text-fg">
          {session ? `${agentName} — session` : agentName}
        </span>
        {session ? (
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              isRunning
                ? "bg-active/20 text-active animate-pulse"
                : session.status === "done"
                  ? "bg-surface-3 text-fg-muted"
                  : "bg-danger/20 text-danger"
            }`}
          >
            {session.status}
          </span>
        ) : null}
        {waitingInput ? (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-yellow-500/20 text-yellow-400 animate-pulse">
            awaiting response
          </span>
        ) : null}
      </div>
      {isRunning ? (
        <Button intent="danger" size="sm" onClick={onKill}>
          <Square size={10} />
          Stop
        </Button>
      ) : null}
    </div>
  );
}
