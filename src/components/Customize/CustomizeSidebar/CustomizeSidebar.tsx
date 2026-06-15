import { useState } from "react";

import { McpAddDialog } from "@/components/Customize/Connectors/McpAddDialog";
import type { UseMcpManage } from "@/components/Customize/Connectors/useMcpManage";
import type { FavoriteRepo,McpAddInput, McpManageScope, McpServerEntry   } from "@/lib/types";
import { CustomizeSection,useCustomizeStore } from "@/store/customize/useCustomizeStore";

import { ConnectorServerList, serverKey } from "./ConnectorServerList";
import { CustomizeNav } from "./CustomizeNav";
import { RepoScopeDropdown } from "./RepoScopeDropdown";

export type CustomizeSidebarProps = {
  repos: FavoriteRepo[];
  projectServers: McpServerEntry[];
  personalServers: McpServerEntry[];
  manage: UseMcpManage;
  /** Active repo path for project-scoped adds (undefined → Personal only). */
  projectPath?: string;
};

// Left rail: repo scope dropdown + section nav + (for Connectors) MCP servers
// grouped by scope with per-group "+" add. Selection + section live in the store
// so the content pane reacts. The add dialog is owned here; its target scope
// preselects the form so a "+" lands the server in the right place.
export function CustomizeSidebar({
  repos,
  projectServers,
  personalServers,
  manage,
  projectPath,
}: CustomizeSidebarProps) {
  const section = useCustomizeStore((s) => s.section);
  const setSection = useCustomizeStore((s) => s.setSection);
  const repoScope = useCustomizeStore((s) => s.repoScope);
  const setRepoScope = useCustomizeStore((s) => s.setRepoScope);
  const selectedServer = useCustomizeStore((s) => s.selectedServer);
  const selectServer = useCustomizeStore((s) => s.selectServer);

  const [addScope, setAddScope] = useState<McpManageScope | null>(null);
  const selectedKey = selectedServer === null ? null : serverKey(selectedServer);
  const connectorCount = projectServers.length + personalServers.length;

  const submitAdd = (input: McpAddInput) =>
    manage.add({ ...input, projectPath: input.scope === "project" ? projectPath : undefined });

  return (
    <aside
      aria-label="Customize navigation"
      className="flex flex-col gap-4 w-[var(--sidebar-width)] shrink-0 h-full overflow-y-auto p-4 border-r border-border"
      style={{ background: "var(--color-surface-1)" }}
    >
      <RepoScopeDropdown repos={repos} value={repoScope} onChange={setRepoScope} />
      <CustomizeNav
        active={section}
        onSelect={setSection}
        counts={{ [CustomizeSection.Connectors]: connectorCount }}
      />

      {section === CustomizeSection.Connectors ? (
        <div
          className="flex flex-col gap-4 pt-4"
          style={{ borderTop: "1px solid var(--color-border-subtle)" }}
        >
          {repoScope !== null ? (
            <ConnectorServerList
              label="This repo"
              servers={projectServers}
              selectedKey={selectedKey}
              onSelect={selectServer}
              onAdd={() => setAddScope("project")}
            />
          ) : null}
          <ConnectorServerList
            label="Personal"
            servers={personalServers}
            selectedKey={selectedKey}
            onSelect={selectServer}
            onAdd={() => setAddScope("user")}
          />
        </div>
      ) : null}

      {addScope !== null ? (
        <McpAddDialog
          mode="add"
          open
          onOpenChange={(open) => {
            if (!open) setAddScope(null);
          }}
          initialValues={{ scope: addScope }}
          onSubmit={submitAdd}
        />
      ) : null}
    </aside>
  );
}
