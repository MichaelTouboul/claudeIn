import { useEffect, useRef, useState } from 'react';

import { useInteractive } from '../lib/useInteractive';

function MenuItem({ item, onClose }) {
  const { hover, bind } = useInteractive();
  if (item.separator) {
    return <div role="separator" style={{ height: 1, margin: '4px 0', background: 'var(--border-subtle)' }} />;
  }
  const danger = item.tone === 'danger';
  return (
    <button
      type="button"
      role="menuitem"
      disabled={item.disabled}
      onClick={() => { item.onSelect?.(); onClose(); }}
      {...bind}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        width: '100%',
        height: 32,
        padding: '0 10px',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        background: hover && !item.disabled ? (danger ? 'var(--danger-subtle)' : 'var(--surface-3)') : 'transparent',
        color: item.disabled ? 'var(--text-disabled)' : danger ? 'var(--danger)' : 'var(--text-secondary)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-base)',
        textAlign: 'left',
        cursor: item.disabled ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {item.icon ? <span style={{ display: 'flex', flexShrink: 0 }}>{item.icon}</span> : null}
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.shortcut ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{item.shortcut}</span> : null}
    </button>
  );
}

/**
 * Dropdown menu. Provide a `trigger` node and `items`
 * (`{ label, icon?, shortcut?, tone?, onSelect, disabled?, separator? }[]`).
 * Manages its own open state and closes on outside click / Esc.
 */
export function Menu({ trigger, items = [], align = 'start', style = {} }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); window.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <span onClick={() => setOpen((v) => !v)} style={{ display: 'inline-flex' }}>{trigger}</span>
      {open ? (
        <div
          role="menu"
          className="ci-fade-in"
          style={{
            position: 'absolute',
            top: '100%',
            [align === 'end' ? 'right' : 'left']: 0,
            marginTop: 6,
            zIndex: 80,
            minWidth: 180,
            padding: 4,
            background: 'var(--surface-3)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-popover)',
            ...style,
          }}
        >
          {items.map((item, i) => (
            <MenuItem key={item.label ? `${item.label}` : `sep-${i}`} item={item} onClose={() => setOpen(false)} />
          ))}
        </div>
      ) : null}
    </span>
  );
}
