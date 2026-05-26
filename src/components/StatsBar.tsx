import { Activity, Zap, DollarSign, Radio } from "lucide-react";
import type { Stats } from "../hooks/useStats";

export default function StatsBar({
  stats,
  activeCount,
  connected,
}: {
  stats: Stats | null;
  activeCount: number;
  connected: boolean;
}) {
  if (!stats) return null;

  return (
    <div className="flex items-center gap-4 text-xs">
      <div className="flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full ${connected ? "bg-green-400 animate-pulse" : "bg-red-400"}`}
        />
        <span className="text-gray-500">{connected ? "Live" : "Disconnected"}</span>
      </div>

      <Stat
        icon={<Activity size={12} />}
        label="Active"
        value={String(activeCount)}
        color="text-cyan-400"
      />
      <Stat
        icon={<Radio size={12} />}
        label="Events today"
        value={stats.events_today}
        color="text-blue-400"
      />
      <Stat
        icon={<Zap size={12} />}
        label="Tokens"
        value={formatTokens(parseInt(stats.total_tokens_in) + parseInt(stats.total_tokens_out))}
        color="text-yellow-400"
      />
      <Stat
        icon={<DollarSign size={12} />}
        label="Today"
        value={`$${stats.cost_today.toFixed(2)}`}
        color="text-green-400"
      />
      <Stat
        icon={<DollarSign size={12} />}
        label="Total"
        value={`$${stats.total_cost.toFixed(2)}`}
        color="text-gray-400"
      />
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={color}>{icon}</span>
      <span className="text-gray-500">{label}</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
