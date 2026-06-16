import { useInteractive } from '../lib/useInteractive';

/**
 * Checkbox with a label. Controlled via `checked` / `onChange`. Supports an
 * `indeterminate` visual state.
 */
export function Checkbox({ checked = false, indeterminate = false, disabled = false, label = null, id, style = {}, onChange, ...props }) {
  const { hover, focus, bind } = useInteractive();
  const on = checked || indeterminate;

  return (
    <label
      htmlFor={id}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-base)',
        color: 'var(--text-primary)',
        ...style,
      }}
    >
      <span
        {...bind}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 18,
          height: 18,
          flexShrink: 0,
          borderRadius: 'var(--radius-xs)',
          background: on ? 'var(--accent-solid)' : 'var(--surface-inset)',
          border: `1px solid ${on ? 'var(--accent-solid)' : hover ? 'var(--neutral-500)' : 'var(--border-strong)'}`,
          boxShadow: focus ? '0 0 0 3px var(--accent-subtle)' : 'none',
          transition: 'background var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)',
          color: 'var(--white)',
        }}
      >
        <input
          type="checkbox"
          id={id}
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          {...props}
          style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
        />
        {indeterminate ? (
          <span style={{ width: 9, height: 2, background: 'var(--white)', borderRadius: 1 }} />
        ) : checked ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2.5 6.2 L5 8.5 L9.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </span>
      {label}
    </label>
  );
}
