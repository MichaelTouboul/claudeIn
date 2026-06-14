import type { ReactElement } from "react";

import { ConnectorDetail } from "@/components/CustomizePage/Connectors/ConnectorDetail";
import type { UseMcpManage } from "@/components/CustomizePage/Connectors/useMcpManage";
import { CustomizeSection, useCustomizeStore } from "@/store/customize/useCustomizeStore";

import { CustomizeHero } from "./CustomizeHero";
import { SkillsPlaceholder } from "./SkillsPlaceholder";

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
// pane. Skills is a visual placeholder; Connectors is the MCP master-detail.
const SECTION_CONTENT: Record<CustomizeSection, (props: CustomizeContentProps) => ReactElement> = {
  [CustomizeSection.Skills]: () => <SkillsPlaceholder />,
  [CustomizeSection.Connectors]: (props) => <ConnectorsContent {...props} />,
};

export function CustomizeContent(props: CustomizeContentProps) {
  const section = useCustomizeStore((s) => s.section);
  return <div className="flex-1 flex flex-col min-h-0">{SECTION_CONTENT[section](props)}</div>;
}
