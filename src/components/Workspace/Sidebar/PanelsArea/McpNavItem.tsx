import { Server } from 'lucide-react';

import { useWorkspaceStore } from '@/store/useWorkspaceStore';

// Single nav affordance that opens (or focuses) the read-only MCP Servers tab,
// using the same `addTab` open-or-focus action that launches agent/skill tabs.
export function McpNavItem() {
  const addTab = useWorkspaceStore((s) => s.addTab);

  return (
    <button
      type="button"
      onClick={() => addTab({ kind: 'mcp', title: 'MCP Servers' })}
      className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors duration-150"
      style={{ color: 'var(--color-text-secondary)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <Server size={11} className="text-accent" />
      MCP Servers
    </button>
  );
}
