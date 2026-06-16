/**
 * Keyboard key cap, e.g. <Kbd>⌘</Kbd> <Kbd>K</Kbd>. Renders small mono glyphs
 * on a raised cap.
 */
export function Kbd({ style = {}, children, ...props }) {
  return (
    <kbd
      {...props}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 18,
        height: 18,
        padding: '0 5px',
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        color: 'var(--text-secondary)',
        background: 'var(--surface-3)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-xs)',
        boxShadow: '0 1px 0 var(--border-strong)',
        lineHeight: 1,
        ...style,
      }}
    >
      {children}
    </kbd>
  );
}
