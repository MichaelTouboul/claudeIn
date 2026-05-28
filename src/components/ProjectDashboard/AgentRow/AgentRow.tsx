import { Link, Unlink } from "lucide-react";

import type { AgentFile } from '@/types/agent.types';
import type { AgentContext } from '@/hooks/useIPC';
import { AgentContextMenu } from '@/components/AgentContextMenu/AgentContextMenu';
import { colorMap } from '../utils';
import { ContextBar } from '../ContextBar/ContextBar';

export type AgentRowProps = {
  agent: AgentFile;
  selected: boolean;
  active?: boolean;
  context?: AgentContext;
  onSelect: (a: AgentFile) => void;
  onAgentAction: (action: string, agentName: string) => void;
  onToggleLink?: (name: string) => void;
  linkAction?: "link" | "unlink";
  isAgentFavorite?: (name: string) => boolean;
};

export function AgentRow({
  agent,
  selected,
  active,
  context,
  onSelect,
  onAgentAction,
  onToggleLink,
  linkAction,
  isAgentFavorite,
}: AgentRowProps) {
  return (
    <div className="flex items-center group">
      <button
        onClick={() => onSelect(agent)}
        className={`relative flex-1 flex items-center gap-2 px-3 py-2 rounded-lg transition-colors overflow-hidden ${
          selected ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-800"
        }`}
      >
        {active && context && context.percent > 0 && (
          <ContextBar percent={context.percent} tokensIn={context.tokensIn} tokensOut={context.tokensOut} costUsd={context.costUsd} />
        )}
        <span className={`relative w-2 h-2 rounded-full shrink-0 ${active ? "bg-green-400 animate-pulse" : (colorMap[agent.frontmatter.color || ""] || "bg-gray-500")}`} />
        <span className="relative truncate text-sm font-medium">{agent.id}</span>
      </button>
      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <AgentContextMenu agentName={agent.id} isOrchestrator={agent.subAgents.length > 0} isFavorite={isAgentFavorite?.(agent.id)} onAction={onAgentAction} />
      </div>
      {onToggleLink && linkAction && (
        <button
          onClick={() => onToggleLink(agent.id)}
          className={`p-1.5 mr-1 rounded shrink-0 transition-colors ${
            linkAction === "link"
              ? "text-gray-600 hover:text-green-400 hover:bg-green-500/10"
              : "text-green-400/60 hover:text-red-400 hover:bg-red-500/10"
          }`}
        >
          {linkAction === "link" ? <Link size={12} /> : <Unlink size={12} />}
        </button>
      )}
    </div>
  );
}
