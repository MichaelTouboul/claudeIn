import { useEffect } from "react";

import { McpRestartBanner } from "@/components/CustomizePage/Connectors/McpRestartBanner";
import { CustomizeContent } from "@/components/CustomizePage/CustomizeContent/CustomizeContent";
import { CustomizeSidebar } from "@/components/CustomizePage/CustomizeSidebar/CustomizeSidebar";
import { CustomizeTopBar } from "@/components/CustomizePage/CustomizeTopBar";
import { useCustomizeManage } from "@/hooks/useCustomizeManage";
import { useCustomizeMcp } from "@/hooks/useCustomizeMcp";
import { useFavoriteRepos } from "@/hooks/useFavoriteRepos";
import { useCustomizeStore } from "@/store/customize/useCustomizeStore";
import { AppPage, useAppStore } from "@/store/useAppStore";

// The Customize page: top bar + sidebar (repo scope, section nav, scoped MCP
// server lists) + content (hero / connector detail / skills placeholder). Owns
// the MCP data + manage hooks so a mutation from anywhere refreshes the lists
// and arms the page-level restart banner. Resets page selection on unmount.
export function CustomizePage() {
  const { repos } = useFavoriteRepos();
  const navigate = useAppStore((s) => s.navigate);
  const repoScope = useCustomizeStore((s) => s.repoScope);
  const reset = useCustomizeStore((s) => s.reset);

  const { projectServers, personalServers, refresh } = useCustomizeMcp(repoScope);
  const manage = useCustomizeManage(refresh);

  useEffect(() => reset, [reset]);

  return (
    <div
      className="h-full flex flex-col surface-grain"
      style={{ background: "var(--color-surface-0)", color: "var(--color-text-primary)" }}
    >
      <CustomizeTopBar onBack={() => navigate(AppPage.Home)} />
      {manage.needsRestart ? (
        <div className="px-4 pt-3">
          <McpRestartBanner />
        </div>
      ) : null}
      <div className="flex-1 flex min-h-0">
        <CustomizeSidebar
          repos={repos}
          projectServers={projectServers}
          personalServers={personalServers}
          manage={manage}
          projectPath={repoScope ?? undefined}
        />
        <CustomizeContent manage={manage} projectPath={repoScope ?? undefined} />
      </div>
    </div>
  );
}
