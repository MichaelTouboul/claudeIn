import { type ComponentType } from 'react';

import { useSessionWorkflow } from '@/hooks/useSessionWorkflow';
import { useWorkflowViewStore, WorkflowViewKind } from '@/store/useWorkflowViewStore';

import type { WorkflowViewProps } from './types';
import { WorkflowBoard } from './WorkflowBoard';
import { WorkflowTimeline } from './WorkflowTimeline';
import { WorkflowTree } from './WorkflowTree';
import { WorkflowViewSwitcher } from './WorkflowViewSwitcher';

export type { WorkflowViewProps };

/**
 * view kind → component, defined ONCE (CLAUDE.md: enum + renderer map, NOT a
 * switch/ternary chain). Add a WorkflowViewKind value + an entry here to extend.
 */
const VIEW_RENDERER: Record<WorkflowViewKind, ComponentType<WorkflowViewProps>> = {
  [WorkflowViewKind.Timeline]: WorkflowTimeline,
  [WorkflowViewKind.Tree]: WorkflowTree,
  [WorkflowViewKind.Board]: WorkflowBoard,
};

export type WorkflowViewContainerProps = {
  /** The conversation this overview is bound to (from the WorkflowPayload). */
  claudeSessionId: string | null;
  /** Open/focus an agent's existing AgentTab. Reuses the panel's add/focus flow. */
  onSelectAgent: (agentName: string) => void;
};

/**
 * Session-overview panel body. Reads the bound `claudeSessionId`, derives the
 * per-agent run data live via {@link useSessionWorkflow}, and renders the
 * Timeline/Tree/Board switcher above the active view. The active view is chosen
 * by a renderer-map lookup keyed on `useWorkflowViewStore.view` — no fallback
 * chain, so adding a view is one map entry.
 */
export function WorkflowView({ claudeSessionId, onSelectAgent }: WorkflowViewContainerProps) {
  const view = useWorkflowViewStore((s) => s.view);
  const agents = useSessionWorkflow(claudeSessionId);
  const ActiveView = VIEW_RENDERER[view];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <WorkflowViewSwitcher />
      <ActiveView agents={agents} onSelectAgent={onSelectAgent} />
    </div>
  );
}
