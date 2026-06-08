import { usePanelStore } from '@/store/usePanelStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

import { DashboardSurface } from './DashboardSurface/DashboardSurface';
import { InternalTabBar } from './InternalTabBar/InternalTabBar';
import { LauncherView } from './LauncherView/LauncherView';
import { UtilityPanel } from './UtilityPanel/UtilityPanel';

export function Dashboard() {
  const togglePanel = usePanelStore((s) => s.togglePanel);
  const dashboards = useWorkspaceStore((s) => s.dashboards);
  const activeDashboardId = useWorkspaceStore((s) => s.activeDashboardId);

  const active = dashboards.find((d) => d.id === activeDashboardId) ?? null;
  const isLauncher = active?.scope.kind === 'launcher';

  return (
    <div className="flex-1 flex flex-col h-full relative">
      {isLauncher ? null : <InternalTabBar onOpenPanel={togglePanel} />}

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {isLauncher && active ? <LauncherView dashboardId={active.id} /> : null}
        <DashboardSurface />
      </div>

      <UtilityPanel />
    </div>
  );
}
