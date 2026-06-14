import { usePanelStore } from '@/store/dashboard/usePanelStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

import { DashboardSurface } from './DashboardSurface/DashboardSurface';
import { InternalTabBar } from './InternalTabBar/InternalTabBar';
import { LauncherView } from './LauncherView/LauncherView';
import { UtilityPanel } from './UtilityPanel/UtilityPanel';

export function Dashboard() {
  const setPanelOpen = usePanelStore((s) => s.setOpen);
  const dashboards = useWorkspaceStore((s) => s.dashboards);
  const activeDashboardId = useWorkspaceStore((s) => s.activeDashboardId);

  const active = dashboards.find((d) => d.id === activeDashboardId) ?? null;
  const isLauncher = active?.scope.kind === 'launcher';

  return (
    <div className="flex-1 flex flex-col h-full">
      {isLauncher ? null : <InternalTabBar onOpenPanel={() => setPanelOpen(true)} />}

      {/* Content row: chat (flex-1) on the left, the inline panel on the right.
          The panel lives INSIDE the Dashboard content area, so it shrinks the
          chat and never overlaps Header / WorkspaceBar / Console / Footer. */}
      <div className="flex-1 min-h-0 overflow-hidden flex">
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {isLauncher && active ? <LauncherView dashboardId={active.id} /> : null}
          <DashboardSurface />
        </div>
        <UtilityPanel />
      </div>
    </div>
  );
}
