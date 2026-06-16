import { Paperclip, X } from 'lucide-react';

import type { AttachedImage } from '../types';

type AttachedImagesProps = {
  images: AttachedImage[];
  onRemove: (index: number) => void;
};

/** Removable thumbnail strip for the composer's attached images (deduped by path). */
export function AttachedImages({ images, onRemove }: AttachedImagesProps) {
  if (images.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 px-4 pt-3">
      {images.map((file, i) => (
        <div key={file.path} className="relative group/attach">
          {file.dataUrl ? (
            <img
              src={file.dataUrl}
              alt={file.path.split('/').pop() || ''}
              className="rounded-lg"
              style={{
                maxWidth: '64px',
                maxHeight: '64px',
                border: '1px solid var(--color-border)',
              }}
            />
          ) : (
            <div
              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg"
              style={{
                background: 'var(--color-neutral-bg)',
                color: 'var(--color-neutral-fg)',
                border: '1px solid var(--color-border)',
              }}
            >
              <Paperclip size={10} />
              <span className="truncate max-w-[120px]">{file.path.split('/').pop()}</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => onRemove(i)}
            title="Remove attachment"
            aria-label="Remove attachment"
            className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full opacity-0 group-hover/attach:opacity-100 transition-opacity"
            style={{
              background: 'var(--color-neutral-bg)',
              color: 'var(--color-neutral-fg-strong)',
            }}
          >
            <X size={10} />
          </button>
        </div>
      ))}
    </div>
  );
}
