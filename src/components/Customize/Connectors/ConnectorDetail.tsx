import { useEffect, useRef, useState } from "react";

import { Avatar } from "@/components/_ui/Avatar";
import { Button } from "@/components/_ui/Button";
import type {
  McpAddInput,
  McpManageScope,
  McpMutationResult,
McpServerEntry,
  McpServerRaw} from "@/lib/types";

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
      className="flex-1 h-full overflow-auto px-8 py-7 flex flex-col gap-5"
    >
      <header className="flex items-center gap-3 flex-wrap">
        <Avatar name={server.name} hue="cyan" shape="square" />
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-[22px] font-semibold tracking-[-0.01em] focus-visible:outline-none"
          style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-mono)" }}
        >
          {server.name}
        </h1>
        <McpServerBadges server={server} />
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            intent="secondary"
            size="sm"
            aria-label={`Edit ${server.name}`}
            onClick={() => void openEdit()}
          >
            Edit config
          </Button>
          <Button
            type="button"
            intent="danger"
            size="sm"
            aria-label={`Remove ${server.name}`}
            onClick={() => setConfirmOpen(true)}
          >
            Remove
          </Button>
        </div>
      </header>

      {server.target.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span
            className="text-[11px] font-semibold uppercase"
            style={{
              color: "var(--color-text-muted)",
              letterSpacing: "0.08em",
              fontFamily: "var(--font-sans)",
            }}
          >
            {server.transport === "stdio" ? "Command" : "Endpoint"}
          </span>
          <code
            className="text-xs break-all rounded-[var(--radius-sm)] px-2.5 py-2"
            style={{
              color: "var(--color-text-secondary)",
              background: "var(--color-surface-inset)",
              border: "1px solid var(--color-border)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {server.target}
          </code>
        </div>
      ) : null}

      <button
        type="button"
        aria-expanded={rawOpen}
        aria-label={`Show raw config for ${server.name}`}
        onClick={() => void toggleRaw()}
        className="self-start rounded-[var(--radius-sm)] px-1.5 py-1 text-xs leading-none transition-colors hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
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
