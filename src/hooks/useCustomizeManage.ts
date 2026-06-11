import { useMemo } from "react";

import type { UseMcpManage } from "@/components/CustomizePage/Connectors/useMcpManage";
import { useMcpManage } from "@/components/CustomizePage/Connectors/useMcpManage";
import type { McpMutationResult } from "@/types/mcp-manage.types";

/**
 * Wrap `useMcpManage` so every successful mutation also re-reads the Customize
 * MCP lists. The CLI writes config but does not always emit an immediate
 * `onMcpChanged` push, so an explicit refresh keeps the sidebar in sync.
 */
export function useCustomizeManage(refresh: () => Promise<void>): UseMcpManage {
  const manage = useMcpManage();

  return useMemo<UseMcpManage>(() => {
    const withRefresh =
      <Args extends unknown[]>(fn: (...args: Args) => Promise<McpMutationResult>) =>
      async (...args: Args) => {
        const result = await fn(...args);
        if (result.ok) await refresh();
        return result;
      };

    return {
      ...manage,
      add: withRefresh(manage.add),
      edit: withRefresh(manage.edit),
      remove: withRefresh(manage.remove),
    };
  }, [manage, refresh]);
}
