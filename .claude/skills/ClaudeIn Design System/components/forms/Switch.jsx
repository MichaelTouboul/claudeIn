import { useInteractive } from '../lib/useInteractive';

/**
 * On/off toggle switch. Controlled via `checked` / `onChange`. Optional inline
 * `label` rendered after the track.
 */
export function Switch({ checked = false, disabled = false, label = null, id, onChange, style = {}, ...props }) {
  const { focus, bind } = useInteractive();

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
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          width: 36,
          height: 20,
          flexShrink: 0,
          borderRadius: 'var(--radius-pill)',
          background: checked ? 'var(--accent-solid)' : 'var(--surface-3)',
          border: `1px solid ${checked ? 'var(--accent-solid)' : 'var(--border-strong)'}`,
          boxShadow: focus ? '0 0 0 3px var(--accent-subtle)' : 'none',
          transition: 'background var(--duration-base) var(--ease-standard), border-color var(--duration-base) var(--ease-standard)',
        }}
      >
        <input
          type="checkbox"
          role="switch"
          id={id}
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          {...props}
          style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
        />
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 18 : 2,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: 'var(--white)',
            boxShadow: 'var(--shadow-xs)',
            transition: 'left var(--duration-base) var(--ease-out)',
          }}
        />
      </span>
      {label}
    </label>
  );
}
