import { useEffect, useState } from "react";

import { Dialog } from "@/components/_ui/Dialog";
import { useConversationTitlesStore } from "@/store/useConversationTitlesStore";

export type RenameDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // The conversation's persisted title key (= the `.jsonl` session id).
  claudeSessionId: string;
  // The title currently shown for the row (userTitle ?? aiTitle ?? jsonl ?? prompt).
  currentTitle: string;
  // Existing refresh hook (same one pin/archive use) so the list re-pulls.
  onRenamed: () => void;
};

// Manual rename of a conversation. The user title overrides the AI title and is
// persisted; clearing it (empty input) falls back to the AI title. Optimistically
// updates the shared titles store, persists via window.api, then refetches.
export function RenameDialog({ open, onOpenChange, claudeSessionId, currentTitle, onRenamed }: RenameDialogProps) {
  const [value, setValue] = useState(currentTitle);

  // Re-seed the input each time the dialog opens (the displayed title may change).
  useEffect(() => {
    if (open) setValue(currentTitle);
  }, [open, currentTitle]);

  const save = async () => {
    useConversationTitlesStore.getState().setUserTitle(claudeSessionId, value);
    await window.api.setConversationTitle(claudeSessionId, value);
    onOpenChange(false);
    onRenamed();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Rename conversation" contentClassName="w-[min(92vw,420px)]">
      <div
        className="flex flex-col rounded-xl overflow-hidden"
        style={{
          background: "var(--color-surface-1)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div className="flex flex-col gap-2 px-4 pt-4">
          <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
            Rename conversation
          </h2>
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            Set a custom title. Leave it empty to fall back to the AI-generated title.
          </p>
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void save();
            }}
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{
              color: "var(--color-text-primary)",
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              fontFamily: "var(--font-sans)",
            }}
          />
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
            onClick={() => void save()}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
            style={{ color: "#fff", background: "var(--color-accent)" }}
          >
            Save
          </button>
        </div>
      </div>
    </Dialog>
  );
}
