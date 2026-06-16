import { useInteractive } from '../lib/useInteractive';
import { Spinner } from '../feedback/Spinner';

const SIZES = {
  sm: { height: 'var(--control-sm)', padding: '0 10px', fontSize: 'var(--text-sm)', gap: '6px', radius: 'var(--radius-sm)' },
  md: { height: 'var(--control-md)', padding: '0 14px', fontSize: 'var(--text-base)', gap: '8px', radius: 'var(--radius-md)' },
  lg: { height: 'var(--control-lg)', padding: '0 20px', fontSize: 'var(--text-md)', gap: '8px', radius: 'var(--radius-md)' },
};

function intentStyle(intent, hover, active) {
  switch (intent) {
    case 'primary':
      return {
        background: active ? 'var(--accent-active)' : 'var(--accent-solid)',
        color: 'var(--text-on-accent)',
        border: '1px solid transparent',
        filter: hover && !active ? 'brightness(1.08)' : 'none',
      };
    case 'secondary':
      return {
        background: hover ? 'var(--surface-3)' : 'var(--surface-2)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-strong)',
      };
    case 'outline':
      return {
        background: hover ? 'var(--surface-2)' : 'transparent',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-strong)',
      };
    case 'danger':
      return {
        background: hover ? 'var(--danger-subtle)' : 'transparent',
        color: 'var(--danger)',
        border: '1px solid transparent',
      };
    case 'danger-solid':
      return {
        background: 'var(--danger-solid)',
        color: 'var(--white)',
        border: '1px solid transparent',
        filter: hover ? 'brightness(1.07)' : 'none',
      };
    case 'ghost':
    default:
      return {
        background: hover ? 'var(--surface-2)' : 'transparent',
        color: hover ? 'var(--text-primary)' : 'var(--text-secondary)',
        border: '1px solid transparent',
      };
  }
}

/**
 * The primary action control. Calm indigo fill for the main action, quieter
 * secondary/ghost/outline treatments, and red danger variants.
 */
export function Button({
  intent = 'secondary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  leftIcon = null,
  rightIcon = null,
  style = {},
  children,
  ...props
}) {
  const { hover, active, focus, bind } = useInteractive();
  const s = SIZES[size] || SIZES.md;
  const isDisabled = disabled || loading;

  return (
    <button
      type="button"
      disabled={isDisabled}
      {...bind}
      {...props}
      style={{
        display: fullWidth ? 'flex' : 'inline-flex',
        width: fullWidth ? '100%' : undefined,
        alignItems: 'center',
        justifyContent: 'center',
        gap: s.gap,
        height: s.height,
        padding: s.padding,
        fontFamily: 'var(--font-sans)',
        fontSize: s.fontSize,
        fontWeight: 'var(--weight-medium)',
        lineHeight: 1,
        borderRadius: s.radius,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.5 : 1,
        whiteSpace: 'nowrap',
        transition: 'background var(--duration-fast) var(--ease-standard), filter var(--duration-fast) var(--ease-standard)',
        outline: focus ? '2px solid var(--focus-ring)' : '2px solid transparent',
        outlineOffset: '2px',
        ...intentStyle(intent, hover, active),
        ...style,
      }}
    >
      {loading ? <Spinner size={size === 'lg' ? 16 : 14} /> : leftIcon}
      {children}
      {!loading ? rightIcon : null}
    </button>
  );
}
