import { Cog, Network, Wrench } from 'lucide-react';

import { useEventsStore } from '@/store/useEventsStore';
import type { AgentFile } from '@/types/agent.types';
import type { AgentContext } from '@/types/events.types';

const colorValues: Record<string, string> = {
  cyan: "#06b6d4", blue: "#3b82f6", green: "#22c55e",
  yellow: "#eab308", orange: "#f97316", red: "#ef4444",
  purple: "#a855f7", pink: "#ec4899",
};

function gaugeGradient(percent: number): string {
  if (percent >= 90) return "linear-gradient(90deg, #ef4444 0%, #f87171 100%)";
  if (percent >= 70) return "linear-gradient(90deg, #eab308 0%, #facc15 100%)";
  return "linear-gradient(90deg, #06b6d4 0%, #22d3ee 100%)";
}

function ContextGauge({ context }: { context: AgentContext }) {
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div
        className="flex-1 h-[5px] rounded-full overflow-hidden"
        style={{ background: 'var(--color-surface-0)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${context.percent}%`,
            background: gaugeGradient(context.percent),
            boxShadow: context.percent >= 70
              ? `0 0 6px ${context.percent >= 90 ? 'rgba(239,68,68,0.3)' : 'rgba(234,179,8,0.25)'}`
              : '0 0 4px rgba(6,182,212,0.2)',
          }}
        />
      </div>
      <span
        style={{
          fontSize: '10px',
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-mono)',
          fontFeatureSettings: "'tnum' 1",
          width: '32px',
          textAlign: 'right',
        }}
      >
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

export type TreeNodeProps = {
  agent: AgentFile;
  depth: number;
  selected: boolean;
  onSelect: (a: AgentFile) => void;
};

export function TreeNode({
  agent,
  depth,
  selected,
  onSelect,
}: TreeNodeProps) {
  const isActive = useEventsStore((s) => s.activeAgents.has(agent.id));
  const context = useEventsStore((s) => s.agentContexts.get(agent.id));
  const currentTool = useEventsStore((s) => s.currentTools.get(agent.id));
  const color = colorValues[agent.frontmatter.color || ""] || "#6b7280";
  const model = agent.frontmatter.model || "inherit";
  const isOrchestrator = agent.subAgents.length > 0;

  return (
    <button
      onClick={() => onSelect(agent)}
      className="w-full text-left rounded-lg transition-all duration-200"
      style={{
        paddingLeft: `${12 + depth * 20}px`,
        paddingRight: '12px',
        paddingTop: '10px',
        paddingBottom: '10px',
        background: selected ? 'var(--color-surface-2)' : undefined,
        boxShadow: selected ? '0 0 12px rgba(6,182,212,0.06), inset 0 0 0 1px rgba(6,182,212,0.15)' : undefined,
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.background = 'var(--color-surface-2)';
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.background = 'transparent';
      }}
    >
      <div className="flex items-center gap-2">
        {isOrchestrator ? (
          <Network size={13} className={isActive ? "text-active" : ""} style={isActive ? undefined : { color: 'rgba(6,182,212,0.5)' }} />
        ) : (
          <Cog size={11} style={{ color: isActive ? '#4ade80' : 'var(--color-text-muted)' }} />
        )}

        <span
          className={`w-2 h-2 rounded-full shrink-0 transition-all duration-500 ${isActive ? "animate-pulse" : ""}`}
          style={{
            backgroundColor: isActive ? "#4ade80" : color,
            boxShadow: isActive ? '0 0 6px rgba(74,222,128,0.5)' : undefined,
          }}
        />

        <span
          className="text-sm font-medium truncate transition-colors"
          style={{ color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}
        >
          {agent.id}
        </span>

        <span
          className="ml-auto"
          style={{
            fontSize: '10px',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-mono)',
            fontFeatureSettings: "'tnum' 1",
          }}
        >
          {model}
        </span>
      </div>

      {isActive && context && context.percent > 0 ? <div className="ml-6 mt-1">
          <ContextGauge context={context} />
          <div
            className="flex items-center gap-3 mt-1"
            style={{
              fontSize: '10px',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-mono)',
              fontFeatureSettings: "'tnum' 1",
            }}
          >
            <span>in {formatTokens(context.tokensIn)}</span>
            <span>out {formatTokens(context.tokensOut)}</span>
            <span style={{ color: 'rgba(234,179,8,0.5)' }}>${context.costUsd.toFixed(4)}</span>
          </div>
        </div> : null}

      {isActive && currentTool ? <div className="flex items-center gap-1.5 ml-6 mt-1.5">
          <Wrench size={9} style={{ color: 'rgba(234,179,8,0.6)' }} />
          <span
            className="truncate"
            style={{
              fontSize: '10px',
              color: 'rgba(234,179,8,0.6)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {currentTool}
          </span>
        </div> : null}
    </button>
  );
}
