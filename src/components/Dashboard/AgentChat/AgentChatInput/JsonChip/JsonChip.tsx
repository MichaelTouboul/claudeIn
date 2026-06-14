import { Check, Pencil, Table2, X } from 'lucide-react';

import type { JsonAttachment } from '@/lib/types';
import { AttachmentFormat } from '@/lib/types';
import { PanelTabKind, toonTabId, usePanelStore } from '@/store/dashboard/usePanelStore';
import { useToonStore } from '@/store/useToonStore';

export type JsonChipProps = {
  attachment: JsonAttachment;
};

/** Composer chip for a pasted-JSON attachment. Shows the chosen format and the
 *  honest token saving ("▤ TOON · ≈N tokens saved ✓" when TOON wins, otherwise a
 *  neutral JSON note). Hover reveals edit (open the panel ToonTab) and delete
 *  badges — mirrors the attached-file chip's hover-X pattern. */
export function JsonChip({ attachment }: JsonChipProps) {
  const remove = useToonStore((s) => s.remove);
  const setEditing = useToonStore((s) => s.setEditing);
  const open = usePanelStore((s) => s.open);

  const saved = attachment.jsonTokens - attachment.toonTokens;
  const sendingToon = attachment.format === AttachmentFormat.Toon;

  const onEdit = () => {
    setEditing(attachment.id);
    open({
      id: toonTabId(attachment.id),
      kind: PanelTabKind.Toon,
      title: 'TOON',
      payload: { attachmentId: attachment.id },
    });
  };

  return (
    <div className="relative group/json">
      <div
        className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg font-mono"
        style={{
          background: 'var(--color-accent-dim)',
          color: 'var(--color-accent)',
          border: '1px solid var(--color-accent-dim)',
        }}
      >
        <Table2 size={11} />
        {sendingToon && saved > 0 ? (
          <span>
            TOON · ≈{saved.toLocaleString()} tokens saved
          </span>
        ) : (
          <span style={{ color: 'var(--color-fg-muted)' }}>JSON · ≈{attachment.jsonTokens.toLocaleString()} tokens</span>
        )}
        {sendingToon && saved > 0 ? <Check size={11} /> : null}
      </div>
      <div className="absolute -top-1.5 -right-1.5 flex gap-1 opacity-0 group-hover/json:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          title="Edit conversion"
          aria-label="Edit conversion"
          className="p-0.5 rounded-full"
          style={{ background: 'var(--color-neutral-bg)', color: 'var(--color-neutral-fg-strong)' }}
        >
          <Pencil size={10} />
        </button>
        <button
          onClick={() => remove(attachment.id)}
          title="Remove attachment"
          aria-label="Remove attachment"
          className="p-0.5 rounded-full"
          style={{ background: 'var(--color-neutral-bg)', color: 'var(--color-neutral-fg-strong)' }}
        >
          <X size={10} />
        </button>
      </div>
    </div>
  );
}
