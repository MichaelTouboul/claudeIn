import { type ReactNode } from 'react';

import { cn } from '@/lib/cn';

export type TabItem = { key: string; label: string; icon?: ReactNode };

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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '0.02em',
              ...(isActive
                ? {
                    background: 'var(--color-surface-3)',
                    color: 'var(--color-text-primary)',
                    boxShadow: '0 0 8px rgba(6, 182, 212, 0.06)',
                  }
                : { color: 'var(--color-text-muted)' }),
            }}
          >
            {tab.icon ?? null}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
