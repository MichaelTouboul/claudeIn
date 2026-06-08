import { X } from 'lucide-react';

import { Dialog } from '@/components/_ui/Dialog';

export type UtilityPanelProps = {
  open: boolean;
  onClose: () => void;
};

export function UtilityPanel({ open, onClose }: UtilityPanelProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => { if (!o) onClose(); }}
      variant="drawer-right"
      title="Panel"
    >
      <div
        className="relative h-full flex flex-col w-[480px] max-w-[90%]"
        style={{
          background: 'var(--color-surface-1)',
          borderLeft: '1px solid var(--color-border)',
          boxShadow: '-12px 0 48px rgba(0,0,0,0.4)',
        }}
      >
        <div
          className="flex items-center justify-between pr-2"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          {/* Left slot reserved for a future tabs row. */}
          <div className="flex-1" />
          <button
            onClick={onClose}
            title="Close"
            aria-label="Close panel"
            className="flex items-center justify-center w-7 h-7 rounded-md shrink-0"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={15} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col" />
      </div>
    </Dialog>
  );
}
