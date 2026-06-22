import { Activity, Brain, GitBranch, Plus, Shield, Sparkles } from 'lucide-react';

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
 * The composer's bottom status strip. Left→right: git branch (menu), context
 * usage (bar + %), model (menu); a spacer; then session cost, permission mode
 * (menu), and the Think toggle. Each discrete item is separated by a thin
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
      {/* Git branch */}
      <StatusItem
        icon={<GitBranch size={13} aria-hidden="true" />}
        tip="Worktree actif — cliquer pour changer"
        menu={branchMenu(branchInfo)}
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
        tip="Modèle"
        menu={models.map((m) => ({ label: m.label, onSelect: () => onSelectModel(m.id) }))}
      >
        <span className="font-medium text-fg-muted">{selectedModelLabel ?? 'Par défaut'}</span>
      </StatusItem>

      <span className="flex-1" />

      {/* Session cost */}
      <Tooltip label="Coût de la session">
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-fg-subtle whitespace-nowrap">
          <Activity size={13} aria-hidden="true" />
          <span className="font-mono text-fg-muted tabular-nums">{formatCost(costUsd)}</span>
        </span>
      </Tooltip>

      <Sep />

      {/* Permission mode */}
      <StatusItem
        icon={<Shield size={13} aria-hidden="true" />}
        tip="Mode de permission"
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
      <Tooltip label="Réflexion étendue (think)">
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

/**
 * The branch menu: each worktree's branch as a (display-only) entry, then a
 * disabled "Nouveau worktree…" scaffold. Switching/creating a worktree is not
 * yet supported by the backend, so these entries surface the real branch list
 * read-only rather than dropping the element (see feature notes).
 */
function branchMenu(info: GitBranchInfo | null) {
  const entries = (info?.worktrees ?? [])
    .filter((w) => w.branch)
    .map((w) => ({
      label: w.branch as string,
      icon: <GitBranch size={14} aria-hidden="true" />,
      tone: w.branch === info?.current ? ('accent' as const) : ('default' as const),
      // Switching worktrees isn't wired yet — the entry is informational.
      disabled: true,
      onSelect: () => {},
    }));
  return [
    ...entries,
    {
      label: 'Nouveau worktree…',
      icon: <Plus size={14} aria-hidden="true" />,
      disabled: true,
      onSelect: () => {},
    },
  ];
}
