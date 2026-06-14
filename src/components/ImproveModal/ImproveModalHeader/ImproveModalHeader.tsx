import { Select } from '@/components/_ui/Select';
import type { ImproveContextTarget, ImproveType } from '@/lib/types';

import { IMPROVE_TYPE_OPTIONS } from '../typeLabels';

type ImproveModalHeaderProps = {
  type: ImproveType;
  onTypeChange: (type: ImproveType) => void;
  target: ImproveContextTarget | null;
  disabled?: boolean;
};

/** Header: labelled type dropdown + the captured target (or "General request"). */
export function ImproveModalHeader({
  type,
  onTypeChange,
  target,
  disabled,
}: ImproveModalHeaderProps) {
  const hasTarget = Boolean(target?.component || target?.sourcePath);
  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-3 border-b"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <span
          className="text-xs uppercase tracking-wide"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Improve this…
        </span>
        <span
          className="text-sm truncate"
          style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}
          title={target?.sourcePath ?? undefined}
        >
          {hasTarget ? (target?.component ?? target?.sourcePath) : 'General request'}
        </span>
      </div>

      <label className="flex items-center gap-2 shrink-0">
        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          Type
        </span>
        <Select
          aria-label="Improvement type"
          value={type}
          disabled={disabled}
          onChange={(e) => onTypeChange(e.target.value as ImproveType)}
          className="bg-surface-3"
        >
          {IMPROVE_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </label>
    </div>
  );
}
