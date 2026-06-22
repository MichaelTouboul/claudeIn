import { Check, GitBranch } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Tooltip } from '@/components/_ui/Tooltip';
import { cn } from '@/lib/utils';

export type BranchChipProps = {
  /** The current branch name, or null when detached/unknown. */
  branch: string | null;
};

/** How long the "Copied" feedback stays before reverting (ms). */
const COPIED_FEEDBACK_MS = 1200;

/**
 * The composer status strip's git-branch chip. A LIVE read-out of the repo's
 * current branch — and, like GitHub, click-to-copy: clicking copies the full
 * branch name to the clipboard, swaps the git icon for a check, and shows a
 * transient "Copied!" state for ~1.2s before reverting. It is an accessible
 * button (aria-label / title). With no branch it renders a plain, non-interactive
 * read-out. Styling matches the other status items (quiet at rest, surface-2 on
 * hover).
 */
export function BranchChip({ branch }: BranchChipProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending revert timer on unmount so we never setState after unmount.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = useCallback(() => {
    if (!branch) return;
    void navigator.clipboard.writeText(branch).then(() => {
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    });
  }, [branch]);

  const chipClass = cn(
    'inline-flex items-center gap-1.5 px-2 py-1 rounded text-fg-subtle whitespace-nowrap',
  );

  if (!branch) {
    return (
      <Tooltip label="No branch">
        <span className={chipClass}>
          <GitBranch size={13} aria-hidden="true" />
          <span className="font-mono text-fg-muted">—</span>
        </span>
      </Tooltip>
    );
  }

  return (
    <Tooltip label={copied ? 'Copied!' : 'Copy branch name'}>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy branch name"
        title={copied ? 'Copied!' : 'Copy branch name'}
        className={cn(chipClass, 'transition-colors hover:bg-surface-2 hover:text-fg-muted cursor-pointer')}
      >
        {copied ? (
          <Check size={13} aria-hidden="true" style={{ color: 'var(--color-active)' }} />
        ) : (
          <GitBranch size={13} aria-hidden="true" />
        )}
        <span className="font-mono text-fg-muted">{branch}</span>
      </button>
    </Tooltip>
  );
}
