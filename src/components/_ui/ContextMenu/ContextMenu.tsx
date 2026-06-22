import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { contentClass, renderContextMenuItem } from './ContextMenuItems';

export type ContextMenuTone = 'default' | 'danger' | 'accent' | 'warning';

export type ContextMenuItem = {
  label: string;
  icon?: ReactNode;
  tone?: ContextMenuTone;
  disabled?: boolean;
  // Renders a trailing check ✓ on a leaf item (radio-style selection, e.g. the
  // current color). Ignored when `submenu` is set.
  selected?: boolean;
  // One level of nested items. When present the entry becomes a submenu trigger;
  // `onSelect` is then unused (the leaf children carry the actions).
  submenu?: ContextMenuItem[];
  onSelect: () => void;
};

export type ContextMenuProps = {
  items: ContextMenuItem[];
  trigger?: ReactNode;
  align?: 'start' | 'center' | 'end';
  /** Accessible name for the default icon-only trigger. */
  triggerLabel?: string;
};

export function ContextMenu({ items, trigger, align = 'end', triggerLabel = 'More actions' }: ContextMenuProps) {
  const defaultTrigger = (
    <button
      aria-label={triggerLabel}
      className="p-1 rounded text-fg-subtle hover:text-fg hover:bg-surface-2 transition-colors"
    >
      <MoreHorizontal size={14} />
    </button>
  );

  const [open, setOpen] = useState(false);

  // Radix closes a modal DropdownMenu on item-select and the originating
  // click can "fall through" to whatever sits beneath the item (e.g. a
  // sibling row button overlapped by an align="end" menu), firing its
  // onClick. To prevent that, we preventDefault() the auto-close-on-select,
  // close the menu deterministically, then run the item action on the next
  // microtask — after the menu (and its pointer interaction) is gone.
  const handleSelect = (event: Event, item: ContextMenuItem) => {
    event.preventDefault();
    setOpen(false);
    queueMicrotask(() => item.onSelect());
  };

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        {trigger ? trigger : defaultTrigger}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align={align} sideOffset={4} className={contentClass}>
          {items.map((item) => renderContextMenuItem({ item, onLeafSelect: handleSelect }))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
