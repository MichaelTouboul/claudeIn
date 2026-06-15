import type { ReactElement } from "react";

import { ConnectorDetail } from "@/components/Customize/Connectors/ConnectorDetail";
import type { UseMcpManage } from "@/components/Customize/Connectors/useMcpManage";
import { CustomizeSection, useCustomizeStore } from "@/store/customize/useCustomizeStore";

import { AgentsPane } from "./AgentsPane";
import { CustomizeHero } from "./CustomizeHero";
import { HooksPane } from "./HooksPane";
import { MemoryPane } from "./MemoryPane";
import { ProfilePane } from "./ProfilePane";
import { SkillsPane } from "./SkillsPane";

export type CustomizeContentProps = {
  manage: UseMcpManage;
  /** Active repo path for project-scoped mutations (undefined → Personal only). */
  projectPath?: string;
};

// Connectors pane: the migrated MCP detail when a server is selected, else the
// "Customize Claude" hero. Selection lives in the store so the sidebar drives it.
function ConnectorsContent({ manage, projectPath }: CustomizeContentProps) {
  const selectedServer = useCustomizeStore((s) => s.selectedServer);
  if (selectedServer === null) return <CustomizeHero />;
  return (
    <ConnectorDetail
      server={selectedServer}
      getRaw={manage.getRaw}
      edit={manage.edit}
      remove={manage.remove}
      projectPath={selectedServer.scope === "project" ? projectPath : undefined}
    />
  );
}

// Section→content map (no fallback chain): each CustomizeSection renders its own
// pane. Connectors is the MCP master-detail; the ecosystem panes read the active
// repo scope. `repoScope` is the store's project path (null → Personal only).
const SECTION_CONTENT: Record<
  CustomizeSection,
  (props: CustomizeContentProps, repoScope: string | null) => ReactElement
> = {
  [CustomizeSection.Profile]: () => <ProfilePane />,
  [CustomizeSection.Connectors]: (props) => <ConnectorsContent {...props} />,
  [CustomizeSection.Skills]: (_props, repoScope) => <SkillsPane repoScope={repoScope} />,
  [CustomizeSection.Agents]: (_props, repoScope) => <AgentsPane repoScope={repoScope} />,
  [CustomizeSection.Hooks]: (_props, repoScope) => <HooksPane repoScope={repoScope} />,
  [CustomizeSection.Memory]: (_props, repoScope) => <MemoryPane repoScope={repoScope} />,
};

export function CustomizeContent(props: CustomizeContentProps) {
  const section = useCustomizeStore((s) => s.section);
  const repoScope = useCustomizeStore((s) => s.repoScope);
  return (
    <div className="flex-1 flex flex-col min-h-0">{SECTION_CONTENT[section](props, repoScope)}</div>
  );
}
