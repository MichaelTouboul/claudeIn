import { X } from 'lucide-react';
import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type TabItem = { key: string; label: string; icon?: ReactNode; onClose?: (key: string) => void };

export type TabsProps = {
  tabs: TabItem[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
};

export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  const move = (dir: 1 | -1) => {
    const i = tabs.findIndex((t) => t.key === active);
    if (i === -1) return;
    const next = tabs[(i + dir + tabs.length) % tabs.length];
    onChange(next.key);
  };

  return (
    <div
      role="tablist"
      className={cn('flex items-center gap-1 px-4 py-2', className)}
      style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') {
                e.preventDefault();
                move(1);
              }
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                move(-1);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md min-w-0 text-sm font-medium outline-none transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
            style={{
              ...(isActive
                ? {
                    background: 'var(--color-surface-3)',
                    color: 'var(--color-text-primary)',
                  }
                : { color: 'var(--color-text-muted)' }),
            }}
          >
            {tab.icon ? <span className="shrink-0 inline-flex items-center">{tab.icon}</span> : null}
            <span className="truncate" style={{ maxWidth: '14rem' }} title={tab.label}>
              {tab.label}
            </span>
            {tab.onClose ? (
              <span
                role="button"
                aria-label={`Close ${tab.label}`}
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  tab.onClose?.(tab.key);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    tab.onClose?.(tab.key);
                  }
                }}
                className="ml-1 shrink-0 inline-flex items-center justify-center w-3.5 h-3.5 rounded opacity-50 hover:opacity-100"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <X size={11} />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
