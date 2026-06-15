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
    <Inline gap={3} className="text-xs" style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
      <Inline gap={1.5} aria-label={`Connection: ${liveLabel}`}>
        <StatusDot
          size="xs"
          pulse={connected}
          style={{ background: connected ? 'var(--color-active)' : 'var(--color-danger)' }}
        />
        <span style={{ color: 'var(--color-text-muted)' }}>{liveLabel}</span>
      </Inline>

      <Inline gap={1.5} style={{ color: 'var(--color-accent)' }} aria-label={`Active agents: ${activeCount}`}>
        <Activity size={13} aria-hidden="true" />
        <span className="font-medium">{activeCount} active</span>
      </Inline>
    </Inline>
  );
}
