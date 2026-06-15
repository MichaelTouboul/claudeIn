import { type ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export type BadgeVariant =
  | 'blue'
  | 'green'
  | 'yellow'
  | 'orange'
  | 'cyan'
  | 'purple'
  | 'pink'
  | 'gray'
  | 'red';

const COLOR_MAP: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  blue:   { bg: 'rgba(109,168,255,0.14)', text: '#a9cdff', border: 'rgba(109,168,255,0.25)' },
  green:  { bg: 'rgba(69,212,131,0.14)',  text: '#8fe6b4', border: 'rgba(69,212,131,0.25)' },
  yellow: { bg: 'rgba(240,193,75,0.14)',  text: '#f4d589', border: 'rgba(240,193,75,0.25)' },
  orange: { bg: 'rgba(255,157,92,0.14)',  text: '#ffc09a', border: 'rgba(255,157,92,0.25)' },
  cyan:   { bg: 'var(--color-accent-dim)', text: 'var(--color-accent)', border: 'rgba(129,140,248,0.25)' },
  purple: { bg: 'rgba(183,148,246,0.14)', text: '#cdb6f9', border: 'rgba(183,148,246,0.25)' },
  pink:   { bg: 'rgba(247,143,194,0.14)', text: '#fab4d7', border: 'rgba(247,143,194,0.25)' },
  gray:   { bg: 'var(--color-surface-3)', text: 'var(--color-text-secondary)', border: 'var(--color-border-subtle)' },
  red:    { bg: 'rgba(255,133,133,0.14)', text: '#ffb0b0', border: 'rgba(255,133,133,0.25)' },
};

export function isBadgeVariant(v: string): v is BadgeVariant {
  return v in COLOR_MAP;
}

export function toBadgeVariant(v: string): BadgeVariant {
  return isBadgeVariant(v) ? v : 'gray';
}

export type BadgeShape = 'rounded' | 'pill';

const SHAPE_CLASS: Record<BadgeShape, string> = {
  rounded: 'rounded-sm',
  pill: 'rounded-full',
};

export type BadgeProps = ComponentProps<'span'> & {
  variant?: BadgeVariant;
  shape?: BadgeShape;
};

export function Badge({
  variant = 'gray',
  shape = 'rounded',
  className,
  style,
  children,
  ...props
}: BadgeProps) {
  const c = COLOR_MAP[variant];
  return (
    <span
      {...props}
      className={cn('px-2 py-0.5 text-xs font-medium font-mono', SHAPE_CLASS[shape], className)}
      style={{
        background: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
        letterSpacing: '0.01em',
        ...style,
      }}
    >
      {children}
    </span>
  );
}
