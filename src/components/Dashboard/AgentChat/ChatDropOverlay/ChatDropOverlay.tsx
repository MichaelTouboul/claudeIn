import { Upload } from 'lucide-react';

// Full-area drop hint shown while files are dragged over the chat. It must NOT
// swallow the drop, so the overlay itself is pointer-events:none — the drop
// lands on the container behind it (which owns the drop handler).
export function ChatDropOverlay() {
  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center rounded-lg"
      style={{
        pointerEvents: 'none',
        backgroundColor: 'var(--color-accent-dim)',
        border: '2px dashed var(--color-accent)',
      }}
    >
      <div
        className="flex items-center gap-2 text-sm font-medium"
        style={{ color: 'var(--color-accent)' }}
      >
        <Upload size={16} />
        Drop files to attach
      </div>
    </div>
  );
}
