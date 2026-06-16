// Compact context-window gauge for a session row: a 54px track + a mono "%"
// label, colored by fill (green < 60, amber < 85, red ≥ 85). Purely
// presentational — the percent is sourced upstream (transcript usage or the
// live conversation context). Tokens drive every color/size; no raw values.
export type SessionContextBarProps = {
  percent: number;
};

const TRACK_WIDTH_PX = 54;

function fillColor(percent: number): string {
  if (percent < 60) return "var(--color-active)";
  if (percent < 85) return "var(--color-warning)";
  return "var(--color-danger)";
}

export function SessionContextBar({ percent }: SessionContextBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <span
      className="inline-flex items-center gap-1.5 shrink-0"
      title={`Context ${clamped}% used`}
      data-testid="session-context-bar"
    >
      <span
        className="h-1 rounded-full overflow-hidden"
        style={{ width: TRACK_WIDTH_PX, background: "var(--color-surface-3)" }}
      >
        <span
          className="block h-full rounded-full"
          style={{ width: `${clamped}%`, background: fillColor(clamped) }}
        />
      </span>
      <span
        className="text-[10px] tabular-nums"
        style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
      >
        {clamped}%
      </span>
    </span>
  );
}
