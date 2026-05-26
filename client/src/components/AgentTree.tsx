import { useMemo, useState } from "react";
import { ChevronRight, ChevronDown, Cog, Network, Wrench } from "lucide-react";
import type { AgentFile } from "../types/agent.types";
import type { AgentContext } from "../hooks/useSSE";

const colorValues: Record<string, string> = {
  cyan: "#06b6d4", blue: "#3b82f6", green: "#22c55e",
  yellow: "#eab308", orange: "#f97316", red: "#ef4444",
  purple: "#a855f7", pink: "#ec4899",
};

function ContextGauge({ context }: { context: AgentContext }) {
  const barColor =
    context.percent >= 90 ? "bg-red-500" :
    context.percent >= 70 ? "bg-yellow-500" :
    "bg-cyan-500";

  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex-1 h-[5px] bg-gray-800/80 rounded-full overflow-hidden backdrop-blur-sm">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
          style={{ width: `${context.percent}%` }}
        />
      </div>
      <span className="text-[10px] text-gray-500 font-mono tabular-nums w-8 text-right">
        {context.percent.toFixed(0)}%
      </span>
    </div>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function TreeNode({
  agent,
  depth,
  isActive,
  context,
  currentTool,
  selected,
  onSelect,
}: {
  agent: AgentFile;
  depth: number;
  isActive: boolean;
  context?: AgentContext;
  currentTool?: string;
  selected: boolean;
  onSelect: (a: AgentFile) => void;
}) {
  const color = colorValues[agent.frontmatter.color || ""] || "#6b7280";
  const model = agent.frontmatter.model || "inherit";
  const isOrchestrator = agent.subAgents.length > 0;

  return (
    <button
      onClick={() => onSelect(agent)}
      className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200 ${
        selected
          ? "bg-gray-800/90 ring-1 ring-cyan-500/25 shadow-[0_0_12px_rgba(6,182,212,0.06)]"
          : "hover:bg-gray-800/40"
      }`}
      style={{ paddingLeft: `${12 + depth * 20}px` }}
    >
      <div className="flex items-center gap-2">
        {isOrchestrator ? (
          <Network size={13} className={isActive ? "text-green-400" : "text-cyan-400/70"} />
        ) : (
          <Cog size={11} className={isActive ? "text-green-400" : "text-gray-600"} />
        )}

        <span
          className={`w-2 h-2 rounded-full shrink-0 transition-all duration-500 ${isActive ? "animate-pulse shadow-[0_0_6px_rgba(74,222,128,0.5)]" : ""}`}
          style={{ backgroundColor: isActive ? "#4ade80" : color }}
        />

        <span className={`text-sm font-medium truncate transition-colors ${isActive ? "text-white" : "text-gray-300"}`}>
          {agent.id}
        </span>

        <span className="ml-auto text-[10px] text-gray-600 font-mono tabular-nums">{model}</span>
      </div>

      {isActive && context && context.percent > 0 && (
        <div className="ml-6 mt-1">
          <ContextGauge context={context} />
          <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500 font-mono tabular-nums">
            <span>in {formatTokens(context.tokensIn)}</span>
            <span>out {formatTokens(context.tokensOut)}</span>
            <span className="text-yellow-500/60">${context.costUsd.toFixed(4)}</span>
          </div>
        </div>
      )}

      {isActive && currentTool && (
        <div className="flex items-center gap-1.5 ml-6 mt-1.5">
          <Wrench size={9} className="text-yellow-500/70" />
          <span className="text-[10px] text-yellow-500/70 font-mono truncate">{currentTool}</span>
        </div>
      )}
    </button>
  );
}

export default function AgentTree({
  agents,
  activeAgents,
  agentContexts,
  currentTools,
  selectedId,
  onSelect,
}: {
  agents: AgentFile[];
  activeAgents: Set<string>;
  agentContexts: Map<string, AgentContext>;
  currentTools?: Map<string, string>;
  selectedId: string | null;
  onSelect: (a: AgentFile) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const { orchestrators, standalones } = useMemo(() => {
    const agentIds = new Set(agents.map((a) => a.id));
    const subAgentIds = new Set<string>();
    for (const a of agents) {
      for (const sub of a.subAgents) {
        if (agentIds.has(sub)) subAgentIds.add(sub);
      }
    }
    return {
      orchestrators: agents.filter((a) => a.subAgents.length > 0),
      standalones: agents.filter((a) => a.subAgents.length === 0 && !subAgentIds.has(a.id)),
    };
  }, [agents]);

  const agentMap = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-950 p-4">
      <h3 className="text-[10px] font-semibold text-gray-600 uppercase tracking-[0.12em] mb-3 px-3">
        Agent Hierarchy
      </h3>

      <div className="space-y-0.5">
        {orchestrators.map((orch) => {
          const isCollapsed = collapsed.has(orch.id);
          const subs = orch.subAgents
            .map((id) => agentMap.get(id))
            .filter((a): a is AgentFile => !!a);

          return (
            <div key={orch.id}>
              <div className="flex items-center">
                <button
                  onClick={() => toggleCollapse(orch.id)}
                  className="p-1 text-gray-700 hover:text-gray-400 transition-colors"
                >
                  {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                </button>
                <div className="flex-1 min-w-0">
                  <TreeNode
                    agent={orch}
                    depth={0}
                    isActive={activeAgents.has(orch.id)}
                    context={agentContexts.get(orch.id)}
                    currentTool={currentTools?.get(orch.id)}
                    selected={selectedId === orch.id}
                    onSelect={onSelect}
                  />
                </div>
              </div>

              {!isCollapsed && subs.length > 0 && (
                <div className="ml-3 border-l border-gray-800/60">
                  {subs.map((sub) => (
                    <TreeNode
                      key={sub.id}
                      agent={sub}
                      depth={1}
                      isActive={activeAgents.has(sub.id)}
                      context={agentContexts.get(sub.id)}
                      currentTool={currentTools?.get(sub.id)}
                      selected={selectedId === sub.id}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {standalones.length > 0 && orchestrators.length > 0 && (
          <div className="border-t border-gray-800/40 my-3" />
        )}

        {standalones.map((a) => (
          <TreeNode
            key={a.id}
            agent={a}
            depth={0}
            isActive={activeAgents.has(a.id)}
            context={agentContexts.get(a.id)}
            currentTool={currentTools?.get(a.id)}
            selected={selectedId === a.id}
            onSelect={onSelect}
          />
        ))}
      </div>

      {agents.length === 0 && (
        <p className="text-sm text-gray-700 text-center py-12">No agents found</p>
      )}
    </div>
  );
}
