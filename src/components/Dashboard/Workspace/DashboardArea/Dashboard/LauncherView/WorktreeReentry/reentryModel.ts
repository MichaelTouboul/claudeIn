import type { AvatarHue } from '@/components/_ui/Avatar/Avatar';

import type { RepoWorktreeGroup } from '../../AllWorktreesPanel/allWorktreesModel';
import { type WorktreeRow,WorktreeStatus } from '../../WorktreesPanel/worktreeModel';

/** One flattened active-worktree re-entry item (carries its repo identity + the row). */
export interface ReentryItem {
  repoPath: string;
  repoName: string;
  repoHue: AvatarHue;
  row: WorktreeRow;
}

/**
 * Flatten the all-repos groups to the ACTIVE (non-idle) worktrees only, each tagged
 * with its repo identity — the new-tab "Active worktrees · all repos" re-entry list.
 * Idle worktrees are not re-entry points, so they are excluded (matches the mock).
 */
export function flattenActiveWorktrees(groups: RepoWorktreeGroup[]): ReentryItem[] {
  const items: ReentryItem[] = [];
  for (const group of groups) {
    for (const row of group.rows) {
      if (row.status === WorktreeStatus.Idle) continue;
      items.push({ repoPath: group.repoPath, repoName: group.name, repoHue: group.hue, row });
    }
  }
  return items;
}
