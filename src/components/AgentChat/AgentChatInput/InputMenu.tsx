import { useEffect, useRef } from 'react';

import { cn } from '@/lib/cn';

/** One selectable row. `id` is the value passed back on select; `flatIndex` is its
 *  position in the flattened item list (used for keyboard highlight). */
export type InputMenuItem = {
  id: string;
  label: string;
  hint?: string;
  flatIndex: number;
};

export type InputMenuGroup = {
  key: string;
  title: string;
  icon?: string;
  items: InputMenuItem[];
};

export type InputMenuProps = {
  groups: InputMenuGroup[];
  activeIndex: number;
  /** Monospace + accent-tinted label column (used by the slash menu). */
  mono?: boolean;
  onSelect: (id: string) => void;
};

/** Shared dropdown surface for the slash (`/`) and mention (`@`) input menus.
 *  Kept local to AgentChat: it encodes chat-specific grouping/label layout rather
 *  than being a generic primitive, so it does not belong in `_ui/`. */
export function InputMenu({ groups, activeIndex, mono, onSelect }: InputMenuProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Keep the highlighted row scrolled into view as the user arrows through.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-flat-index="${activeIndex}"]`);
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex]);

  return (
    <div
      ref={listRef}
      role="listbox"
      className="absolute bottom-full left-3 right-3 mb-1 rounded-lg shadow-xl max-h-56 overflow-y-auto py-1 z-20"
      style={{
        background: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
      }}
    >
      {groups.map((group) => (
        <div key={group.key}>
          {group.title ? (
            <div
              className="px-3 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}
            >
              {group.icon ? <span className="mr-1">{group.icon}</span> : null}
              {group.title}
            </div>
          ) : null}
          {group.items.map((item) => {
            const active = item.flatIndex === activeIndex;
            return (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={active}
                data-flat-index={item.flatIndex}
                onMouseDown={(e) => {
                  // Prevent the editor from losing focus before the click resolves.
                  e.preventDefault();
                  onSelect(item.id);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-1.5 text-xs transition-colors text-left'
                )}
                style={{
                  background: active ? 'var(--color-accent-dim)' : 'transparent',
                  color: active ? 'var(--color-accent)' : 'var(--color-text-primary)',
                }}
              >
                <span
                  className={cn('shrink-0 w-32 truncate', mono && 'font-mono')}
                  style={mono ? { fontFamily: 'var(--font-mono)' } : undefined}
                >
                  {item.label}
                </span>
                {item.hint ? (
                  <span className="truncate" style={{ color: 'var(--color-text-secondary)' }}>
                    {item.hint}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
