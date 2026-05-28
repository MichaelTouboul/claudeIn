import { type ReactNode } from 'react';

export type BigStatProps = {
  icon: ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
};

export function BigStat({ icon, label, value, sub, color }: BigStatProps) {
  return (
    <div className="bg-surface-2/50 border border-border/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={color}>{icon}</span>
        <span className="text-xs text-fg-muted uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub ? <div className="text-xs text-fg-muted mt-1">{sub}</div> : null}
    </div>
  );
}
