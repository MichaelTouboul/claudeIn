/**
 * Indeterminate loading spinner. Inherits color from `color` prop (defaults to
 * the accent), sized in px. Uses the shipped `.ci-spin` keyframe.
 */
export function Spinner({ size = 16, color = 'var(--accent-text)', thickness = 2, style = {}, ...props }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      {...props}
      className={`ci-spin ${props.className || ''}`}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        border: `${thickness}px solid color-mix(in srgb, ${color} 28%, transparent)`,
        borderTopColor: color,
        boxSizing: 'border-box',
        ...style,
      }}
    />
  );
}
