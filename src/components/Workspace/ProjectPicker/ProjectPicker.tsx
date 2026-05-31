import { Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useProjects } from '@/hooks/useProjects';
import type { Project } from '@/types/dashboard.types';

export type ProjectPickerProps = {
  onSelect: (project: Project) => void;
  openIds: string[];
};

export function ProjectPicker({ onSelect, openIds }: ProjectPickerProps) {
  const { projects } = useProjects();
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
        title="Open a project"
        className="flex items-center justify-center w-7 h-7 rounded-md transition-colors"
        style={{ color: 'var(--color-text-muted)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <Plus size={15} />
      </button>

      {open ? (
        <div
          className="absolute top-full left-0 mt-1.5 w-72 rounded-xl z-50 overflow-hidden max-h-80 overflow-y-auto"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', boxShadow: '0 12px 48px rgba(0,0,0,0.5)' }}
        >
          {projects.map((p) => {
            const alreadyOpen = openIds.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => { onSelect(p); setOpen(false); }}
                className="w-full text-left px-4 py-2 transition-colors"
                style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-3)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span className="text-[13px] truncate block">{p.name}</span>
                <span className="text-[10px] truncate block" style={{ color: alreadyOpen ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
                  {alreadyOpen ? 'already open' : p.path}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
