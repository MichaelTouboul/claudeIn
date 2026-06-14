import { Activity } from "lucide-react";

import { Inline } from "@/components/_ui/Inline";
import { StatusDot } from "@/components/_ui/StatusDot";

export type StatsBarProps = {
  activeCount: number;
  connected: boolean;
};

export function StatsBar({ activeCount, connected }: StatsBarProps) {
  const liveLabel = connected ? "Live" : "Off";

  return (
    <Inline gap={4} className="text-xs" style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
      <Inline gap={1.5} aria-label={`Connection: ${liveLabel}`}>
        <StatusDot
          size="xs"
          pulse={connected}
          style={{ background: connected ? 'var(--color-active)' : 'var(--color-danger)' }}
        />
        <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>{liveLabel}</span>
      </Inline>

      <Inline gap={1} style={{ color: 'var(--color-accent)' }} aria-label={`Active agents: ${activeCount}`}>
        <span style={{ opacity: 0.7 }}><Activity size={11} /></span>
        <span className="font-medium" style={{ fontSize: '11px' }}>{activeCount}</span>
      </Inline>
    </Inline>
  );
}
