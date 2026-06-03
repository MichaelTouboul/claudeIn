import { AlertTriangle } from "lucide-react";

import { Dialog } from "@/components/_ui/Dialog";
import type { SessionSummary } from "@/hooks/useSessions";

export type DeletePermanentlyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: SessionSummary;
  onDeleted: () => void;
};

// The ONLY destructive path in the UI. `deleteFromDisk` does the real fs.rm of
// the .jsonl on disk and is irreversible — so it lives behind this explicit
// confirm. Soft-delete (reversible) is the default "Delete" in the menu.
export function DeletePermanentlyDialog({ open, onOpenChange, session, onDeleted }: DeletePermanentlyDialogProps) {
  const label = session.title || session.firstPrompt || session.sessionId.slice(0, 8);

  const confirm = async () => {
    await window.api.deleteConversationFromDisk(session.filePath);
    onOpenChange(false);
    onDeleted();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Delete permanently" contentClassName="w-[min(92vw,420px)]">
      <div
        className="flex flex-col rounded-xl overflow-hidden"
        style={{
          background: "var(--color-surface-1)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div className="flex items-start gap-3 px-4 pt-4">
          <AlertTriangle size={18} style={{ color: "var(--color-danger)", flexShrink: 0, marginTop: 2 }} />
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
              Delete permanently from disk?
            </h2>
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              This removes the transcript file for <span style={{ color: "var(--color-text-primary)" }}>{label}</span> from
              disk. This cannot be undone and Claude Code will no longer see it. To just hide it in ClaudeIn, use
              <span style={{ color: "var(--color-text-primary)" }}> Delete</span> (reversible) instead.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 mt-3" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
          <button
            onClick={() => onOpenChange(false)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
            style={{ color: "var(--color-text-secondary)", background: "var(--color-surface-2)" }}
          >
            Cancel
          </button>
          <button
            onClick={() => void confirm()}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
            style={{ color: "#fff", background: "var(--color-danger)" }}
          >
            Delete permanently
          </button>
        </div>
      </div>
    </Dialog>
  );
}
