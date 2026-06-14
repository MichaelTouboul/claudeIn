import { useEffect, useRef, useState } from 'react';

import { useWorkspaceStore } from '@/store/useWorkspaceStore';

import { TabBody } from './TabBody';

/**
 * Keep-alive render surface: every tab that has ever been the active tab of its
 * dashboard is mounted once and never unmounted, so component-local state
 * (AgentChat messages/session/scroll, live onEvent stream) survives dashboard
 * and tab switches. Only the active dashboard's active tab is visible; all
 * other mounted tabs are hidden with display:none.
 */
export function DashboardSurface() {
  const dashboards = useWorkspaceStore((s) => s.dashboards);
  const activeDashboardId = useWorkspaceStore((s) => s.activeDashboardId);

  // Set of "<dashboardId>:<tabId>" keys that have been activated at least once.
  const [activated, setActivated] = useState<Set<string>>(() => new Set());
  const activatedRef = useRef(activated);
  activatedRef.current = activated;

  useEffect(() => {
    const active = dashboards.find((d) => d.id === activeDashboardId);
    if (!active || !active.activeTabId) return;
    const key = `${active.id}:${active.activeTabId}`;
    if (activatedRef.current.has(key)) return;
    setActivated((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, [dashboards, activeDashboardId]);

  return (
    <div className="flex-1 min-h-0 relative">
      {dashboards.flatMap((d) =>
        d.tabs
          .filter((t) => activated.has(`${d.id}:${t.id}`))
          .map((t) => {
            const visible = d.id === activeDashboardId && t.id === d.activeTabId;
            return (
              <div
                key={`${d.id}:${t.id}`}
                className="absolute inset-0 flex flex-col"
                style={{ display: visible ? 'flex' : 'none' }}
              >
                <TabBody tab={t} cwd={d.cwd} />
              </div>
            );
          }),
      )}
    </div>
  );
}
