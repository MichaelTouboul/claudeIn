import { type ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export type KbdProps = ComponentProps<'kbd'>;

/** A keyboard-key glyph: small inset chip in mono, for shortcut hints (⌘⏎). */
export function Kbd({ className, children, ...props }: KbdProps) {
  return (
    <kbd
      {...props}
      className={cn(
        'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded text-[11px] font-mono leading-none',
        className,
      )}
      style={{
        background: 'var(--color-surface-inset)',
        color: 'var(--color-fg-muted)',
        border: '1px solid var(--color-border)',
      }}
    >
      {children}
    </kbd>
  );
}
