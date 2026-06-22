import { FolderOpen } from 'lucide-react';

import { Badge } from '@/components/_ui/Badge';
import { RepoChip } from '@/components/Dashboard/Workspace/DashboardArea/Dashboard/AllWorktreesPanel/RepoChip';
import { hueForName } from '@/components/Dashboard/Workspace/DashboardArea/Dashboard/WorktreesPanel/worktreeModel';
import { useFavoriteRepos } from '@/hooks/useFavoriteRepos';
import { useProjects } from '@/hooks/useProjects';
import type { Project } from '@/lib/types';
import { projectForFavorite, repoBasename } from '@/lib/utils';

export type ProjectListProps = {
  onSelect: (project: Project) => void;
  openIds: string[];
};

/**
 * The "Open a project" dropdown body: one row per favorite repo showing a hued
 * folder chip, the repo NAME, and its filesystem PATH in mono (NOT the description —
 * fixing the prior bug), plus an "open" badge on the already-open repo. A trailing
 * "Open another folder…" row opens an ad-hoc (non-favorite) folder via the OS
 * directory picker. Each favorite resolves to a `Project` through `projectForFavorite`
 * — reusing a scanned match or a minimal project built from the path.
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
    <>
      <div className="p-1.5" style={{ background: 'var(--color-surface-1)' }}>
        {loading ? (
          <p className="px-2.5 py-2 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            Loading repositories…
          </p>
        ) : repos.length === 0 ? (
          <p className="px-2.5 py-2 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            No favorite repos yet — use “Open another folder…”.
          </p>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto">
            {repos.map((repo) => {
              const project = projectForFavorite(repo, projects);
              const name = repoBasename(repo.path);
              return (
                <button
                  key={repo.path}
                  type="button"
                  onClick={() => onSelect(project)}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors"
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <RepoChip hue={hueForName(name)} size={26} icon={14} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {name}
                    </span>
                    <span
                      className="mt-px block truncate text-[11.5px]"
                      style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
                    >
                      {repo.path}
                    </span>
                  </span>
                  {openIds.includes(project.id) ? (
                    <Badge variant="green" shape="pill" dot>
                      open
                    </Badge>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => void openOther()}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-[13px] transition-colors"
        style={{ borderTop: '1px solid var(--color-border-subtle)', color: 'var(--color-text-secondary)' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-primary)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
      >
        <FolderOpen size={15} />
        Open another folder…
      </button>
    </>
  );
}
