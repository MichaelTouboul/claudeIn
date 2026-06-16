const SIZES = { xs: 20, sm: 26, md: 32, lg: 40 };

const AGENT_HUES = {
  cyan: 'var(--agent-cyan)', blue: 'var(--agent-blue)', green: 'var(--agent-green)',
  yellow: 'var(--agent-yellow)', orange: 'var(--agent-orange)', red: 'var(--agent-red)',
  purple: 'var(--agent-purple)', pink: 'var(--agent-pink)',
};

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Identity avatar. Renders `src` image when present, otherwise tinted initials.
 * `hue` accepts an agent color name to tint the fallback.
 */
export function Avatar({ name = '', src = null, size = 'md', hue = 'blue', square = false, style = {}, ...props }) {
  const px = SIZES[size] || SIZES.md;
  const tint = AGENT_HUES[hue] || AGENT_HUES.blue;

  return (
    <span
      {...props}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: px,
        height: px,
        flexShrink: 0,
        borderRadius: square ? 'var(--radius-md)' : '50%',
        overflow: 'hidden',
        background: src ? 'var(--surface-3)' : `color-mix(in srgb, ${tint} 18%, var(--surface-2))`,
        border: `1px solid ${src ? 'var(--border)' : `color-mix(in srgb, ${tint} 30%, transparent)`}`,
        color: tint,
        fontFamily: 'var(--font-mono)',
        fontSize: Math.round(px * 0.38),
        fontWeight: 'var(--weight-semibold)',
        ...style,
      }}
    >
      {src ? (
        <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        initials(name)
      )}
    </span>
  );
}
