import { useEffect, useRef, useState } from "react";

import type {
  McpAddInput,
  McpManageScope,
  McpMutationResult,
  McpServerRaw,
} from "@/types/mcp-manage.types";
import type { McpServerEntry } from "@/types/mcp-mirror.types";

import { McpAddDialog } from "./McpAddDialog";
import { McpRawConfig } from "./McpRawConfig";
import { McpRemoveDialog } from "./McpRemoveDialog";
import { rawToAddInput } from "./mcpRowEdit";
import { McpServerBadges } from "./McpServerBadges";

export type ConnectorDetailProps = {
  server: McpServerEntry;
  getRaw: (name: string, scope?: McpManageScope, projectPath?: string) => Promise<McpServerRaw>;
  edit: (name: string, input: McpAddInput) => Promise<McpMutationResult>;
  remove: (name: string, scope: McpManageScope, projectPath?: string) => Promise<McpMutationResult>;
  projectPath?: string;
};

const actionStyle = (colorVar: string) => ({
  color: `var(${colorVar})`,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface-2)",
  fontFamily: "var(--font-sans)",
});

// Right-pane detail for one selected MCP server: name + provenance/transport
// badges + target, a lazy view-raw toggle, plus Edit and Remove (confirm-guarded)
// reusing the migrated dialogs. The manage actions are owned by the parent so
// the page-level restart banner reflects this pane's successful mutations.
export function ConnectorDetail({ server, getRaw, edit, remove, projectPath }: ConnectorDetailProps) {
  const [raw, setRaw] = useState<McpServerRaw | null>(null);
  const [rawOpen, setRawOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editInitial, setEditInitial] = useState<Partial<McpAddInput> | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the detail heading when a different server is selected so
  // keyboard users land in the new pane instead of staying on the sidebar list.
  useEffect(() => {
    headingRef.current?.focus();
  }, [server.name, server.scope]);

  const toggleRaw = async () => {
    if (rawOpen) {
      setRawOpen(false);
      return;
    }
    setRawOpen(true);
    if (raw === null) setRaw(await getRaw(server.name, server.scope, projectPath));
  };

  const openEdit = async () => {
    const fetched = await getRaw(server.name, server.scope, projectPath);
    setEditInitial(rawToAddInput(fetched, server.scope));
    setEditOpen(true);
  };

  return (
    <section
      data-testid="connector-detail"
      aria-label={`${server.name} connector`}
      className="flex-1 h-full overflow-auto p-6 flex flex-col gap-4"
    >
      <header className="flex items-center gap-3 flex-wrap">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-lg font-semibold focus-visible:outline-none"
          style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-sans)" }}
        >
          {server.name}
        </h2>
        <McpServerBadges server={server} />
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            aria-label={`Edit ${server.name}`}
            onClick={() => void openEdit()}
            className="text-xs leading-none rounded px-3 py-1.5"
            style={actionStyle("--color-accent")}
          >
            Edit
          </button>
          <button
            type="button"
            aria-label={`Remove ${server.name}`}
            onClick={() => setConfirmOpen(true)}
            className="text-xs leading-none rounded px-3 py-1.5"
            style={actionStyle("--color-danger")}
          >
            Remove
          </button>
        </div>
      </header>

      {server.target.length > 0 ? (
        <code
          className="text-xs break-all rounded px-3 py-2"
          style={{
            color: "var(--color-text-secondary)",
            background: "var(--color-surface-2)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {server.target}
        </code>
      ) : null}

      <button
        type="button"
        aria-expanded={rawOpen}
        aria-label={`Show raw config for ${server.name}`}
        onClick={() => void toggleRaw()}
        className="self-start text-xs leading-none rounded px-2 py-1"
        style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
      >
        {rawOpen ? "▾ raw config" : "▸ raw config"}
      </button>
      {rawOpen && raw !== null ? <McpRawConfig raw={raw} /> : null}

      <McpRemoveDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        serverName={server.name}
        onConfirm={() => remove(server.name, server.scope, projectPath)}
      />
      {editInitial !== null ? (
        <McpAddDialog
          mode="edit"
          open={editOpen}
          onOpenChange={setEditOpen}
          initialValues={editInitial}
          onSubmit={(input) => edit(server.name, input)}
        />
      ) : null}
    </section>
  );
}
