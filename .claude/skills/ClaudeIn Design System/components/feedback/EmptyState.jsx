/**
 * Centered empty / zero-state block: optional icon, a title, supporting copy,
 * and an optional action row. Used for empty lists and first-run panels.
 */
export function EmptyState({ icon = null, title, description = null, action = null, style = {}, ...props }) {
  return (
    <div
      {...props}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-10) var(--space-6)',
        ...style,
      }}
    >
      {icon ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: 'var(--radius-lg)',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            color: 'var(--text-tertiary)',
          }}
        >
          {icon}
        </div>
      ) : null}
      <div style={{ color: 'var(--text-primary)', fontSize: 'var(--text-md)', fontWeight: 'var(--weight-semibold)' }}>
        {title}
      </div>
      {description ? (
        <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-base)', maxWidth: '38ch', lineHeight: 'var(--leading-base)' }}>
          {description}
        </div>
      ) : null}
      {action ? <div style={{ marginTop: 'var(--space-2)' }}>{action}</div> : null}
    </div>
  );
}
