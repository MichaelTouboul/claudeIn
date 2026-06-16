import { useState } from 'react';

import { Button } from '@/components/_ui/Button/Button';
import { Dialog } from '@/components/_ui/Dialog/Dialog';
import { ImproveType } from '@/lib/types';
import { api } from '@/services/api';
import { useImproveModalStore } from '@/store/useImproveModalStore';

import { ImproveChat } from './ImproveChat/ImproveChat';
import { ImproveModalHeader } from './ImproveModalHeader/ImproveModalHeader';
import { buildImproveRequest } from './recap';
import { useImproveModalChat } from './useImproveModalChat';

/**
 * Self-Improve loop — scoping-chat modal (I4). Rendered once at the app root;
 * shown when `useImproveModalStore.open`. A small (not fullscreen) dialog with a
 * type dropdown, a short scoping chat (each turn → `improve:chat`), and a
 * "Send to Claude" action that assembles an `ImproveRequest` from the recap and
 * calls `improve:submit`.
 */
function ImproveModalContent({ onClose }: { onClose: () => void }) {
  const target = useImproveModalStore((s) => s.target);
  const [type, setType] = useState<ImproveType>(ImproveType.Feature);
  const { messages, loading, send } = useImproveModalChat(type, target);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = messages.some((m) => m.role === 'user') && !loading && !submitting;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.submitImproveRequest(buildImproveRequest({ type, target, messages }));
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="flex flex-col w-[34rem] max-w-[92vw] max-h-[80vh] rounded-lg overflow-hidden shadow-xl"
      style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
    >
      <ImproveModalHeader
        type={type}
        onTypeChange={setType}
        target={target}
        disabled={loading || submitting}
      />
      <ImproveChat messages={messages} loading={loading} onSend={(t, imgs) => void send(t, imgs)} />
      <div
        className="flex items-center justify-end gap-2 px-4 py-3 border-t"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <Button intent="ghost" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button intent="primary" onClick={() => void handleSubmit()} disabled={!canSubmit}>
          Send to Claude
        </Button>
      </div>
    </div>
  );
}

/** Top-level mount: subscribes to the store and renders the dialog when open. */
export function ImproveModal() {
  const open = useImproveModalStore((s) => s.open);
  const closeImprove = useImproveModalStore((s) => s.closeImprove);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) closeImprove();
      }}
      title="Improve this"
      contentClassName="flex"
    >
      <ImproveModalContent onClose={closeImprove} />
    </Dialog>
  );
}
