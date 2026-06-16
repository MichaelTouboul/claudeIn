import { Zap } from 'lucide-react';

import { Badge } from '@/components/_ui/Badge';
import { ItemContextMenu } from '@/components/Dashboard/ItemContextMenu/ItemContextMenu';
import { useProject } from '@/contexts/ProjectContext';
import type { HookConfig } from '@/hooks/useProjects';
import { useFavoritesStore } from '@/store/dashboard/useFavoritesStore';

import { LibraryTile } from '../LibraryNav/LibraryTile/LibraryTile';

export type HookRowProps = {
  hook: HookConfig;
};

/**
 * A redesigned Library hook row (library.html grammar): a warning-tinted tile, a
 * warning event Badge + matcher on the primary line, the command on the
 * secondary line, and a hover More menu. Hooks have no scope, so no ScopeBadge.
 */
export function HookRow({ hook }: HookRowProps) {
  const { projectId } = useProject();
  const favoriteName = `${hook.event}:${hook.matcher}`;
  const isFavorite = useFavoritesStore((s) =>
    (s.byProject[projectId ?? ''] || []).some((f) => f.item_type === 'hook' && f.item_name === favoriteName),
  );
  const onToggleFavorite = () => {
    if (projectId) void useFavoritesStore.getState().toggle(projectId, 'hook', favoriteName);
  };

  return (
    <div className="group flex items-center gap-2.5 px-2.5 py-2 mx-2 rounded-md overflow-hidden hover:bg-surface-2 transition-colors">
      <LibraryTile icon={<Zap size={15} />} color="var(--color-warning)" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <Badge variant="yellow">{hook.event}</Badge>
          <span className="truncate text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
            {hook.matcher}
          </span>
        </div>
        <span className="block truncate text-xs font-mono mt-px" style={{ color: 'var(--color-text-secondary)' }}>
          {hook.command}
        </span>
      </div>
      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <ItemContextMenu isFavorite={isFavorite} onToggleFavorite={onToggleFavorite} />
      </div>
    </div>
  );
}
