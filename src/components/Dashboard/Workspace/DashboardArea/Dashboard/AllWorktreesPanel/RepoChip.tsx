import { FolderGit2 } from 'lucide-react';

import type { AvatarHue } from '@/components/_ui/Avatar/Avatar';
import { cn } from '@/lib/utils';

/**
 * A small hued folder chip identifying a repository. The hue is applied via the
 * `.agent-color-<hue>` class (sets `--agent-color`) so the tint references a token,
 * never a raw value — matching the WorktreesPanel header chip.
 */
export function RepoChip({ hue, size = 22, icon = 13 }: { hue: AvatarHue; size?: number; icon?: number }) {
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-sm', `agent-color-${hue}`)}
      style={{
        width: size,
        height: size,
        background: 'color-mix(in srgb, var(--agent-color) 18%, var(--color-surface-2))',
        border: '1px solid color-mix(in srgb, var(--agent-color) 30%, transparent)',
        color: 'var(--agent-color)',
      }}
    >
      <FolderGit2 size={icon} />
    </span>
  );
}
