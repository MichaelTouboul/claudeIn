import { type PanelTab, PanelTabKind } from '@/store/dashboard/usePanelStore';

import { AllWorktreesPanel } from './AllWorktreesPanel';

/**
 * Panel-body adapter: narrows the generic `PanelTab` to the all-worktrees kind and
 * renders the user-scope `AllWorktreesPanel` (which carries no payload). Defensive —
 * TAB_BODY only routes all-worktrees tabs here.
 */
export function AllWorktreesTab({ tab }: { tab: PanelTab }) {
  if (tab.kind !== PanelTabKind.AllWorktrees) return null;
  return <AllWorktreesPanel />;
}
