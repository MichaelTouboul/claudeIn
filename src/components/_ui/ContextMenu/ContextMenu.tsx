import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { cn } from '@/lib/utils';

export type ContextMenuTone = 'default' | 'danger' | 'accent' | 'warning';

export type ContextMenuItem = {
  label: string;
  icon?: ReactNode;
  tone?: ContextMenuTone;
  onSelect: () => void;
};

export type ContextMenuProps = {
  items: ContextMenuItem[];
  trigger?: ReactNode;
  align?: 'start' | 'center' | 'end';
};

const toneClasses: Record<ContextMenuTone, string> = {
  default: 'text-fg-muted data-[highlighted]:text-fg',
  danger: 'text-danger',
  accent: 'text-accent',
  warning: 'text-[#facc15]',
};

const defaultTrigger = (
  <button className="p-1 rounded text-fg-subtle hover:text-fg hover:bg-surface-2 transition-colors">
    <MoreHorizontal size={14} />
  </button>
);

export function ContextMenu({ items, trigger, align = 'end' }: ContextMenuProps) {
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
        <DropdownMenu.Content
          align={align}
          sideOffset={4}
          className="min-w-[176px] py-1 rounded-lg shadow-2xl z-50 overflow-hidden bg-surface-1 border border-border"
        >
          {items.map((item) => (
            <DropdownMenu.Item
              key={item.label}
              onSelect={(event) => handleSelect(event, item)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 text-xs cursor-pointer outline-none transition-colors',
                'data-[highlighted]:bg-surface-2',
                toneClasses[item.tone ?? 'default'],
              )}
            >
              {item.icon ? item.icon : null}
              {item.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
