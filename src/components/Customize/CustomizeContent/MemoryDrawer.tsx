import { FileText, X } from "lucide-react";

import { Badge } from "@/components/_ui/Badge";
import { Dialog } from "@/components/_ui/Dialog";
import { IconButton } from "@/components/_ui/IconButton";
import type { MemoryEntry } from "@/lib/types";

import { formatBytes } from "./formatBytes";

// Read-only memory drawer. The memory mirror exposes each file's path, scope,
// size and a first-line preview but no full body (there is no read-by-path IPC),
// so this is a metadata + preview view rather than an editor — noted in the
// pane. Editing CLAUDE.md files happens through the Dashboard memory manager.
export function MemoryDrawer({
  entry,
  open,
  onOpenChange,
}: {
  entry: MemoryEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      variant="drawer-right"
      title={`Memory ${entry.path}`}
      contentClassName="w-[440px] max-w-[92vw]"
    >
      <div
        className="flex h-full w-full flex-col border-l"
        style={{ background: "var(--color-surface-1)", borderColor: "var(--color-border)" }}
      >
        <div
          className="flex items-center gap-3 border-b px-5 py-4"
          style={{ borderColor: "var(--color-border)" }}
        >
          <span className="flex" style={{ color: "var(--color-history)" }}>
            <FileText size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div
              className="truncate text-sm font-semibold"
              style={{ fontFamily: "var(--font-mono)", color: "var(--color-text-primary)" }}
            >
              {entry.path}
            </div>
            <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {entry.scope}
            </div>
          </div>
          <Badge variant="purple">{formatBytes(entry.size)}</Badge>
          <IconButton aria-label="Close" onClick={() => onOpenChange(false)}>
            <X size={16} aria-hidden="true" />
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <p className="mb-2 text-xs uppercase tracking-[0.08em]" style={{ color: "var(--color-text-muted)" }}>
            Preview
          </p>
          <p
            className="text-sm leading-relaxed"
            style={{ fontFamily: "var(--font-mono)", color: "var(--color-text-secondary)" }}
          >
            {entry.firstLine || "(empty)"}
          </p>
          {entry.hasImports ? (
            <Badge variant="gray" className="mt-4">
              imports other files
            </Badge>
          ) : null}
        </div>
      </div>
    </Dialog>
  );
}
