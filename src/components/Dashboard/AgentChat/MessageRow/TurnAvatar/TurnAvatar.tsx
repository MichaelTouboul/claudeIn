import { Bot, ChevronRight, type LucideIcon, Shield, Wrench } from 'lucide-react';

import { cn } from '@/lib/utils';

/** The four turn identities a chat row can present. Each maps to one avatar
 *  treatment (icon + tint) — an explicit value→behavior table, not a fallback
 *  chain. */
export const TurnKind = {
  User: 'user',
  Claude: 'claude',
  Tool: 'tool',
  Authorization: 'authorization',
} as const;
export type TurnKind = (typeof TurnKind)[keyof typeof TurnKind];

type AvatarStyle = { icon: LucideIcon; className: string; style: React.CSSProperties };

const AVATAR: Record<TurnKind, AvatarStyle> = {
  [TurnKind.User]: {
    icon: ChevronRight,
    className: 'border bg-surface-3 text-fg-muted',
    style: { borderColor: 'var(--color-border-strong)' },
  },
  [TurnKind.Claude]: {
    icon: Bot,
    className: 'border',
    style: {
      background: 'color-mix(in srgb, var(--color-accent-text) 16%, var(--color-surface-2))',
      borderColor: 'color-mix(in srgb, var(--color-accent-text) 30%, transparent)',
      color: 'var(--color-accent-text)',
    },
  },
  [TurnKind.Tool]: {
    icon: Wrench,
    className: 'border bg-surface-2',
    style: { borderColor: 'var(--color-border)', color: 'var(--color-warning)' },
  },
  [TurnKind.Authorization]: {
    icon: Shield,
    className: 'border',
    style: {
      background: 'var(--color-warning-subtle)',
      borderColor: 'var(--color-warning-border)',
      color: 'var(--color-warning)',
    },
  },
};

const ICON_SIZE: Record<TurnKind, number> = {
  [TurnKind.User]: 15,
  [TurnKind.Claude]: 17,
  [TurnKind.Tool]: 15,
  [TurnKind.Authorization]: 16,
};

export type TurnAvatarProps = { kind: TurnKind };

/** 30px square identity avatar for a chat turn — bot / chevron / wrench / shield
 *  glyph tinted per `kind`. */
export function TurnAvatar({ kind }: TurnAvatarProps) {
  const { icon: Icon, className, style } = AVATAR[kind];
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md',
        className,
      )}
      style={style}
    >
      <Icon size={ICON_SIZE[kind]} />
    </span>
  );
}
