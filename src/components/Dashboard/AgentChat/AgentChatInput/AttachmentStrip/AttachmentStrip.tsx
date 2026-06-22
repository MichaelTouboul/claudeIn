import { Paperclip, X } from 'lucide-react';

import type { AttachedFile } from '../AgentChatInput';

export type AttachmentStripProps = {
  files: AttachedFile[];
  onRemove: (index: number) => void;
};

/**
 * The attached-files preview row above the composer editor: image thumbnails or
 * a paperclip chip per non-image file, each with a hover remove button. Renders
 * nothing when there are no attachments.
 */
export function AttachmentStrip({ files, onRemove }: AttachmentStripProps) {
  if (files.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 px-3 pt-2 pb-1">
      {files.map((file, i) => (
        <div key={file.path} className="relative group/attach">
          {file.dataUrl ? (
            <img
              src={file.dataUrl}
              alt={file.path.split('/').pop() || ''}
              className="rounded-lg"
              style={{
                maxWidth: '80px',
                maxHeight: '80px',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            />
          ) : (
            <div
              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg"
              style={{
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--color-neutral-fg)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <Paperclip size={10} />
              <span className="truncate max-w-[120px]">{file.path.split('/').pop()}</span>
            </div>
          )}
          <button
            onClick={() => onRemove(i)}
            title="Remove attachment"
            aria-label="Remove attachment"
            className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full opacity-0 group-hover/attach:opacity-100 transition-opacity"
            style={{ background: 'var(--color-neutral-bg)', color: 'var(--color-neutral-fg-strong)' }}
          >
            <X size={10} />
          </button>
        </div>
      ))}
    </div>
  );
}
