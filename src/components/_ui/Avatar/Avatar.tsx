import { cva, type VariantProps } from 'class-variance-authority';
import { type ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/** Agent identity hues — mirror the `.agent-color-*` classes in index.css. */
export type AvatarHue =
  | 'cyan'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'orange'
  | 'red'
  | 'purple'
  | 'pink';

const HUE_CLASS: Record<AvatarHue, string> = {
  cyan: 'agent-color-cyan',
  blue: 'agent-color-blue',
  green: 'agent-color-green',
  yellow: 'agent-color-yellow',
  orange: 'agent-color-orange',
  red: 'agent-color-red',
  purple: 'agent-color-purple',
  pink: 'agent-color-pink',
};

const avatar = cva(
  'inline-flex shrink-0 items-center justify-center overflow-hidden font-mono font-semibold leading-none',
  {
    variants: {
      size: {
        xs: 'h-5 w-5 text-[8px]',
        sm: 'h-[26px] w-[26px] text-[10px]',
        md: 'h-8 w-8 text-xs',
        lg: 'h-10 w-10 text-[15px]',
      },
      shape: {
        circle: 'rounded-full',
        square: 'rounded-md',
      },
    },
    defaultVariants: {
      size: 'md',
      shape: 'circle',
    },
  },
);

function initials(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export type AvatarProps = Omit<ComponentProps<'span'>, 'children'> &
  VariantProps<typeof avatar> & {
    /** Display name — drives the initials fallback and the image alt text. */
    name: string;
    /** Optional image source; when set, replaces the initials fallback. */
    src?: string | null;
    /** Identity hue tinting the initials fallback. */
    hue?: AvatarHue;
  };

/**
 * Identity avatar. Renders `src` as an image when present, otherwise tinted
 * initials derived from `name`. `hue` tints the fallback via the shared
 * `--agent-color` token. Token-driven, no domain knowledge.
 */
export function Avatar({
  name,
  src = null,
  size,
  shape,
  hue = 'blue',
  className,
  style,
  ...props
}: AvatarProps) {
  const tinted = src === null || src === undefined;
  return (
    <span
      {...props}
      className={cn(avatar({ size, shape }), tinted && HUE_CLASS[hue], className)}
      style={{
        background: tinted
          ? 'color-mix(in srgb, var(--agent-color) 18%, var(--color-surface-2))'
          : 'var(--color-surface-3)',
        border: tinted
          ? '1px solid color-mix(in srgb, var(--agent-color) 30%, transparent)'
          : '1px solid var(--color-border)',
        color: 'var(--agent-color)',
        ...style,
      }}
    >
      {tinted ? (
        initials(name)
      ) : (
        <img src={src ?? undefined} alt={name} className="h-full w-full object-cover" />
      )}
    </span>
  );
}
