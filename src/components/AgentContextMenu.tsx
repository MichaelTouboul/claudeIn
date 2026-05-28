import { Edit3, Plus, Star, StarOff, Trash2, Type } from 'lucide-react';

import { ContextMenu, type ContextMenuItem } from '@/components/_ui/ContextMenu';

type Action = 'rename' | 'edit' | 'delete' | 'add-sub' | 'toggle-favorite';

export type AgentContextMenuProps = {
  agentName: string;
  isOrchestrator: boolean;
  isFavorite?: boolean;
  onAction: (action: Action, agentName: string) => void;
};

export default function AgentContextMenu({
  agentName,
  isFavorite,
  onAction,
}: AgentContextMenuProps) {
  const items: ContextMenuItem[] = [
    isFavorite
      ? { label: 'Remove favorite', icon: <StarOff size={12} />, tone: 'warning', onSelect: () => onAction('toggle-favorite', agentName) }
      : { label: 'Add to favorites', icon: <Star size={12} />, tone: 'warning', onSelect: () => onAction('toggle-favorite', agentName) },
    { label: 'Add sub-agent', icon: <Plus size={12} />, tone: 'accent', onSelect: () => onAction('add-sub', agentName) },
    { label: 'Rename', icon: <Type size={12} />, onSelect: () => onAction('rename', agentName) },
    { label: 'Edit', icon: <Edit3 size={12} />, onSelect: () => onAction('edit', agentName) },
    { label: 'Delete', icon: <Trash2 size={12} />, tone: 'danger', onSelect: () => onAction('delete', agentName) },
  ];

  return <ContextMenu items={items} />;
}
