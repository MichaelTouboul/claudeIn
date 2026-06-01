import { ContextBar } from '@/components/_ui/ContextBar';
import { CostDashboard } from '@/components/CostDashboard/CostDashboard';
import { useEventsStore } from '@/store/useEventsStore';

export function ContextTab() {
  const agentContexts = useEventsStore((s) => s.agentContexts);
  const rows = Array.from(agentContexts.entries());

  return (
    <div className="flex-1 overflow-y-auto h-full">
      <div className="px-6 pt-5 pb-3">
        <p
          className="text-[10px] font-semibold uppercase tracking-widest mb-2"
          style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
        >
          Live context
        </p>
        {rows.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            No active agents.
          </p>
        ) : (
          <div className="space-y-2">
            {rows.map(([name, ctx]) => (
              <div key={name} className="flex items-center gap-3">
                <span
                  className="text-xs truncate w-40 shrink-0"
                  style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}
                >
                  {name}
                </span>
                <div
                  className="flex-1 relative h-5 rounded-lg"
                  style={{ background: 'var(--color-surface-2)' }}
                >
                  <ContextBar percent={ctx.percent} tokensIn={ctx.tokensIn} tokensOut={ctx.tokensOut} costUsd={ctx.costUsd} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <CostDashboard />
    </div>
  );
}
