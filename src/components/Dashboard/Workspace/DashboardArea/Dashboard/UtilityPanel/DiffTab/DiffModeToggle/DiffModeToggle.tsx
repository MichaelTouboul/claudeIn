import { DiffMode } from '@/lib/types';
import { cn } from '@/lib/utils';

export type DiffModeToggleProps = {
  mode: DiffMode;
  /** The resolved base branch for branch mode, or undefined when none exists. */
  base?: string;
  onChange: (mode: DiffMode) => void;
};

/** Static per-mode label text (the Branch label appends the base when known). */
const BASE_LABEL: Record<DiffMode, string> = {
  [DiffMode.Working]: 'Working tree',
  [DiffMode.Branch]: 'Branch',
};

/**
 * Two-segment toggle between the working-tree diff and the branch (vs base) diff.
 * Modeled on the `_ui` SegmentedControl tokens, but built inline so the Branch
 * segment can be disabled (with an explanatory title) when no base branch is
 * resolvable — a capability the generic primitive does not expose.
 */
export function DiffModeToggle({ mode, base, onChange }: DiffModeToggleProps) {
  const branchDisabled = base === undefined;
  return (
    <div
      role="tablist"
      aria-label="Diff scope"
      className="flex items-center gap-px rounded-lg p-0.5"
      style={{ background: 'var(--color-surface-inset)', border: '1px solid var(--color-border-subtle)' }}
    >
      <Segment
        label={BASE_LABEL[DiffMode.Working]}
        active={mode === DiffMode.Working}
        onClick={() => onChange(DiffMode.Working)}
      />
      <Segment
        label={base !== undefined ? `Branch vs ${base}` : BASE_LABEL[DiffMode.Branch]}
        active={mode === DiffMode.Branch}
        disabled={branchDisabled}
        title={branchDisabled ? 'No base branch found' : undefined}
        onClick={() => onChange(DiffMode.Branch)}
      />
    </div>
  );
}

type SegmentProps = {
  label: string;
  active: boolean;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
};

function Segment({ label, active, disabled = false, title, onClick }: SegmentProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={cn(
        'flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium whitespace-nowrap',
        'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)]',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      )}
      style={
        active
          ? { background: 'var(--color-accent-subtle)', color: 'var(--color-accent-text)' }
          : { color: 'var(--color-text-muted)' }
      }
    >
      {label}
    </button>
  );
}
