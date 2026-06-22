import { useGitBranches } from '@/hooks/useGitBranches';
import { contextPercentForAgent } from '@/store/dashboard/sessionContext';
import { useComposerSettingsStore } from '@/store/dashboard/useComposerSettingsStore';
import { useEventsStore } from '@/store/dashboard/useEventsStore';
import { MODELS, useModelStore } from '@/store/dashboard/useModelStore';

import { ComposerStatusBar } from './ComposerStatusBar';
import { PermissionMode } from './statusBar';

export type ComposerStatusBarContainerProps = {
  /** Stable conversation key (the model/settings store key). */
  conversationKey: string;
  /** This chat's orchestrator agent name (context/cost lookup). */
  agentName: string;
  /** The persisted conversation id, when known (preferred context source). */
  claudeSessionId: string | null;
  /** The spawn directory — the repo whose branch/worktrees are shown. */
  projectPath?: string;
};

/**
 * Wiring shell for the composer status strip: pulls the real context %, token
 * counts and session cost from `useEventsStore` (the same source the chat header
 * uses), the per-conversation model from `useModelStore`, the branch/worktrees
 * from `useGitBranches`, and the (UI-only) permission mode + think toggle from
 * `useComposerSettingsStore`. Keeps the presentational `ComposerStatusBar` pure.
 */
export function ComposerStatusBarContainer({
  conversationKey,
  agentName,
  claudeSessionId,
  projectPath,
}: ComposerStatusBarContainerProps) {
  const context = useEventsStore((s) => s.agentContexts.get(agentName));
  // The bar's percent, in priority order: this conversation's value keyed by its
  // claudeSessionId (seeded from the persisted snapshot on select, then updated
  // live by `session_context`), else the agent's live session(s). All come from
  // the one backend computation — the renderer never computes a percent. The
  // trailing `?? 0` is the genuine empty state (a brand-new conversation with no
  // usage yet → an empty 0% bar), not a primary derivation.
  const percent = useEventsStore((s) =>
    (claudeSessionId ? s.sessionContexts.get(claudeSessionId) : undefined) ??
    contextPercentForAgent(s.presence, s.sessionContexts, agentName) ??
    0,
  );

  const selectedModelId = useModelStore((s) => s.models[conversationKey]);
  const setModel = useModelStore((s) => s.setModel);

  const branchInfo = useGitBranches(projectPath);

  // Select the raw slices (not the getter helpers) so the component re-renders
  // when the per-conversation entry changes; default to Ask / off when absent.
  const permissionMode = useComposerSettingsStore(
    (s) => s.permissionModes[conversationKey] ?? PermissionMode.Ask,
  );
  const setPermissionMode = useComposerSettingsStore((s) => s.setPermissionMode);
  const think = useComposerSettingsStore((s) => Boolean(s.think[conversationKey]));
  const toggleThink = useComposerSettingsStore((s) => s.toggleThink);

  return (
    <ComposerStatusBar
      branchInfo={branchInfo}
      percent={percent}
      tokensIn={context?.tokensIn ?? 0}
      tokensOut={context?.tokensOut ?? 0}
      costUsd={context?.costUsd ?? 0}
      models={MODELS}
      selectedModelId={selectedModelId}
      onSelectModel={(id) => setModel(conversationKey, id)}
      permissionMode={permissionMode}
      onSelectPermissionMode={(mode) => setPermissionMode(conversationKey, mode)}
      think={think}
      onToggleThink={() => toggleThink(conversationKey)}
    />
  );
}
