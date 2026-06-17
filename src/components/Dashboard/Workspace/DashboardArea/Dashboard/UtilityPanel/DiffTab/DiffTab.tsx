import { RefreshCw } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useState } from 'react';

import { IconButton } from '@/components/_ui/IconButton';
import { DiffBlock } from '@/components/Dashboard/ResponseBody/blocks/DiffBlock/DiffBlock';
import { DiffMode, type RepoDiff } from '@/lib/types';
import { type PanelTab, PanelTabKind } from '@/store/dashboard/usePanelStore';

import { DiffModeToggle } from './DiffModeToggle/DiffModeToggle';
import { repoFileToFileDiff } from './repoDiffToFileDiff';

/** Finite render states of the diff body, derived from the fetch result. */
const DiffView = {
  Loading: 'loading',
  Error: 'error',
  Empty: 'empty',
  Files: 'files',
} as const;
type DiffView = (typeof DiffView)[keyof typeof DiffView];

/**
 * Read-only repo diff panel body. Fetches `window.api.gitDiff(repoPath, mode)` on
 * mount and on every mode toggle, then renders each changed file with the chat
 * DiffBlock (so per-line Ask Claude is reused unchanged). The body's appearance is
 * driven by a single `DiffView` enum mapped to a renderer — no fallback chains.
 */
export function DiffTab({ tab }: { tab: PanelTab }) {
  const repoPath = tab.kind === PanelTabKind.Diff ? tab.payload.repoPath : '';
  const [mode, setMode] = useState<DiffMode>(DiffMode.Working);
  const [diff, setDiff] = useState<RepoDiff | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    (m: DiffMode) => {
      setLoading(true);
      void window.api
        .gitDiff(repoPath, m)
        .then((d) => setDiff(d))
        .finally(() => setLoading(false));
    },
    [repoPath],
  );

  useEffect(() => {
    load(mode);
  }, [load, mode]);

  // Defensive narrowing: TAB_BODY only routes diff tabs here.
  if (tab.kind !== PanelTabKind.Diff) return null;

  const view = resolveView(loading, diff);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <DiffModeToggle mode={mode} base={diff?.base} onChange={setMode} />
        <div className="flex-1" />
        <IconButton
          aria-label="Refresh"
          title="Refresh"
          size="sm"
          onClick={() => load(mode)}
          disabled={loading}
        >
          <RefreshCw size={14} aria-hidden="true" />
        </IconButton>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{VIEW_BODY[view](diff)}</div>
    </div>
  );
}

/** Map the fetch state to its finite render view (no fallback derivation). */
function resolveView(loading: boolean, diff: RepoDiff | null): DiffView {
  if (loading && !diff) return DiffView.Loading;
  if (diff?.error) return DiffView.Error;
  if (!diff || diff.files.length === 0) return DiffView.Empty;
  return DiffView.Files;
}

/** view → body renderer. Exhaustive over DiffView. */
const VIEW_BODY: Record<DiffView, (diff: RepoDiff | null) => ReactNode> = {
  [DiffView.Loading]: () => <Empty label="Loading…" />,
  [DiffView.Error]: (diff) => <Empty label={diff?.error ?? 'git failed'} />,
  [DiffView.Empty]: () => <Empty label="No changes" />,
  [DiffView.Files]: (diff) => <FileList diff={diff} />,
};

function FileList({ diff }: { diff: RepoDiff | null }) {
  if (!diff) return null;
  return (
    <>
      {diff.truncated ? (
        <p className="px-3 py-1 text-xs text-fg-subtle">Diff truncated — showing the first files only.</p>
      ) : null}
      {diff.files.map((file) => (
        <div key={`${file.oldPath ?? ''}>${file.path}`} className="p-2">
          <DiffBlock diff={repoFileToFileDiff(file)} toolName={file.status} />
        </div>
      ))}
    </>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="flex h-full items-center justify-center text-sm text-fg-subtle">{label}</div>;
}
