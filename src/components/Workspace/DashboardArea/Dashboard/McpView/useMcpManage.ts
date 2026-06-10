import { useCallback, useState } from "react";

import type {
  McpManageScope,
  McpMutationResult,
  McpServerRaw,
} from "@/types/mcp-manage.types";

export type UseMcpManage = {
  /** Fetch a server's full raw config via `claude mcp get`. */
  getRaw: (name: string, scope?: McpManageScope, projectPath?: string) => Promise<McpServerRaw>;
  /** Remove a server; sets `needsRestart` on success, surfaces `error` on failure. */
  remove: (
    name: string,
    scope: McpManageScope,
    projectPath?: string,
  ) => Promise<McpMutationResult>;
  /** True once any mutation has succeeded — the user must restart Claude sessions. */
  needsRestart: boolean;
  /** The CLI error from the last failed mutation, else null. */
  error: string | null;
};

// Renderer-side glue over the MCP manage IPC. Owns the post-mutation
// "restart sessions" flag and surfaces CLI errors from the `{ ok }` result
// union instead of throwing. Read-only `getRaw` does not affect either flag.
export function useMcpManage(): UseMcpManage {
  const [needsRestart, setNeedsRestart] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRaw = useCallback(
    (name: string, scope?: McpManageScope, projectPath?: string) =>
      window.api.getMcpRaw(name, scope, projectPath),
    [],
  );

  const remove = useCallback(
    async (name: string, scope: McpManageScope, projectPath?: string) => {
      const result = await window.api.removeMcpServer(name, scope, projectPath);
      if (result.ok) {
        setError(null);
        setNeedsRestart(true);
      } else {
        setError(result.error);
      }
      return result;
    },
    [],
  );

  return { getRaw, remove, needsRestart, error };
}
