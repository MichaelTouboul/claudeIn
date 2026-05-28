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
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={color}>{icon}</span>
        <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub ? <div className="text-xs text-gray-500 mt-1">{sub}</div> : null}
    </div>
  );
}
