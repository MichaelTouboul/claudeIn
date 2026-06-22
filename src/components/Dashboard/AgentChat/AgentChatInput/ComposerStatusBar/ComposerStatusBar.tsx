import { Activity, Brain, GitBranch, Shield, Sparkles } from 'lucide-react';

import { Tooltip } from '@/components/_ui/Tooltip';
import type { GitBranchInfo } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { ModelOption } from '@/store/dashboard/useModelStore';

import { ContextMeter } from './ContextMeter/ContextMeter';
import { formatCost, PermissionMode, permissionModeLabel } from './statusBar';
import { StatusItem } from './StatusItem/StatusItem';

const PERMISSION_ORDER: PermissionMode[] = [PermissionMode.Ask, PermissionMode.AcceptEdits, PermissionMode.Plan];

export type ComposerStatusBarProps = {
  branchInfo: GitBranchInfo | null;
  percent: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  models: ModelOption[];
  selectedModelId?: string;
  onSelectModel: (modelId: string) => void;
  permissionMode: PermissionMode;
  onSelectPermissionMode: (mode: PermissionMode) => void;
  think: boolean;
  onToggleThink: () => void;
};

/**
 * The composer's bottom status strip. Left→right: git branch (a LIVE read-out —
 * no dropdown; it reflects the repo's current branch and updates whenever HEAD
 * moves, whether by the user or by Claude switching/creating a worktree mid-run),
 * context usage (bar + %), model (menu); a spacer; then session cost, permission
 * mode (menu), and the Think toggle. Each discrete item is separated by a thin
 * divider — see the `Sep` helper below.
 */
export function ComposerStatusBar({
  branchInfo,
  percent,
  tokensIn,
  tokensOut,
  costUsd,
  models,
  selectedModelId,
  onSelectModel,
  permissionMode,
  onSelectPermissionMode,
  think,
  onToggleThink,
}: ComposerStatusBarProps) {
  const branch = branchInfo?.current ?? null;
  const selectedModelLabel = models.find((m) => m.id === selectedModelId)?.label;

  return (
    <div className="flex items-center gap-1 px-2.5 py-1.5 border-t border-border-subtle bg-surface-0 text-xs">
      {/* Git branch — a live read-out (no dropdown). Updates whenever HEAD moves. */}
      <StatusItem
        icon={<GitBranch size={13} aria-hidden="true" />}
        tip={branch ? `Active branch: ${branch}` : 'No branch'}
      >
        <span className="font-mono text-fg-muted">{branch ?? '—'}</span>
      </StatusItem>

      <Sep />

      {/* Context usage */}
      <ContextMeter percent={percent} tokensIn={tokensIn} tokensOut={tokensOut} />

      <Sep />

      {/* Model */}
      <StatusItem
        icon={<Sparkles size={13} aria-hidden="true" />}
        tip="Model"
        menu={models.map((m) => ({ label: m.label, onSelect: () => onSelectModel(m.id) }))}
      >
        <span className="font-medium text-fg-muted">{selectedModelLabel ?? 'Default'}</span>
      </StatusItem>

      <span className="flex-1" />

      {/* Session cost */}
      <Tooltip label="Session cost">
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-fg-subtle whitespace-nowrap">
          <Activity size={13} aria-hidden="true" />
          <span className="font-mono text-fg-muted tabular-nums">{formatCost(costUsd)}</span>
        </span>
      </Tooltip>

      <Sep />

      {/* Permission mode */}
      <StatusItem
        icon={<Shield size={13} aria-hidden="true" />}
        tip="Permission mode"
        menu={PERMISSION_ORDER.map((mode) => ({
          label: permissionModeLabel(mode),
          tone: mode === permissionMode ? 'accent' : 'default',
          onSelect: () => onSelectPermissionMode(mode),
        }))}
      >
        <span className="font-medium text-fg-muted">{permissionModeLabel(permissionMode)}</span>
      </StatusItem>

      <Sep />

      {/* Think toggle */}
      <Tooltip label="Extended thinking (think)">
        <button
          type="button"
          aria-pressed={think}
          onClick={onToggleThink}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-colors',
            think
              ? 'text-accent border'
              : 'text-fg-subtle border hover:text-fg-muted',
          )}
          style={{
            background: think ? 'var(--color-accent-subtle)' : 'transparent',
            borderColor: think ? 'var(--color-accent-border)' : 'var(--color-border)',
          }}
        >
          <Brain size={13} aria-hidden="true" />
          Think
        </button>
      </Tooltip>
    </div>
  );
}

/** A thin vertical divider between status items. */
function Sep() {
  return <span aria-hidden="true" className="mx-0.5 h-4 w-px shrink-0 bg-border-subtle" />;
}
