import { GitBranch } from 'lucide-react';

import { Button } from '@/components/_ui/Button';
import { diffTabId, PanelTabKind, usePanelStore } from '@/store/dashboard/usePanelStore';
import { useAppStore } from '@/store/useAppStore';

/**
 * Opens the read-only repo Diff panel for the currently selected project. Renders
 * nothing when no project is selected (there is no repo to diff). Identity is the
 * repo path, so re-clicking re-opens the SAME panel object while the body
 * re-fetches its live diff.
 */
export function HeaderChangesButton() {
  const selectedProject = useAppStore((s) => s.selectedProject);
  const openPanel = usePanelStore((s) => s.open);

  if (!selectedProject) return null;

  const path = selectedProject.path;
  return (
    <Button
      intent="ghost"
      size="sm"
      leftIcon={<GitBranch size={15} aria-hidden="true" />}
      onClick={() =>
        openPanel({
          id: diffTabId(path),
          kind: PanelTabKind.Diff,
          title: 'Changes',
          payload: { repoPath: path },
        })
      }
    >
      Changes
    </Button>
  );
}
