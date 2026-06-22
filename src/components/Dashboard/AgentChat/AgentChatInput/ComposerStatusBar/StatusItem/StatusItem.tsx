import { ChevronDown } from 'lucide-react';
import { type ReactNode } from 'react';

import { ContextMenu, type ContextMenuItem } from '@/components/_ui/ContextMenu';
import { Tooltip } from '@/components/_ui/Tooltip';
import { cn } from '@/lib/utils';

export type StatusItemProps = {
  /** Leading icon (rendered in the tertiary tier). */
  icon?: ReactNode;
  /** The item's value content (a branch name, model label, mode…). */
  children: ReactNode;
  /** Menu entries; when present the item is a dropdown trigger with a chevron. */
  menu?: ContextMenuItem[];
  /** Hover tooltip. */
  tip?: string;
};

/**
 * One status-strip item. With a `menu` it's a dropdown trigger (value + a small
 * chevron); without, a plain inline read-out. A `tip` wraps it in a Tooltip.
 * Visuals come from the design tokens — quiet at rest, surface-2 fill on hover.
 */
export function StatusItem({ icon, children, menu, tip }: StatusItemProps) {
  const inner = (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded text-fg-subtle whitespace-nowrap cursor-pointer',
        'transition-colors hover:bg-surface-2 hover:text-fg-muted',
      )}
    >
      {icon ? <span className="flex text-fg-subtle">{icon}</span> : null}
      {children}
      {menu ? <ChevronDown size={12} aria-hidden="true" /> : null}
    </span>
  );

  const node = menu ? <ContextMenu items={menu} align="start" trigger={inner} /> : inner;
  return tip ? <Tooltip label={tip}>{node}</Tooltip> : node;
}
