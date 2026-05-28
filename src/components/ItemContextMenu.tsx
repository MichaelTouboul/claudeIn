import { Star, StarOff } from 'lucide-react';

import { ContextMenu, type ContextMenuItem } from '@/components/_ui/ContextMenu';

export type ItemContextMenuProps = {
  isFavorite: boolean;
  onToggleFavorite: () => void;
};

export default function ItemContextMenu({
  isFavorite,
  onToggleFavorite,
}: ItemContextMenuProps) {
  const items: ContextMenuItem[] = [
    isFavorite
      ? { label: 'Remove favorite', icon: <StarOff size={12} />, tone: 'warning', onSelect: onToggleFavorite }
      : { label: 'Add to favorites', icon: <Star size={12} />, tone: 'warning', onSelect: onToggleFavorite },
  ];

  return <ContextMenu items={items} />;
}
