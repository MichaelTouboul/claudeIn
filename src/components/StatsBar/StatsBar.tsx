import { Activity } from "lucide-react";

import { StatusDot } from "@/components/_ui/StatusDot";

export type StatsBarProps = {
  activeCount: number;
  connected: boolean;
};

export function StatsBar({ activeCount, connected }: StatsBarProps) {
  const liveLabel = connected ? "Live" : "Off";

  return (
    <div className="flex items-center gap-4 text-xs" style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
      <div className="flex items-center gap-1.5" aria-label={`Connection: ${liveLabel}`}>
        <StatusDot
          size="xs"
          pulse={connected}
          style={{ background: connected ? 'var(--color-active)' : 'var(--color-danger)' }}
        />
        <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>{liveLabel}</span>
      </div>

      <div className="flex items-center gap-1" style={{ color: 'var(--color-accent)' }} aria-label={`Active agents: ${activeCount}`}>
        <span style={{ opacity: 0.7 }}><Activity size={11} /></span>
        <span className="font-medium" style={{ fontSize: '11px' }}>{activeCount}</span>
      </div>
    </div>
  );
}
