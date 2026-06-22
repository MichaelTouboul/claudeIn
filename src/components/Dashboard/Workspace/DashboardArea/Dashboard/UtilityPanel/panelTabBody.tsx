import { type ComponentType } from 'react';

import { WorktreesTab } from '@/components/Dashboard/Workspace/DashboardArea/Dashboard/WorktreesPanel/WorktreesTab';
import { type PanelTab, PanelTabKind } from '@/store/dashboard/usePanelStore';

import { AgentTab } from './AgentTab/AgentTab';
import { CodeTab } from './CodeTab/CodeTab';
import { DiffTab } from './DiffTab/DiffTab';
import { PromptEditorTab } from './PromptEditorTab/PromptEditorTab';
import { TableTab } from './TableTab/TableTab';
import { TextTab } from './TextTab/TextTab';
import { ToonTab } from './ToonTab/ToonTab';
import { WorkflowTab } from './WorkflowView/WorkflowTab';

/** kind → body component. Add a PanelTabKind value + an entry here to extend the panel. */
export const TAB_BODY: Record<PanelTabKind, ComponentType<{ tab: PanelTab }>> = {
  [PanelTabKind.Table]: TableTab,
  [PanelTabKind.Code]: CodeTab,
  [PanelTabKind.Text]: TextTab,
  [PanelTabKind.Agent]: AgentTab,
  [PanelTabKind.Workflow]: WorkflowTab,
  [PanelTabKind.Toon]: ToonTab,
  [PanelTabKind.PromptEditor]: PromptEditorTab,
  [PanelTabKind.Diff]: DiffTab,
  [PanelTabKind.Worktrees]: WorktreesTab,
};
