const SIZES = { xs: 6, sm: 8, md: 10 };

const STATUS_COLOR = {
  live:  'var(--status-live)',
  idle:  'var(--status-idle)',
  error: 'var(--status-error)',
  warning: 'var(--warning)',
  info:  'var(--info)',
};

/**
 * A small state indicator dot. `status` maps to a semantic color; `pulse`
 * animates it (use for live/running). Override with `color` for agent hues.
 */
export function StatusDot({ status = 'idle', size = 'sm', pulse = false, color = null, style = {}, ...props }) {
  const px = SIZES[size] || SIZES.sm;
  return (
    <span
      className={pulse ? 'ci-pulse' : undefined}
      {...props}
      style={{
        display: 'inline-block',
        width: px,
        height: px,
        flexShrink: 0,
        borderRadius: '50%',
        background: color || STATUS_COLOR[status] || STATUS_COLOR.idle,
        ...style,
      }}
    />
  );
}
