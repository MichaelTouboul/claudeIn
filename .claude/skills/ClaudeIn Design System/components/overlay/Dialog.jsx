import { useEffect } from 'react';

import { IconButton } from '../forms/IconButton';

/**
 * Modal dialog with a scrim. `variant` is 'center' (default) or 'drawer-right'.
 * Renders nothing when `open` is false. Closes on Esc and scrim click.
 */
export function Dialog({ open, onClose, title = null, description = null, variant = 'center', width = 440, footer = null, children, style = {} }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const isDrawer = variant === 'drawer-right';

  const panel = {
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--surface-1)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    boxShadow: 'var(--shadow-dialog)',
    ...(isDrawer
      ? { width, maxWidth: '92vw', height: '100%', borderRadius: 0, borderRight: 'none', borderTop: 'none', borderBottom: 'none' }
      : { width, maxWidth: '92vw', maxHeight: '88vh', borderRadius: 'var(--radius-lg)' }),
    ...style,
  };

  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: isDrawer ? 'stretch' : 'center',
        justifyContent: isDrawer ? 'flex-end' : 'center',
        padding: isDrawer ? 0 : 'var(--space-6)',
        background: 'var(--surface-overlay)',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} className="ci-fade-in" style={panel}>
        {(title || onClose) ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 'var(--space-4)',
              padding: 'var(--space-5) var(--space-5) var(--space-4)',
              borderBottom: title ? '1px solid var(--border-subtle)' : 'none',
            }}
          >
            <div>
              {title ? <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)' }}>{title}</div> : null}
              {description ? (
                <div style={{ marginTop: 4, color: 'var(--text-tertiary)', fontSize: 'var(--text-base)', lineHeight: 'var(--leading-base)' }}>
                  {description}
                </div>
              ) : null}
            </div>
            {onClose ? (
              <IconButton aria-label="Close" size="sm" onClick={onClose} style={{ marginTop: -2, marginRight: -4 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M3.5 3.5 L10.5 10.5 M10.5 3.5 L3.5 10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </IconButton>
            ) : null}
          </div>
        ) : null}

        <div style={{ padding: 'var(--space-5)', overflowY: 'auto', flex: 1 }}>{children}</div>

        {footer ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 'var(--space-2)',
              padding: 'var(--space-4) var(--space-5)',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
