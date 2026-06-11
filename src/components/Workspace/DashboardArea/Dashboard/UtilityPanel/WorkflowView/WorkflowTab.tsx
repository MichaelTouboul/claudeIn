import { agentTabId, type PanelTab, PanelTabKind, usePanelStore } from '@/store/usePanelStore';

import { WorkflowView } from './WorkflowView';

/**
 * Panel-body adapter for the `Workflow` tab kind. Reads the bound
 * `claudeSessionId` from the {@link PanelTab} payload and renders
 * {@link WorkflowView}. Clicking an agent REPLACES the panel with that agent's
 * live activity view via the SAME `open` + {@link agentTabId} flow the AgentTabs
 * row uses, so there is one canonical (agent, session) identity.
 */
export function WorkflowTab({ tab }: { tab: PanelTab }) {
  const openPanel = usePanelStore((s) => s.open);
  if (tab.kind !== PanelTabKind.Workflow) return null;
  const { claudeSessionId } = tab.payload;

  return (
    <WorkflowView
      claudeSessionId={claudeSessionId}
      onSelectAgent={(agentName) =>
        openPanel({
          id: agentTabId(agentName, claudeSessionId),
          kind: PanelTabKind.Agent,
          title: agentName,
          payload: { agentName, claudeSessionId },
        })
      }
    />
  );
}
