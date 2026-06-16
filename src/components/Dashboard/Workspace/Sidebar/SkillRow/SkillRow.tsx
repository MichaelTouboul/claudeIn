import { Sparkles } from 'lucide-react';

import { ItemContextMenu } from '@/components/Dashboard/ItemContextMenu/ItemContextMenu';
import { useProject } from '@/contexts/ProjectContext';
import type { SkillSummary } from '@/lib/types';
import { useFavoritesStore } from '@/store/dashboard/useFavoritesStore';

import { LibraryTile } from '../LibraryNav/LibraryTile/LibraryTile';
import { ItemScope, ScopeBadge } from '../LibraryNav/ScopeBadge/ScopeBadge';

export type SkillRowProps = {
  skill: SkillSummary;
  selected: boolean;
  onSelect: (s: SkillSummary) => void;
};

/**
 * A redesigned Library skill row (library.html grammar): a green-tinted tile,
 * the skill name + its description line, a scope badge, and a hover More menu.
 * Opening routes to the center editor via `onSelect` (see LibraryNav).
 */
export function SkillRow({ skill, selected, onSelect }: SkillRowProps) {
  const { projectId } = useProject();
  const isFavorite = useFavoritesStore((s) =>
    (s.byProject[projectId ?? ''] || []).some((f) => f.item_type === 'skill' && f.item_name === skill.name),
  );
  const onToggleFavorite = () => {
    if (projectId) void useFavoritesStore.getState().toggle(projectId, 'skill', skill.name);
  };
  const scope = skill.scope === 'project' ? ItemScope.Project : ItemScope.User;

  return (
    <div
      className="group flex items-center gap-2.5 px-2.5 py-2 mx-2 rounded-md overflow-hidden hover:bg-surface-2 transition-colors"
      style={selected ? { background: 'var(--color-accent-subtle)' } : undefined}
    >
      <button
        type="button"
        onClick={() => onSelect(skill)}
        className="flex flex-1 items-center gap-2.5 min-w-0 text-left"
      >
        <LibraryTile icon={<Sparkles size={15} />} color="var(--color-active)" />
        <span className="flex-1 min-w-0">
          <span
            className="block truncate text-[13px] font-medium"
            style={{ color: selected ? 'var(--color-accent-text)' : 'var(--color-fg)' }}
          >
            {skill.name}
          </span>
          <span className="block truncate text-xs mt-px" style={{ color: 'var(--color-text-muted)' }}>
            {skill.description}
          </span>
        </span>
      </button>
      <ScopeBadge scope={scope} />
      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <ItemContextMenu isFavorite={isFavorite} onToggleFavorite={onToggleFavorite} />
      </div>
    </div>
  );
}
