import { useState } from 'react';

/**
 * Lightweight hover/focus tooltip. Wraps a single trigger child and shows
 * `label` on a floating chip. CSS-free positioning via absolute placement.
 */
export function Tooltip({ label, side = 'top', children, style = {} }) {
  const [open, setOpen] = useState(false);

  const pos = {
    top:    { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px' },
    bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '8px' },
    left:   { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: '8px' },
    right:  { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '8px' },
  }[side];

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open ? (
        <span
          role="tooltip"
          className="ci-fade-in"
          style={{
            position: 'absolute',
            zIndex: 60,
            whiteSpace: 'nowrap',
            padding: '5px 9px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--surface-3)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--weight-medium)',
            boxShadow: 'var(--shadow-popover)',
            pointerEvents: 'none',
            ...pos,
            ...style,
          }}
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
