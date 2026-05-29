import { Cog, Link, Network, Unlink } from "lucide-react";

import { Button } from '@/components/_ui/Button';
import { AgentContextMenu } from '@/components/AgentContextMenu/AgentContextMenu';
import { useProject } from '@/store/ProjectContext';
import { useEventsStore } from '@/store/useEventsStore';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import type { AgentFile } from '@/types/agent.types';

import { ContextBar } from '../ContextBar/ContextBar';

export type OrchestratorTreeProps = {
  orchestrator: AgentFile;
  allAgents: AgentFile[];
  selectedId: string | null;
  onSelect: (a: AgentFile) => void;
  onAgentAction: (action: string, agentName: string) => void;
  onToggleLink?: (name: string) => void;
  linkAction?: "link" | "unlink";
};

export function OrchestratorTree({
  orchestrator,
  allAgents,
  selectedId,
  onSelect,
  onAgentAction,
  onToggleLink,
  linkAction,
}: OrchestratorTreeProps) {
  const { projectId } = useProject();
  const activeAgents = useEventsStore((s) => s.activeAgents);
  const agentContexts = useEventsStore((s) => s.agentContexts);
  const favoriteList = useFavoritesStore((s) => s.byProject[projectId] || []);
  const isAgentFavorite = (name: string) =>
    favoriteList.some((f) => f.item_type === 'agent' && f.item_name === name);

  const agentMap = new Map(allAgents.map((a) => [a.id, a]));
  const subs = orchestrator.subAgents
    .map((id) => agentMap.get(id))
    .filter((a): a is AgentFile => !!a);

  const orchActive = activeAgents.has(orchestrator.id);
  const orchCtx = agentContexts.get(orchestrator.id);

  return (
    <div className="mb-1">
      <div className="flex items-center group">
        <button
          onClick={() => onSelect(orchestrator)}
          className={`relative flex-1 flex items-center gap-2 px-3 py-2 rounded-lg transition-colors overflow-hidden ${
            selectedId === orchestrator.id ? "bg-surface-3 text-white" : "text-fg hover:bg-surface-2"
          }`}
        >
          {orchActive && orchCtx && orchCtx.percent > 0 ? <ContextBar percent={orchCtx.percent} tokensIn={orchCtx.tokensIn} tokensOut={orchCtx.tokensOut} costUsd={orchCtx.costUsd} /> : null}
          <Network size={14} className={`relative shrink-0 ${orchActive ? "text-active animate-pulse" : "text-accent"}`} />
          <span className="relative truncate text-sm font-medium">{orchestrator.id}</span>
        </button>
        <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <AgentContextMenu agentName={orchestrator.id} isOrchestrator isFavorite={isAgentFavorite(orchestrator.id)} onAction={onAgentAction} />
        </div>
        {onToggleLink && linkAction ? <Button
            intent={linkAction === "link" ? "ghost" : "danger"}
            size="icon"
            onClick={() => onToggleLink(orchestrator.id)}
            title={linkAction === "link" ? "Link orchestrator + sub-agents" : "Unlink all"}
            className="mr-1"
          >
            {linkAction === "link" ? <Link size={12} /> : <Unlink size={12} />}
          </Button> : null}
      </div>
      {subs.length > 0 ? <div className="ml-4 border-l border-border pl-1 space-y-0.5">
          {subs.map((sub) => {
            const subActive = activeAgents.has(sub.id);
            const subCtx = agentContexts.get(sub.id);
            return (
            <div key={sub.id} className="flex items-center group">
              <button
                onClick={() => onSelect(sub)}
                className={`relative flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors overflow-hidden ${
                  selectedId === sub.id ? "bg-surface-3 text-white" : "text-fg-muted hover:bg-surface-2"
                }`}
              >
                {subActive && subCtx && subCtx.percent > 0 ? <ContextBar percent={subCtx.percent} tokensIn={subCtx.tokensIn} tokensOut={subCtx.tokensOut} costUsd={subCtx.costUsd} /> : null}
                <Cog size={11} className={`relative shrink-0 ${subActive ? "text-active animate-pulse" : "text-fg-muted"}`} />
                <span className="relative truncate text-xs font-medium">{sub.id}</span>
              </button>
              <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <AgentContextMenu agentName={sub.id} isOrchestrator={false} isFavorite={isAgentFavorite(sub.id)} onAction={onAgentAction} />
              </div>
            </div>
          );
          })}
        </div> : null}
    </div>
  );
}
