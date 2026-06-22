import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { ContextMenuItem, ContextMenuTone } from './ContextMenu';

const toneClasses: Record<ContextMenuTone, string> = {
  default: 'text-fg-muted data-[highlighted]:text-fg',
  danger: 'text-danger',
  accent: 'text-accent',
  warning: 'text-[var(--color-warning)]',
};

const itemClass = cn(
  'w-full flex items-center gap-2.5 px-3 py-2 text-xs cursor-pointer outline-none transition-colors',
  'data-[highlighted]:bg-surface-2',
  'data-[disabled]:opacity-40 data-[disabled]:cursor-default data-[disabled]:pointer-events-none',
);

const contentClass = 'min-w-[176px] py-1 rounded-lg shadow-2xl z-50 overflow-hidden bg-surface-1 border border-border';

export type RenderItemArgs = {
  item: ContextMenuItem;
  onLeafSelect: (event: Event, item: ContextMenuItem) => void;
};

// Renders a single context-menu entry. A leaf item is a `DropdownMenu.Item`; an
// item carrying a `submenu` becomes a `Sub`/`SubTrigger`/`SubContent` trio whose
// children are rendered with the same logic (one level of nesting). `selected`
// surfaces a trailing check on a leaf — used for the color radio-style options.
export function renderContextMenuItem({ item, onLeafSelect }: RenderItemArgs) {
  if (item.submenu) {
    return (
      <DropdownMenu.Sub key={item.label}>
        <DropdownMenu.SubTrigger
          disabled={item.disabled}
          className={cn(itemClass, toneClasses[item.tone ?? 'default'])}
        >
          {item.icon ? item.icon : null}
          <span className="flex-1">{item.label}</span>
          <ChevronRight size={13} className="shrink-0 opacity-60" />
        </DropdownMenu.SubTrigger>
        <DropdownMenu.Portal>
          <DropdownMenu.SubContent sideOffset={4} alignOffset={-4} className={contentClass}>
            {item.submenu.map((sub) => renderContextMenuItem({ item: sub, onLeafSelect }))}
          </DropdownMenu.SubContent>
        </DropdownMenu.Portal>
      </DropdownMenu.Sub>
    );
  }

  return (
    <DropdownMenu.Item
      key={item.label}
      disabled={item.disabled}
      onSelect={(event) => onLeafSelect(event, item)}
      className={cn(itemClass, toneClasses[item.tone ?? 'default'])}
    >
      {item.icon ? item.icon : null}
      <span className="flex-1">{item.label}</span>
      {item.selected ? <Check size={13} className="shrink-0" /> : null}
    </DropdownMenu.Item>
  );
}

export { contentClass };
