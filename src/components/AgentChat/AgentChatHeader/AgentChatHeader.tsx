import { Square, Terminal } from 'lucide-react';

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
    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900/50 rounded-t-lg">
      <div className="flex items-center gap-2">
        <Terminal size={14} className="text-cyan-400" />
        <span className="text-xs font-medium text-gray-300">
          {session ? `${agentName} — session` : agentName}
        </span>
        {session ? (
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              isRunning
                ? "bg-green-500/20 text-green-400 animate-pulse"
                : session.status === "done"
                  ? "bg-gray-700 text-gray-400"
                  : "bg-red-500/20 text-red-400"
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
        <button
          onClick={onKill}
          className="flex items-center gap-1 px-2 py-0.5 text-xs text-red-400 hover:bg-red-500/10 rounded"
        >
          <Square size={10} />
          Stop
        </button>
      ) : null}
    </div>
  );
}
