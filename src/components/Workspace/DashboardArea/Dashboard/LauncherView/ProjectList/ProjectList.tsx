import { useProjects } from '@/hooks/useProjects';
import type { Project } from '@/types/dashboard.types';

export type ProjectListProps = {
  onSelect: (project: Project) => void;
  openIds: string[];
};

export function ProjectList({ onSelect, openIds }: ProjectListProps) {
  const { projects } = useProjects();

  if (projects.length === 0) {
    return (
      <p className="px-1 py-2 text-[11px]" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
        No projects found.
      </p>
    );
  }

  return (
    <div className="max-h-52 overflow-y-auto rounded-md" style={{ border: '1px solid var(--color-border-subtle)' }}>
      {projects.map((p) => {
        const alreadyOpen = openIds.includes(p.id);
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className="w-full text-left px-3 py-2 transition-colors"
            style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-3)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <span className="text-[13px] truncate block">{p.name}</span>
            <span
              className="text-[10px] truncate block"
              style={{ color: alreadyOpen ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
            >
              {alreadyOpen ? 'already open' : p.path}
            </span>
          </button>
        );
      })}
    </div>
  );
}
