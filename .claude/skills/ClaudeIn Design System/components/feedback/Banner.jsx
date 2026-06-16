const TONES = {
  info:    { fg: 'var(--info)',    bg: 'var(--info-subtle)',    border: 'color-mix(in srgb, var(--info) 35%, transparent)' },
  success: { fg: 'var(--success)', bg: 'var(--success-subtle)', border: 'color-mix(in srgb, var(--success) 35%, transparent)' },
  warning: { fg: 'var(--warning)', bg: 'var(--warning-subtle)', border: 'color-mix(in srgb, var(--warning) 35%, transparent)' },
  danger:  { fg: 'var(--danger)',  bg: 'var(--danger-subtle)',  border: 'color-mix(in srgb, var(--danger) 35%, transparent)' },
  neutral: { fg: 'var(--text-secondary)', bg: 'var(--surface-2)', border: 'var(--border)' },
};

/**
 * Inline contextual message — info / success / warning / danger / neutral.
 * Pass an `icon` node and optional `action` (e.g. a Button) on the right.
 */
export function Banner({ tone = 'info', icon = null, title = null, action = null, style = {}, children, ...props }) {
  const t = TONES[tone] || TONES.info;
  return (
    <div
      role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}
      {...props}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-4)',
        borderRadius: 'var(--radius-md)',
        background: t.bg,
        border: `1px solid ${t.border}`,
        color: 'var(--text-secondary)',
        fontSize: 'var(--text-base)',
        lineHeight: 'var(--leading-base)',
        ...style,
      }}
    >
      {icon ? <span style={{ color: t.fg, display: 'flex', flexShrink: 0, marginTop: '1px' }}>{icon}</span> : null}
      <div style={{ flex: 1, minWidth: 0 }}>
        {title ? (
          <div style={{ color: 'var(--text-primary)', fontWeight: 'var(--weight-semibold)', marginBottom: children ? '2px' : 0 }}>
            {title}
          </div>
        ) : null}
        {children}
      </div>
      {action ? <div style={{ flexShrink: 0 }}>{action}</div> : null}
    </div>
  );
}
