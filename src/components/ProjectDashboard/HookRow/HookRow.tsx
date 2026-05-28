import { Settings } from 'lucide-react';

import { ItemContextMenu } from '@/components/ItemContextMenu/ItemContextMenu';
import type { HookConfig } from '@/hooks/useProjects';

export type HookRowProps = {
  hook: HookConfig;
  isFavorite: boolean;
  onToggleFavorite: () => void;
};

export function HookRow({
  hook,
  isFavorite,
  onToggleFavorite,
}: HookRowProps) {
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
