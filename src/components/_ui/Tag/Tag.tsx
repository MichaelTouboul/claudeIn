import { type ComponentProps, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type TagProps = Omit<ComponentProps<'span'>, 'onRemove'> & {
  /** Active/selected state — accent treatment. */
  selected?: boolean;
  /** Optional leading glyph. */
  leadingIcon?: ReactNode;
  /** When set, renders a × affordance that calls this on click. */
  onRemove?: () => void;
};

/**
 * Removable / selectable chip — for filters, attachments, selected items.
 * Renders in Geist Mono. Pass `onRemove` for the × affordance, `selected` for
 * the active state. Generic, token-driven, no domain knowledge.
 */
export function Tag({ selected = false, leadingIcon, onRemove, className, children, ...props }: TagProps) {
  return (
    <span
      {...props}
      className={cn(
        'inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-sm border px-2 font-mono text-xs transition-colors',
        selected
          ? 'border-[var(--color-accent)] bg-[var(--color-accent-dim)] text-accent'
          : 'border-border bg-surface-2 text-fg-muted hover:bg-surface-3',
        className,
      )}
    >
      {leadingIcon ? <span className="flex shrink-0">{leadingIcon}</span> : null}
      {children}
      {onRemove ? (
        <button
          type="button"
          aria-label="Remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="-mr-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-[var(--radius-xs)] text-fg-subtle hover:text-fg"
        >
          ×
        </button>
      ) : null}
    </span>
  );
}
