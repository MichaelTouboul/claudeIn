import { useEffect } from 'react';

import { useResizableSidebar } from '@/hooks/useResizableSidebar';
import { useSessions } from '@/hooks/useSessions';
import { useProject } from '@/store/ProjectContext';
import { useDashboardStore } from '@/store/useDashboardStore';
import { useDashboardUIStore } from '@/store/useDashboardUIStore';
import { useFavoritesStore, useInitFavorites } from '@/store/useFavoritesStore';

import { ConversationList } from './ConversationList/ConversationList';
import { PanelsArea } from './PanelsArea/PanelsArea';
import { ResizeHandle } from './ResizeHandle/ResizeHandle';

// Inject animation keyframes
if (typeof document !== "undefined" && !document.getElementById("chat-animations")) {
  const style = document.createElement("style");
  style.id = "chat-animations";
  style.textContent = `
    @keyframes chatSlideIn {
      0% { opacity: 0; transform: translateX(-16px); max-height: 0; }
      50% { max-height: 40px; }
      100% { opacity: 1; transform: translateX(0); max-height: 40px; }
    }
  `;
  document.head.appendChild(style);
}

function ZoneHeader({ label }: { label: string }) {
  return (
    <div
      className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest"
      style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
    >
      {label}
    </div>
  );
}

export function Sidebar() {
  const { projectId, projectPath } = useProject();
  useInitFavorites(projectId);
  const { sessions, loading: sessionsLoading, refresh: sessionsRefresh } = useSessions(projectPath);

  const { width: sidebarWidth, ref: sidebarRef, startDrag: handleResizeDragStart } = useResizableSidebar();

  useEffect(() => {
    useDashboardUIStore.getState().setSelectedAgent(null);
  }, [projectPath]);

  const handleAgentAction = (action: string, agentName: string) => {
    switch (action) {
      case "edit": {
        const agent = useDashboardStore.getState().agents.find((a) => a.id === agentName);
        if (agent) useDashboardUIStore.getState().selectAgent(agent);
        break;
      }
      case "rename":
        // TODO: implement rename modal
        alert(`Rename ${agentName} — coming soon`);
        break;
      case "delete": {
        if (confirm(`Delete agent "${agentName}"?`)) {
          void useDashboardStore.getState().deleteAgent(agentName);
        }
        break;
      }
      case "add-sub":
        // TODO: implement add sub-agent modal
        alert(`Add sub-agent to ${agentName} — coming soon`);
        break;
      case "toggle-favorite":
        if (projectId) void useFavoritesStore.getState().toggle(projectId, "agent", agentName);
        break;
    }
  };

  return (
    <div
      ref={sidebarRef}
      className="flex flex-col h-full shrink-0 relative"
      style={{
        width: `${sidebarWidth}px`,
        background: 'var(--color-surface-1)',
        borderRight: '1px solid var(--color-border)',
      }}
    >
      <ZoneHeader label="Activity" />
      <ConversationList sessions={sessions} onChanged={sessionsRefresh} />

      <ZoneHeader label="Library" />
      <PanelsArea
        sessions={sessions}
        sessionsLoading={sessionsLoading}
        sessionsRefresh={sessionsRefresh}
        onAgentAction={handleAgentAction}
      />

      <ResizeHandle onMouseDown={handleResizeDragStart} />
    </div>
  );
}
