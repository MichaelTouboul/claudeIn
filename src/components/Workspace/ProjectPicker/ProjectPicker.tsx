import { Plus } from 'lucide-react';

import { Popover, PopoverClose } from '@/components/_ui/Popover';
import { useProjects } from '@/hooks/useProjects';
import type { Project } from '@/types/dashboard.types';

export type ProjectPickerProps = {
  onSelect: (project: Project) => void;
  openIds: string[];
};

export function ProjectPicker({ onSelect, openIds }: ProjectPickerProps) {
  const { projects } = useProjects();

  const trigger = (
    <button
      title="Open a project"
      aria-label="Open a project"
      className="flex items-center justify-center w-7 h-7 rounded-md transition-colors"
      style={{ color: 'var(--color-text-muted)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <Plus size={15} />
    </button>
  );

  return (
    <Popover trigger={trigger} align="start" className="w-72 max-h-80 overflow-y-auto">
      {projects.map((p) => {
        const alreadyOpen = openIds.includes(p.id);
        return (
          <PopoverClose asChild key={p.id}>
            <button
              onClick={() => onSelect(p)}
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
          </PopoverClose>
        );
      })}
    </Popover>
  );
}
