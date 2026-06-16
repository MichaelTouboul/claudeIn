import { useInteractive } from '../lib/useInteractive';

/**
 * Removable / selectable chip — for filters, attachments, selected items.
 * Pass `onRemove` to show an × affordance; `selected` for the active state.
 */
export function Tag({ selected = false, onRemove = null, leadingIcon = null, style = {}, children, ...props }) {
  const { hover, bind } = useInteractive();

  return (
    <span
      {...bind}
      {...props}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        height: 24,
        padding: '0 8px',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-xs)',
        color: selected ? 'var(--accent-text)' : 'var(--text-secondary)',
        background: selected ? 'var(--accent-subtle)' : hover ? 'var(--surface-3)' : 'var(--surface-2)',
        border: `1px solid ${selected ? 'var(--accent-border)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-sm)',
        whiteSpace: 'nowrap',
        transition: 'background var(--duration-fast) var(--ease-standard)',
        ...style,
      }}
    >
      {leadingIcon ? <span style={{ display: 'flex', flexShrink: 0 }}>{leadingIcon}</span> : null}
      {children}
      {onRemove ? (
        <button
          type="button"
          aria-label="Remove"
          onClick={(e) => { e.stopPropagation(); onRemove(e); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 14,
            height: 14,
            marginRight: -2,
            padding: 0,
            border: 'none',
            background: 'transparent',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            borderRadius: 'var(--radius-xs)',
            fontSize: 13,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      ) : null}
    </span>
  );
}
