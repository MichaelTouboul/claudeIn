import { FolderOpen } from 'lucide-react';

import { useFavoriteRepos } from '@/hooks/useFavoriteRepos';
import { useProjects } from '@/hooks/useProjects';
import type { Project } from '@/lib/types';
import { projectForFavorite, repoBasename } from '@/lib/utils';

export type ProjectListProps = {
  onSelect: (project: Project) => void;
  openIds: string[];
};

/**
 * Launcher list of the user's favorite repos. Each entry opens its repo through
 * the SAME flow as before (`onSelect(project)`): a favorite is resolved to a
 * `Project` via `projectForFavorite` — reusing a scanned match when present, or
 * a minimal project built from the favorite path otherwise. The escape-hatch
 * button opens an ad-hoc (non-favorite) folder via the directory picker.
 */
export function ProjectList({ onSelect, openIds }: ProjectListProps) {
  const { repos, loading } = useFavoriteRepos();
  const { projects } = useProjects();

  const openOther = async () => {
    const dir = await window.api.openDirectoryPicker();
    if (dir === null) return;
    onSelect(
      projectForFavorite(
        { path: dir, label: null, addedAt: new Date().toISOString(), logoDataUrl: null },
        projects,
      ),
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-md" style={{ border: '1px solid var(--color-border-subtle)' }}>
        {loading ? (
          <p className="px-3 py-2 text-[11px]" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
            Loading favorites…
          </p>
        ) : repos.length === 0 ? (
          <p className="px-3 py-2 text-[11px]" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
            No favorite repos yet.
          </p>
        ) : (
          <div className="max-h-52 overflow-y-auto">
            {repos.map((repo) => {
              const project = projectForFavorite(repo, projects);
              const alreadyOpen = openIds.includes(project.id);
              return (
                <button
                  key={repo.path}
                  onClick={() => onSelect(project)}
                  className="w-full text-left px-3 py-2 transition-colors"
                  style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-3)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span className="text-[13px] truncate block">{repoBasename(repo.path)}</span>
                  <span
                    className="text-[10px] truncate block"
                    style={{ color: alreadyOpen ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
                  >
                    {alreadyOpen ? 'already open' : repo.path}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => void openOther()}
        className="flex items-center gap-1.5 px-3 py-2 rounded-md text-[12px] transition-colors"
        style={{
          color: 'var(--color-text-secondary)',
          fontFamily: 'var(--font-mono)',
          border: '1px solid var(--color-border-subtle)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-3)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <FolderOpen size={13} />
        Open other folder…
      </button>
    </div>
  );
}
