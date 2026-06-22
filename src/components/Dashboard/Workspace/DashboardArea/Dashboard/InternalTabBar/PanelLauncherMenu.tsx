import { GitBranch, Menu, Network } from 'lucide-react';

import { ContextMenu, type ContextMenuItem } from '@/components/_ui/ContextMenu/ContextMenu';
import { Flex } from '@/components/_ui/Flex';
import { diffTabId, PanelTabKind, usePanelStore, workflowTabId } from '@/store/dashboard/usePanelStore';

export type PanelLauncherMenuProps = {
  /** Repo path of the active dashboard; empty when there is no project repo. */
  repoPath: string;
  /** Active tab's conversation id; null when the tab has no conversation. */
  claudeSessionId: string | null;
};

/**
 * The hamburger control in the InternalTabBar. Opens a dropdown that launches the
 * right-panel objects: Diff (needs a repo path) and Workflow (needs a conversation
 * id), each disabled when its prerequisite is missing. Context and Plan are
 * placeholders, always disabled.
 */
export function PanelLauncherMenu({ repoPath, claudeSessionId }: PanelLauncherMenuProps) {
  const open = usePanelStore((s) => s.open);

  const items: ContextMenuItem[] = [
    {
      label: 'Diff',
      icon: <GitBranch size={14} />,
      disabled: !repoPath,
      onSelect: () =>
        open({
          id: diffTabId(repoPath),
          kind: PanelTabKind.Diff,
          title: 'Changes',
          payload: { repoPath },
        }),
    },
    {
      label: 'Workflow',
      icon: <Network size={14} />,
      disabled: !claudeSessionId,
      onSelect: () =>
        open({
          id: workflowTabId(claudeSessionId),
          kind: PanelTabKind.Workflow,
          title: 'Session overview',
          payload: { claudeSessionId },
        }),
    },
    { label: 'Context', disabled: true, onSelect: () => {} },
    { label: 'Plan', disabled: true, onSelect: () => {} },
  ];

  const trigger = (
    <Flex
      as="button"
      align="center"
      justify="center"
      title="Open panel"
      className="w-7 h-7 rounded-md mr-2 shrink-0"
      style={{ color: 'var(--color-text-muted)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <Menu size={16} />
    </Flex>
  );

  return <ContextMenu items={items} trigger={trigger} align="start" triggerLabel="Open panel" />;
}
