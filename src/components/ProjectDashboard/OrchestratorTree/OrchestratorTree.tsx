import { Network, Cog, Link, Unlink } from "lucide-react";

import type { AgentFile } from '@/types/agent.types';
import type { AgentContext } from '@/hooks/useIPC';
import { AgentContextMenu } from '@/components/AgentContextMenu/AgentContextMenu';
import { ContextBar } from '../ContextBar/ContextBar';

export type OrchestratorTreeProps = {
  orchestrator: AgentFile;
  allAgents: AgentFile[];
  selectedId: string | null;
  onSelect: (a: AgentFile) => void;
  onAgentAction: (action: string, agentName: string) => void;
  onToggleLink?: (name: string) => void;
  linkAction?: "link" | "unlink";
  isAgentFavorite?: (name: string) => boolean;
  activeAgents?: Set<string>;
  agentContexts?: Map<string, AgentContext>;
};

export function OrchestratorTree({
  orchestrator,
  allAgents,
  selectedId,
  onSelect,
  onAgentAction,
  onToggleLink,
  linkAction,
  isAgentFavorite,
  activeAgents,
  agentContexts,
}: OrchestratorTreeProps) {
  const agentMap = new Map(allAgents.map((a) => [a.id, a]));
  const subs = orchestrator.subAgents
    .map((id) => agentMap.get(id))
    .filter((a): a is AgentFile => !!a);

  const orchActive = activeAgents?.has(orchestrator.id);
  const orchCtx = agentContexts?.get(orchestrator.id);

  return (
    <div className="mb-1">
      <div className="flex items-center group">
        <button
          onClick={() => onSelect(orchestrator)}
          className={`relative flex-1 flex items-center gap-2 px-3 py-2 rounded-lg transition-colors overflow-hidden ${
            selectedId === orchestrator.id ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-800"
          }`}
        >
          {orchActive && orchCtx && orchCtx.percent > 0 && (
            <ContextBar percent={orchCtx.percent} tokensIn={orchCtx.tokensIn} tokensOut={orchCtx.tokensOut} costUsd={orchCtx.costUsd} />
          )}
          <Network size={14} className={`relative shrink-0 ${orchActive ? "text-green-400 animate-pulse" : "text-cyan-400"}`} />
          <span className="relative truncate text-sm font-medium">{orchestrator.id}</span>
        </button>
        <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <AgentContextMenu agentName={orchestrator.id} isOrchestrator isFavorite={isAgentFavorite?.(orchestrator.id)} onAction={onAgentAction} />
        </div>
        {onToggleLink && linkAction && (
          <button
            onClick={() => onToggleLink(orchestrator.id)}
            className={`p-1.5 mr-1 rounded shrink-0 transition-colors ${
              linkAction === "link"
                ? "text-gray-600 hover:text-green-400 hover:bg-green-500/10"
                : "text-green-400/60 hover:text-red-400 hover:bg-red-500/10"
            }`}
            title={linkAction === "link" ? "Link orchestrator + sub-agents" : "Unlink all"}
          >
            {linkAction === "link" ? <Link size={12} /> : <Unlink size={12} />}
          </button>
        )}
      </div>
      {subs.length > 0 && (
        <div className="ml-4 border-l border-gray-800 pl-1 space-y-0.5">
          {subs.map((sub) => {
            const subActive = activeAgents?.has(sub.id);
            const subCtx = agentContexts?.get(sub.id);
            return (
            <div key={sub.id} className="flex items-center group">
              <button
                onClick={() => onSelect(sub)}
                className={`relative flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors overflow-hidden ${
                  selectedId === sub.id ? "bg-gray-700 text-white" : "text-gray-400 hover:bg-gray-800"
                }`}
              >
                {subActive && subCtx && subCtx.percent > 0 && (
                  <ContextBar percent={subCtx.percent} tokensIn={subCtx.tokensIn} tokensOut={subCtx.tokensOut} costUsd={subCtx.costUsd} />
                )}
                <Cog size={11} className={`relative shrink-0 ${subActive ? "text-green-400 animate-pulse" : "text-gray-500"}`} />
                <span className="relative truncate text-xs font-medium">{sub.id}</span>
              </button>
              <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <AgentContextMenu agentName={sub.id} isOrchestrator={false} isFavorite={isAgentFavorite?.(sub.id)} onAction={onAgentAction} />
              </div>
            </div>
          );
          })}
        </div>
      )}
    </div>
  );
}
