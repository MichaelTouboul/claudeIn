import { Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useDashboardStore } from '@/store/useDashboardStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

export function AddTabMenu() {
  const agents = useDashboardStore((s) => s.agents);
  const addTab = useWorkspaceStore((s) => s.addTab);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="New tab"
        className="flex items-center justify-center w-7 h-7 rounded-md"
        style={{ color: 'var(--color-text-muted)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <Plus size={15} />
      </button>

      {open ? (
        <div
          className="absolute top-full left-0 mt-1 w-60 rounded-xl z-50 overflow-hidden max-h-80 overflow-y-auto"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', boxShadow: '0 12px 48px rgba(0,0,0,0.5)' }}
        >
          <button
            onClick={() => {
              addTab({ kind: 'chat', title: 'Chat' });
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2 text-[13px]"
            style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-3)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            + New chat
          </button>
          <div
            className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-widest"
            style={{ color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border-subtle)' }}
          >
            Open agent
          </div>
          {agents.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                addTab({ kind: 'agent', title: a.id, agentName: a.id });
                setOpen(false);
              }}
              className="w-full text-left px-4 py-1.5 text-[13px] truncate"
              style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-3)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {a.id}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
