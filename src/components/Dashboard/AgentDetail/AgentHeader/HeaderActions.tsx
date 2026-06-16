import { Check, Copy, FolderOpen, MoreHorizontal, Pencil, Play, Trash2, X } from 'lucide-react';

import { Button } from '@/components/_ui/Button';
import { ContextMenu, type ContextMenuItem } from '@/components/_ui/ContextMenu';
import { IconButton } from '@/components/_ui/IconButton';

export type HeaderActionsProps = {
  editing: boolean;
  saving: boolean;
  onRun: () => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDuplicate: () => void;
  onReveal: () => void;
  onDelete: () => void;
};

/** The header action cluster — Run / Edit / More in view mode, Cancel / Save in edit mode. */
export function HeaderActions({
  editing,
  saving,
  onRun,
  onEdit,
  onSave,
  onCancel,
  onDuplicate,
  onReveal,
  onDelete,
}: HeaderActionsProps) {
  if (editing) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <Button intent="ghost" onClick={onCancel} leftIcon={<X size={15} />}>
          Cancel
        </Button>
        <Button intent="primary" onClick={onSave} disabled={saving} leftIcon={<Check size={15} />}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    );
  }

  const menuItems: ContextMenuItem[] = [
    { label: 'Duplicate', icon: <Copy size={14} />, onSelect: onDuplicate },
    { label: 'Reveal in Finder', icon: <FolderOpen size={14} />, onSelect: onReveal },
    { label: 'Delete', icon: <Trash2 size={14} />, tone: 'danger', onSelect: onDelete },
  ];

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button intent="primary" onClick={onRun} leftIcon={<Play size={15} />}>
        Run
      </Button>
      <Button intent="secondary" onClick={onEdit} leftIcon={<Pencil size={14} />}>
        Edit
      </Button>
      <ContextMenu
        align="end"
        items={menuItems}
        trigger={
          <IconButton aria-label="More actions" intent="outline" size="md">
            <MoreHorizontal size={18} />
          </IconButton>
        }
      />
    </div>
  );
}
