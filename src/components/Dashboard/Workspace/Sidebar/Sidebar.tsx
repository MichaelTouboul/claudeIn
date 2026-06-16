import { useEffect } from 'react';

import { SegmentedControl } from '@/components/_ui/SegmentedControl';
import { useProject } from '@/contexts/ProjectContext';
import { useResizableSidebar } from '@/hooks/useResizableSidebar';
import { useSessions } from '@/hooks/useSessions';
import { useDashboardStore } from '@/store/dashboard/useDashboardStore';
import { SidebarView, useDashboardUIStore } from '@/store/dashboard/useDashboardUIStore';
import { useFavoritesStore, useInitFavorites } from '@/store/dashboard/useFavoritesStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

import { ConversationList } from './ConversationList/ConversationList';
import { LibraryNav } from './LibraryNav/LibraryNav';
import { ResizeHandle } from './ResizeHandle/ResizeHandle';
import { SidebarFooter } from './SidebarFooter/SidebarFooter';

const SWITCH_OPTIONS = [
  { value: SidebarView.Sessions, label: 'Sessions' },
  { value: SidebarView.Library, label: 'Library' },
];

export function Sidebar() {
  const { projectId, projectPath } = useProject();
  useInitFavorites(projectId);
  const { sessions, refresh: sessionsRefresh } = useSessions(projectPath);

  const { width: sidebarWidth, ref: sidebarRef, startDrag: handleResizeDragStart } = useResizableSidebar();

  const view = useDashboardUIStore((s) => s.sidebarView);
  const setView = useDashboardUIStore((s) => s.setSidebarView);
  const addTab = useWorkspaceStore((s) => s.addTab);

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
      case "create":
        // No dedicated create-agent modal exists yet; route to the same
        // (deferred) entry point so the affordance is wired, not silently a
        // no-op. Replace with the create flow once it lands.
        alert("New agent — coming soon");
        break;
      case "toggle-favorite":
        if (projectId) void useFavoritesStore.getState().toggle(projectId, "agent", agentName);
        break;
    }
  };

  // "+ New session" opens a fresh chat tab — the existing new-conversation entry
  // point (same tab the WorkspaceBar "+" creates).
  const onNewSession = () => addTab({ kind: 'chat', title: 'Chat' });
  // No plugin-install flow exists yet; flag the affordance so it is wired (not
  // silently omitted) until that flow lands.
  const onInstallPlugin = () => alert('Install from plugin — coming soon');

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
      <div className="px-3 pt-3 pb-2 shrink-0">
        <SegmentedControl
          options={SWITCH_OPTIONS}
          value={view}
          onChange={setView}
          size="sm"
          className="w-full"
        />
      </div>

      {view === SidebarView.Sessions ? (
        <div className="flex-1 overflow-y-auto min-h-0">
          <ConversationList sessions={sessions} onChanged={sessionsRefresh} />
        </div>
      ) : (
        <LibraryNav onAgentAction={handleAgentAction} onNewAgent={() => handleAgentAction("create", "")} />
      )}

      <SidebarFooter view={view} onNewSession={onNewSession} onInstallPlugin={onInstallPlugin} />

      <ResizeHandle onMouseDown={handleResizeDragStart} />
    </div>
  );
}
