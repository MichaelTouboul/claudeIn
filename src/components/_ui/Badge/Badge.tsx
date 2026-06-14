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
  blue:   { bg: 'rgba(59,130,246,0.12)',  text: '#93c5fd', border: 'rgba(59,130,246,0.2)' },
  green:  { bg: 'rgba(34,197,94,0.12)',   text: '#86efac', border: 'rgba(34,197,94,0.2)' },
  yellow: { bg: 'rgba(234,179,8,0.12)',   text: '#fde047', border: 'rgba(234,179,8,0.2)' },
  orange: { bg: 'rgba(249,115,22,0.12)',  text: '#fdba74', border: 'rgba(249,115,22,0.2)' },
  cyan:   { bg: 'var(--color-accent-dim)', text: 'var(--color-accent)', border: 'rgba(6,182,212,0.2)' },
  purple: { bg: 'rgba(168,85,247,0.12)',  text: '#c4b5fd', border: 'rgba(168,85,247,0.2)' },
  pink:   { bg: 'rgba(236,72,153,0.12)',  text: '#f9a8d4', border: 'rgba(236,72,153,0.2)' },
  gray:   { bg: 'var(--color-surface-3)', text: 'var(--color-text-secondary)', border: 'var(--color-border-subtle)' },
  red:    { bg: 'rgba(248,113,113,0.12)', text: '#fca5a5', border: 'rgba(248,113,113,0.2)' },
};

export function isBadgeVariant(v: string): v is BadgeVariant {
  return v in COLOR_MAP;
}

export function toBadgeVariant(v: string): BadgeVariant {
  return isBadgeVariant(v) ? v : 'gray';
}

export type BadgeShape = 'rounded' | 'pill';

const SHAPE_CLASS: Record<BadgeShape, string> = {
  rounded: 'rounded',
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
