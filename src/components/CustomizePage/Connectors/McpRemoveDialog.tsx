import { Button } from "@/components/_ui/Button";
import { Dialog } from "@/components/_ui/Dialog";
import type { McpMutationResult } from "@/lib/types";

export type McpRemoveDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverName: string;
  onConfirm: () => Promise<McpMutationResult>;
};

// Confirm guard for removing an MCP server (a destructive `claude mcp remove`).
// Renders the CLI-error-friendly mutation off the parent's `onConfirm`; closes
// on confirm regardless (the parent surfaces any error via the manage hook).
export function McpRemoveDialog({ open, onOpenChange, serverName, onConfirm }: McpRemoveDialogProps) {
  const confirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Remove ${serverName}`}
      contentClassName="w-[min(92vw,420px)]"
    >
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
            Remove {serverName}?
          </h2>
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            This removes the MCP server from its configured scope. You can add it again later.
          </p>
        </div>
        <div
          className="flex justify-end gap-2 px-4 py-3 mt-3"
          style={{ borderTop: "1px solid var(--color-border-subtle)" }}
        >
          <Button type="button" intent="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" intent="danger-solid" size="sm" onClick={() => void confirm()}>
            Remove
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
