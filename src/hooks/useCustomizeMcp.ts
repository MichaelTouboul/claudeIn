import { useCallback, useEffect, useState } from "react";

import type { McpServerEntry } from "@/types/mcp-mirror.types";

export type UseCustomizeMcp = {
  /** Project-scope servers for the active repo (empty when no repo selected). */
  projectServers: McpServerEntry[];
  /** User-scope ("Personal") servers, always available. */
  personalServers: McpServerEntry[];
  loading: boolean;
  /** Re-read the snapshot from the back (call after a mutation). */
  refresh: () => Promise<void>;
};

/**
 * Read the reconciled MCP snapshot for the Customize page, partitioned by scope.
 * `getMcp(projectPath?)` already reconciles user + project sources; passing the
 * active repo path yields both scopes, omitting it yields user scope only. Live
 * `onMcpChanged` pushes keep the lists fresh while the page is open.
 */
export function useCustomizeMcp(repoPath: string | null): UseCustomizeMcp {
  const [servers, setServers] = useState<McpServerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const snapshot = await window.api.getMcp(repoPath ?? undefined);
    setServers(snapshot.servers);
    setLoading(false);
  }, [repoPath]);

  useEffect(() => {
    void refresh();
    const off = window.api.onMcpChanged((snapshot) => setServers(snapshot.servers));
    return off;
  }, [refresh]);

  const projectServers = repoPath === null ? [] : servers.filter((s) => s.scope === "project");
  const personalServers = servers.filter((s) => s.scope === "user");

  return { projectServers, personalServers, loading, refresh };
}
