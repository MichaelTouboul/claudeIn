import { useInteractive } from '../lib/useInteractive';

const SIZES = {
  sm: { height: 'var(--control-sm)', fontSize: 'var(--text-sm)' },
  md: { height: 'var(--control-md)', fontSize: 'var(--text-base)' },
  lg: { height: 'var(--control-lg)', fontSize: 'var(--text-md)' },
};

/**
 * Native select styled to match the design system, with a custom chevron.
 * Pass `options` as `{ value, label }[]` or provide `<option>` children.
 */
export function Select({ size = 'md', invalid = false, options = null, disabled = false, style = {}, children, ...props }) {
  const { hover, focus, bind } = useInteractive();
  const s = SIZES[size] || SIZES.md;

  let borderColor = 'var(--border-strong)';
  if (invalid) borderColor = 'var(--danger)';
  else if (focus) borderColor = 'var(--accent)';
  else if (hover) borderColor = 'var(--neutral-500)';

  return (
    <div style={{ position: 'relative', display: 'inline-flex', width: style.width || 'auto' }}>
      <select
        disabled={disabled}
        {...bind}
        {...props}
        style={{
          appearance: 'none',
          WebkitAppearance: 'none',
          width: '100%',
          height: s.height,
          padding: '0 32px 0 12px',
          background: 'var(--surface-inset)',
          border: `1px solid ${borderColor}`,
          borderRadius: 'var(--radius-md)',
          boxShadow: focus ? '0 0 0 3px var(--accent-subtle)' : 'none',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-sans)',
          fontSize: s.fontSize,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          outline: 'none',
          transition: 'border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)',
          ...style,
        }}
      >
        {options
          ? options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))
          : children}
      </select>
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: 11,
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          color: 'var(--text-tertiary)',
          fontSize: 10,
          lineHeight: 1,
        }}
      >
        ▾
      </span>
    </div>
  );
}
