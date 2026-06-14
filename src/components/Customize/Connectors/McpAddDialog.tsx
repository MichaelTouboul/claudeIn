import { Dialog } from "@/components/_ui/Dialog";
import type { McpAddInput, McpMutationResult } from "@/lib/types";

import { type McpFormMode,McpServerForm } from "./McpServerForm";

export type McpAddDialogProps = {
  mode: McpFormMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: McpAddInput) => Promise<McpMutationResult>;
  initialValues?: Partial<McpAddInput>;
};

const titleByMode: Record<McpFormMode, string> = {
  add: "Add MCP server",
  edit: "Edit MCP server",
};

// `_ui/Dialog` wrapper around the shared McpServerForm. Closes only on a
// successful mutation; a failed submit keeps the dialog open with the CLI error
// surfaced inside the form (the parent's manage hook arms the restart notice).
export function McpAddDialog({ mode, open, onOpenChange, onSubmit, initialValues }: McpAddDialogProps) {
  const submit = async (input: McpAddInput): Promise<McpMutationResult> => {
    const result = await onSubmit(input);
    if (result.ok) {
      onOpenChange(false);
    }
    return result;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={titleByMode[mode]} contentClassName="w-[min(92vw,460px)]">
      <div
        className="flex flex-col rounded-xl overflow-hidden"
        style={{
          background: "var(--color-surface-1)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <h2
          className="px-4 pt-4 text-sm font-semibold"
          style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-sans)" }}
        >
          {titleByMode[mode]}
        </h2>
        <McpServerForm mode={mode} onSubmit={submit} initialValues={initialValues} />
      </div>
    </Dialog>
  );
}
