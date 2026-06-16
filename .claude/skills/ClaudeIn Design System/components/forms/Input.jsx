import { useInteractive } from '../lib/useInteractive';

const SIZES = {
  sm: { height: 'var(--control-sm)', fontSize: 'var(--text-sm)', padding: '0 10px' },
  md: { height: 'var(--control-md)', fontSize: 'var(--text-base)', padding: '0 12px' },
  lg: { height: 'var(--control-lg)', fontSize: 'var(--text-md)', padding: '0 14px' },
};

/**
 * Single-line text field. Pass `leadingIcon` / `trailingIcon` for adornments,
 * `invalid` for the error state, and `mono` to render the value in Geist Mono
 * (paths, IDs, tokens).
 */
export function Input({
  size = 'md',
  invalid = false,
  leadingIcon = null,
  trailingIcon = null,
  mono = false,
  disabled = false,
  style = {},
  ...props
}) {
  const { hover, focus, bind } = useInteractive();
  const s = SIZES[size] || SIZES.md;

  let borderColor = 'var(--border-strong)';
  if (invalid) borderColor = 'var(--danger)';
  else if (focus) borderColor = 'var(--accent)';
  else if (hover) borderColor = 'var(--neutral-500)';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        height: s.height,
        padding: s.padding,
        background: 'var(--surface-inset)',
        border: `1px solid ${borderColor}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: focus ? '0 0 0 3px var(--accent-subtle)' : 'none',
        opacity: disabled ? 0.5 : 1,
        transition: 'border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)',
        ...style,
      }}
    >
      {leadingIcon ? <span style={{ display: 'flex', color: 'var(--text-tertiary)', flexShrink: 0 }}>{leadingIcon}</span> : null}
      <input
        disabled={disabled}
        {...bind}
        {...props}
        style={{
          flex: 1,
          minWidth: 0,
          height: '100%',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: 'var(--text-primary)',
          fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
          fontSize: s.fontSize,
        }}
      />
      {trailingIcon ? <span style={{ display: 'flex', color: 'var(--text-tertiary)', flexShrink: 0 }}>{trailingIcon}</span> : null}
    </div>
  );
}
