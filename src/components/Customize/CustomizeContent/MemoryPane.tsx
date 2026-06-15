import { FileText } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/_ui/Badge";
import { useMemoryMirror } from "@/hooks/useEcosystemMirrors";
import type { MemoryEntry } from "@/lib/types";

import { formatBytes } from "./formatBytes";
import { MemoryDrawer } from "./MemoryDrawer";
import { PaneEmpty, PaneLoading, PaneShell } from "./PaneShell";

function MemoryRow({ entry, onOpen }: { entry: MemoryEntry; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-2.5 rounded-[var(--radius-md)] border p-3 text-left transition-colors hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
      style={{ background: "var(--color-surface-1)", borderColor: "var(--color-border)" }}
    >
      <span className="flex" style={{ color: "var(--color-history)" }}>
        <FileText size={18} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className="block truncate text-[13px] font-semibold"
          style={{ fontFamily: "var(--font-mono)", color: "var(--color-text-primary)" }}
        >
          {entry.path}
        </span>
        <span className="block truncate text-xs" style={{ color: "var(--color-text-muted)" }}>
          {entry.scope}
        </span>
      </span>
      <Badge variant="purple">{formatBytes(entry.size)}</Badge>
    </button>
  );
}

// Memory section: the CLAUDE.md hierarchy + auto-memory for the active scope.
// Clicking a file opens a read-only metadata + preview drawer (the mirror has no
// full body, so this is a viewer, not an editor).
export function MemoryPane({ repoScope }: { repoScope: string | null }) {
  const { status, entries } = useMemoryMirror(repoScope);
  const [openEntry, setOpenEntry] = useState<MemoryEntry | null>(null);

  return (
    <PaneShell
      title="Memory"
      description="CLAUDE.md files that give Claude persistent context."
    >
      {status === "loading" ? (
        <PaneLoading label="Loading memory…" />
      ) : entries.length === 0 ? (
        <PaneEmpty message="No memory files in this scope yet." />
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry) => (
            <MemoryRow
              key={`${entry.source}:${entry.path}`}
              entry={entry}
              onOpen={() => setOpenEntry(entry)}
            />
          ))}
        </div>
      )}
      {openEntry !== null ? (
        <MemoryDrawer
          entry={openEntry}
          repoScope={repoScope}
          open
          onOpenChange={(open) => {
            if (!open) setOpenEntry(null);
          }}
        />
      ) : null}
    </PaneShell>
  );
}
