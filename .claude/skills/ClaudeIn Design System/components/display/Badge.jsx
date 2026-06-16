const TONES = {
  neutral: { fg: 'var(--text-secondary)', bg: 'var(--surface-3)',    border: 'var(--border)' },
  accent:  { fg: 'var(--accent-text)',    bg: 'var(--accent-subtle)', border: 'var(--accent-border)' },
  success: { fg: 'var(--success)',         bg: 'var(--success-subtle)', border: 'color-mix(in srgb, var(--success) 30%, transparent)' },
  warning: { fg: 'var(--warning)',         bg: 'var(--warning-subtle)', border: 'color-mix(in srgb, var(--warning) 30%, transparent)' },
  danger:  { fg: 'var(--danger)',          bg: 'var(--danger-subtle)',  border: 'color-mix(in srgb, var(--danger) 30%, transparent)' },
  info:    { fg: 'var(--info)',            bg: 'var(--info-subtle)',    border: 'color-mix(in srgb, var(--info) 30%, transparent)' },
  history: { fg: 'var(--history)',         bg: 'var(--history-subtle)', border: 'color-mix(in srgb, var(--history) 30%, transparent)' },
};

/**
 * Small status / category label. `mono` (default) renders in Geist Mono for
 * machine-ish values (counts, statuses, types); set `mono={false}` for words.
 */
export function Badge({ tone = 'neutral', shape = 'rounded', mono = true, dot = false, style = {}, children, ...props }) {
  const t = TONES[tone] || TONES.neutral;
  return (
    <span
      {...props}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '2px 8px',
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--weight-medium)',
        lineHeight: 'var(--leading-xs)',
        letterSpacing: '0.01em',
        color: t.fg,
        background: t.bg,
        border: `1px solid ${t.border}`,
        borderRadius: shape === 'pill' ? 'var(--radius-pill)' : 'var(--radius-sm)',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {dot ? <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.fg, flexShrink: 0 }} /> : null}
      {children}
    </span>
  );
}
