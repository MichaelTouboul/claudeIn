import { Wrench } from 'lucide-react';

import type { SkillFile } from '@/hooks/useProjects';
import { ItemContextMenu } from '@/components/ItemContextMenu/ItemContextMenu';

export type SkillRowProps = {
  skill: SkillFile;
  selected: boolean;
  isFavorite: boolean;
  onSelect: (s: SkillFile) => void;
  onToggleFavorite: () => void;
};

export function SkillRow({
  skill,
  selected,
  isFavorite,
  onSelect,
  onToggleFavorite,
}: SkillRowProps) {
  return (
    <div className="flex items-center group">
      <button
        onClick={() => onSelect(skill)}
        className={`flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
          selected ? "bg-surface-3 text-white" : "text-fg hover:bg-surface-2"
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
