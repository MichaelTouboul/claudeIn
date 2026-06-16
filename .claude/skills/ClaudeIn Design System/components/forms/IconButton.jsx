import { useInteractive } from '../lib/useInteractive';

const SIZES = {
  sm: { box: 'var(--control-sm)', radius: 'var(--radius-sm)' },
  md: { box: 'var(--control-md)', radius: 'var(--radius-md)' },
  lg: { box: 'var(--control-lg)', radius: 'var(--radius-md)' },
};

/**
 * Square, icon-only button. Same intent vocabulary as Button but sized to a
 * single glyph. Always pass an `aria-label`.
 */
export function IconButton({
  intent = 'ghost',
  size = 'md',
  active: pressed = false,
  disabled = false,
  style = {},
  children,
  ...props
}) {
  const { hover, focus, bind } = useInteractive();
  const s = SIZES[size] || SIZES.md;

  let bg = 'transparent';
  let color = 'var(--text-secondary)';
  let border = '1px solid transparent';
  if (intent === 'primary') {
    bg = 'var(--accent-solid)';
    color = 'var(--text-on-accent)';
  } else if (intent === 'outline') {
    border = '1px solid var(--border-strong)';
    color = 'var(--text-primary)';
    if (hover) bg = 'var(--surface-2)';
  } else {
    if (pressed) {
      bg = 'var(--accent-subtle)';
      color = 'var(--accent-text)';
    } else if (hover) {
      bg = 'var(--surface-2)';
      color = 'var(--text-primary)';
    }
  }

  return (
    <button
      type="button"
      disabled={disabled}
      {...bind}
      {...props}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: s.box,
        height: s.box,
        padding: 0,
        borderRadius: s.radius,
        background: bg,
        color,
        border,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard)',
        outline: focus ? '2px solid var(--focus-ring)' : '2px solid transparent',
        outlineOffset: '2px',
        ...style,
      }}
    >
      {children}
    </button>
  );
}
