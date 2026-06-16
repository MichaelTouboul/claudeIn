/**
 * Linear progress bar. Omit `value` (or pass null) for an indeterminate bar.
 */
export function ProgressBar({ value = null, height = 6, color = 'var(--accent-solid)', style = {}, ...props }) {
  const indeterminate = value === null || value === undefined;
  const pct = indeterminate ? 0 : Math.max(0, Math.min(100, value));

  return (
    <div
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : pct}
      aria-valuemin={0}
      aria-valuemax={100}
      {...props}
      style={{
        position: 'relative',
        width: '100%',
        height,
        borderRadius: 'var(--radius-pill)',
        background: 'var(--surface-inset)',
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        className={indeterminate ? 'ci-progress-indeterminate' : undefined}
        style={{
          position: indeterminate ? 'absolute' : 'static',
          height: '100%',
          width: indeterminate ? '60%' : `${pct}%`,
          transformOrigin: 'left',
          borderRadius: 'var(--radius-pill)',
          background: color,
          transition: indeterminate ? 'none' : 'width var(--duration-base) var(--ease-standard)',
          ...(indeterminate ? { animation: 'ci-progress-indeterminate 1.4s ease-in-out infinite' } : {}),
        }}
      />
    </div>
  );
}
