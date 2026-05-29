import { Link, Unlink } from "lucide-react";

import { AgentContextMenu } from '@/components/AgentContextMenu/AgentContextMenu';
import { useEventsStore } from '@/store/useEventsStore';
import type { AgentFile } from '@/types/agent.types';

import { ContextBar } from '../ContextBar/ContextBar';
import { colorMap } from '../utils';

export type AgentRowProps = {
  agent: AgentFile;
  selected: boolean;
  onSelect: (a: AgentFile) => void;
  onAgentAction: (action: string, agentName: string) => void;
  onToggleLink?: (name: string) => void;
  linkAction?: "link" | "unlink";
  isAgentFavorite?: (name: string) => boolean;
};

export function AgentRow({
  agent,
  selected,
  onSelect,
  onAgentAction,
  onToggleLink,
  linkAction,
  isAgentFavorite,
}: AgentRowProps) {
  const active = useEventsStore((s) => s.activeAgents.has(agent.id));
  const context = useEventsStore((s) => s.agentContexts.get(agent.id));
  return (
    <div className="flex items-center group">
      <button
        onClick={() => onSelect(agent)}
        className={`relative flex-1 flex items-center gap-2 px-3 py-2 rounded-lg transition-colors overflow-hidden ${
          selected ? "bg-surface-3 text-white" : "text-fg hover:bg-surface-2"
        }`}
      >
        {active && context && context.percent > 0 ? <ContextBar percent={context.percent} tokensIn={context.tokensIn} tokensOut={context.tokensOut} costUsd={context.costUsd} /> : null}
        <span className={`relative w-2 h-2 rounded-full shrink-0 ${active ? "bg-active animate-pulse" : (colorMap[agent.frontmatter.color || ""] || "bg-surface-3")}`} />
        <span className="relative truncate text-sm font-medium">{agent.id}</span>
      </button>
      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <AgentContextMenu agentName={agent.id} isOrchestrator={agent.subAgents.length > 0} isFavorite={isAgentFavorite?.(agent.id)} onAction={onAgentAction} />
      </div>
      {onToggleLink && linkAction ? <button
          onClick={() => onToggleLink(agent.id)}
          className={`p-1.5 mr-1 rounded shrink-0 transition-colors ${
            linkAction === "link"
              ? "text-fg-subtle hover:text-active hover:bg-active/10"
              : "text-active/60 hover:text-danger hover:bg-danger/10"
          }`}
        >
          {linkAction === "link" ? <Link size={12} /> : <Unlink size={12} />}
        </button> : null}
    </div>
  );
}
