import { useEventsStore } from '@/store/useEventsStore';
import type { AgentFile } from '@/types/agent.types';

const colorHex: Record<string, string> = {
  cyan: '#06b6d4', blue: '#3b82f6', green: '#22c55e',
  yellow: '#eab308', orange: '#f97316', red: '#ef4444',
  purple: '#a855f7', pink: '#ec4899',
};

export type ActiveSessionsProps = {
  agents: AgentFile[];
  onSelectAgent: (agent: AgentFile) => void;
};

export function ActiveSessions({
  agents,
  onSelectAgent,
}: ActiveSessionsProps) {
  const activeAgents = useEventsStore((s) => s.activeAgents);
  const agentContexts = useEventsStore((s) => s.agentContexts);
  const waitingAgents = useEventsStore((s) => s.waitingAgents);
  if (activeAgents.size === 0) return null;

  return (
    <div className="px-3 pt-3 pb-2">
      <div className="flex items-center gap-2 mb-2 px-1">
        <span
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
        >
          Active
        </span>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full"
          style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}
        >
          {activeAgents.size}
        </span>
      </div>
      <div className="space-y-0.5">
        {Array.from(activeAgents).map((agentName) => {
          const agent = agents.find((a) => a.frontmatter.name === agentName || a.id === agentName);
          const ctx = agentContexts.get(agentName);
          const isWaiting = waitingAgents.has(agentName);
          const agentColor = agent?.frontmatter?.color;
          const dotColor = colorHex[agentColor || ''] || '#06b6d4';

          return (
            <button
              key={agentName}
              onClick={() => {
                if (agent) onSelectAgent(agent);
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors"
              style={{ background: 'transparent' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {/* Agent color dot — fast pulse */}
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: isWaiting ? '#eab308' : dotColor,
                  boxShadow: `0 0 6px ${isWaiting ? 'rgba(234,179,8,0.5)' : dotColor + '80'}`,
                  animation: isWaiting
                    ? 'pulse 0.6s ease-in-out infinite'
                    : 'pulse 1s ease-in-out infinite',
                }}
              />
              {/* Agent name */}
              <span
                className="text-xs font-medium truncate"
                style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}
              >
                {agentName}
              </span>
              {/* Waiting badge */}
              {isWaiting ? (
                <span
                  className="text-[9px] px-1 py-0.5 rounded shrink-0"
                  style={{
                    background: 'rgba(234,179,8,0.15)',
                    color: '#eab308',
                    border: '1px solid rgba(234,179,8,0.2)',
                  }}
                >
                  awaiting
                </span>
              ) : null}
              {/* Context gauge */}
              {ctx && ctx.percent > 0 && !isWaiting ? (
                <div className="flex-1 flex items-center gap-1.5 ml-auto min-w-0">
                  <div
                    className="flex-1 h-[3px] rounded-full overflow-hidden"
                    style={{ background: 'var(--color-surface-0)', minWidth: '30px' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${ctx.percent}%`,
                        background: ctx.percent >= 90 ? '#ef4444'
                          : ctx.percent >= 70 ? '#eab308'
                          : dotColor,
                      }}
                    />
                  </div>
                  <span
                    className="text-[9px] shrink-0"
                    style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
                  >
                    {Math.round(ctx.percent)}%
                  </span>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
