/**
 * Compact segmented control for 2–4 mutually exclusive options (view modes,
 * filters). `options` is `{ value, label, icon? }[]`.
 */
export function SegmentedControl({ options = [], value, onChange, size = 'md', style = {}, ...props }) {
  const h = size === 'sm' ? 28 : 34;
  return (
    <div
      role="radiogroup"
      {...props}
      style={{
        display: 'inline-flex',
        padding: 3,
        gap: 2,
        background: 'var(--surface-inset)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        ...style,
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              height: h,
              padding: '0 12px',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              background: active ? 'var(--surface-3)' : 'transparent',
              color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--weight-medium)',
              cursor: 'pointer',
              boxShadow: active ? 'var(--shadow-xs)' : 'none',
              transition: 'background var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard)',
            }}
          >
            {o.icon ? <span style={{ display: 'flex' }}>{o.icon}</span> : null}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
