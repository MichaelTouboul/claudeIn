import { Wrench } from 'lucide-react';

import { ItemContextMenu } from '@/components/Dashboard/ItemContextMenu/ItemContextMenu';
import { useProject } from '@/contexts/ProjectContext';
import type { SkillSummary } from '@/lib/types';
import { useFavoritesStore } from '@/store/dashboard/useFavoritesStore';

export type SkillRowProps = {
  skill: SkillSummary;
  selected: boolean;
  onSelect: (s: SkillSummary) => void;
};

export function SkillRow({
  skill,
  selected,
  onSelect,
}: SkillRowProps) {
  const { projectId } = useProject();
  const isFavorite = useFavoritesStore((s) =>
    (s.byProject[projectId ?? ''] || []).some((f) => f.item_type === 'skill' && f.item_name === skill.name)
  );
  const onToggleFavorite = () => {
    if (projectId) void useFavoritesStore.getState().toggle(projectId, 'skill', skill.name);
  };
  return (
    <div className="flex items-center group">
      <button
        onClick={() => onSelect(skill)}
        className={`flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
          selected ? "bg-surface-3 text-fg" : "text-fg hover:bg-surface-2"
        }`}
      >
        <Wrench size={11} className="text-active shrink-0" />
        <span className="truncate text-xs font-medium">{skill.name}</span>
      </button>
      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <ItemContextMenu isFavorite={isFavorite} onToggleFavorite={onToggleFavorite} />
      </div>
    </div>
  );
}
