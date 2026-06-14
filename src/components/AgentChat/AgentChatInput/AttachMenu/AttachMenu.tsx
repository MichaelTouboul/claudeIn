import { FileUp, ImageUp, Paperclip } from 'lucide-react';

import { Button } from '@/components/_ui/Button';
import { ContextMenu, type ContextMenuItem } from '@/components/_ui/ContextMenu';
import { FilePickerKind } from '@/lib/types';

export type AttachMenuProps = {
  /** Open the native file picker for the chosen kind and attach the result. */
  onAttach: (kind: FilePickerKind) => void;
};

/** Paperclip dropdown for the chat composer. Clicking the button opens a menu
 *  ("Upload file" / "Upload image") instead of firing a single picker. Outside-
 *  click / Escape dismissal + keyboard nav come from the `ContextMenu` primitive. */
export function AttachMenu({ onAttach }: AttachMenuProps) {
  const items: ContextMenuItem[] = [
    { label: 'Upload file', icon: <FileUp size={14} />, onSelect: () => onAttach(FilePickerKind.All) },
    { label: 'Upload image', icon: <ImageUp size={14} />, onSelect: () => onAttach(FilePickerKind.Image) },
  ];

  const trigger = (
    <Button intent="ghost" size="icon" aria-label="Attach file" title="Attach file">
      <Paperclip size={16} />
    </Button>
  );

  return <ContextMenu items={items} trigger={trigger} align="end" />;
}
