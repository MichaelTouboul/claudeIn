import { Settings } from 'lucide-react';

import { ItemContextMenu } from '@/components/ItemContextMenu/ItemContextMenu';
import type { HookConfig } from '@/hooks/useProjects';
import { useProject } from '@/store/ProjectContext';
import { useFavoritesStore } from '@/store/useFavoritesStore';

export type HookRowProps = {
  hook: HookConfig;
};

export function HookRow({
  hook,
}: HookRowProps) {
  const { projectId } = useProject();
  const favoriteName = `${hook.event}:${hook.matcher}`;
  const isFavorite = useFavoritesStore((s) =>
    (s.byProject[projectId] || []).some((f) => f.item_type === 'hook' && f.item_name === favoriteName)
  );
  const onToggleFavorite = () => useFavoritesStore.getState().toggle(projectId, 'hook', favoriteName);
  return (
    <div className="flex items-center group">
      <div className="flex-1 flex items-center gap-2 px-3 py-1.5 text-xs">
        <Settings size={10} className="text-yellow-400 shrink-0" />
        <span className="text-yellow-400 font-mono">{hook.event}</span>
        <span className="text-fg-subtle">→</span>
        <span className="text-fg-muted font-mono truncate">{hook.matcher}</span>
      </div>
      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <ItemContextMenu isFavorite={isFavorite} onToggleFavorite={onToggleFavorite} />
      </div>
    </div>
  );
}
