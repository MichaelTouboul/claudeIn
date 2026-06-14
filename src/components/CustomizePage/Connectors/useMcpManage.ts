import { useCallback, useState } from "react";

import type {
  McpAddInput,
  McpManageScope,
  McpMutationResult,
  McpServerRaw,
} from "@/lib/types";

export type UseMcpManage = {
  /** Fetch a server's full raw config via `claude mcp get`. */
  getRaw: (name: string, scope?: McpManageScope, projectPath?: string) => Promise<McpServerRaw>;
  /** Add a new server; sets `needsRestart` on success, surfaces `error` on failure. */
  add: (input: McpAddInput) => Promise<McpMutationResult>;
  /** Edit an existing server (remove + re-add); same restart/error semantics. */
  edit: (name: string, input: McpAddInput) => Promise<McpMutationResult>;
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

  // Apply the shared post-mutation effect: success clears the error and arms
  // the restart notice; failure surfaces the CLI error and leaves it disarmed.
  const applyResult = useCallback((result: McpMutationResult) => {
    if (result.ok) {
      setError(null);
      setNeedsRestart(true);
    } else {
      setError(result.error);
    }
    return result;
  }, []);

  const getRaw = useCallback(
    (name: string, scope?: McpManageScope, projectPath?: string) =>
      window.api.getMcpRaw(name, scope, projectPath),
    [],
  );

  const add = useCallback(
    async (input: McpAddInput) => applyResult(await window.api.addMcpServer(input)),
    [applyResult],
  );

  const edit = useCallback(
    async (name: string, input: McpAddInput) =>
      applyResult(await window.api.editMcpServer(name, input)),
    [applyResult],
  );

  const remove = useCallback(
    async (name: string, scope: McpManageScope, projectPath?: string) =>
      applyResult(await window.api.removeMcpServer(name, scope, projectPath)),
    [applyResult],
  );

  return { getRaw, add, edit, remove, needsRestart, error };
}
