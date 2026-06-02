import { Activity, Radio,Zap } from "lucide-react";

import { formatTokens } from "@/lib/formatTokens";

import type { Stats } from "../../hooks/useStats";

export type StatsBarProps = {
  stats: Stats | null;
  activeCount: number;
  connected: boolean;
};

export function StatsBar({
  stats,
  activeCount,
  connected,
}: StatsBarProps) {
  if (!stats) return null;

  return (
    <div className="flex items-center gap-4 text-xs" style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
      <div className="flex items-center gap-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full ${connected ? "animate-pulse" : ""}`}
          style={{ background: connected ? 'var(--color-active)' : 'var(--color-danger)' }}
        />
        <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>{connected ? "Live" : "Off"}</span>
      </div>

      <Stat icon={<Activity size={11} />} value={String(activeCount)} color="var(--color-accent)" />
      <Stat icon={<Radio size={11} />} value={stats.events_today} color="#60a5fa" />
      <Stat icon={<Zap size={11} />} value={formatTokens(parseInt(stats.total_tokens_in) + parseInt(stats.total_tokens_out))} color="#facc15" />
    </div>
  );
}

function Stat({ icon, value, color }: { icon: React.ReactNode; value: string; color: string }) {
  return (
    <div className="flex items-center gap-1" style={{ color }}>
      <span style={{ opacity: 0.7 }}>{icon}</span>
      <span className="font-medium" style={{ fontSize: '11px' }}>{value}</span>
    </div>
  );
}
