import { type PanelTab, PanelTabKind } from '@/store/dashboard/usePanelStore';

import { WorktreesPanel } from './WorktreesPanel';

/**
 * Panel-body adapter: narrows the generic `PanelTab` to the Worktrees kind and
 * renders the scoped `WorktreesPanel` for its repo path. Defensive — TAB_BODY only
 * routes worktrees tabs here.
 */
export function WorktreesTab({ tab }: { tab: PanelTab }) {
  if (tab.kind !== PanelTabKind.Worktrees) return null;
  return <WorktreesPanel repoPath={tab.payload.repoPath} />;
}
