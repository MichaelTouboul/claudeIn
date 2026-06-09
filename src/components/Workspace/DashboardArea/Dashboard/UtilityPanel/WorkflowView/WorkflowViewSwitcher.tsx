import { type TabItem,Tabs } from '@/components/_ui/Tabs';
import { useWorkflowViewStore, WorkflowViewKind } from '@/store/useWorkflowViewStore';

// Value → switcher label, defined ONCE (CLAUDE.md: enum + behavior map). The
// order here is the rendered order of the segmented control.
const VIEW_LABEL: Record<WorkflowViewKind, string> = {
  [WorkflowViewKind.Timeline]: 'Timeline',
  [WorkflowViewKind.Tree]: 'Tree',
  [WorkflowViewKind.Board]: 'Board',
};

const SWITCHER_TABS: TabItem[] = Object.values(WorkflowViewKind).map((kind) => ({
  key: kind,
  label: VIEW_LABEL[kind],
}));

/**
 * Timeline / Tree / Board segmented control for the session-overview panel.
 * Built on the `_ui/Tabs` primitive (role="tablist", per-tab role="tab" +
 * aria-selected + arrow-key nav, accessible names from the labels). The chosen
 * view is the single source of truth in `useWorkflowViewStore`.
 */
export function WorkflowViewSwitcher() {
  const view = useWorkflowViewStore((s) => s.view);
  const setView = useWorkflowViewStore((s) => s.setView);

  return (
    <Tabs
      tabs={SWITCHER_TABS}
      active={view}
      onChange={(key) => setView(key as WorkflowViewKind)}
    />
  );
}
