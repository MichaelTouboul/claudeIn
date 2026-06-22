import { Loader2 } from 'lucide-react';
import { type ReactNode } from 'react';

import {
  ActivityLineState,
  type CurrentActivity,
  resolveActivityLineState,
  toolActivityLabel,
} from './activityState';

export type ActivityLineProps = {
  /** Turn is awaiting a response and not blocked on user input. */
  active: boolean;
  /** Latest streamed tool of the turn, or null for assistant reasoning. */
  activity: CurrentActivity;
  /** Opens the discussion workflow panel; absent ⇒ the line is not clickable. */
  onOpenWorkflow?: () => void;
};

/**
 * ONE replacing activity line for the live turn (never stacks). Its content is a
 * single finite state (idle/thinking/tool) mapped to a label — no fallback chain.
 * When a workflow opener is supplied the line is a button into the discussion's
 * workflow panel.
 */
export function ActivityLine({ active, activity, onOpenWorkflow }: ActivityLineProps) {
  const state = resolveActivityLineState(active, activity);
  if (state === ActivityLineState.Idle) return null;

  const label =
    state === ActivityLineState.Tool && activity
      ? toolActivityLabel(activity.tool, activity.target)
      : 'Thinking…';

  const inner: ReactNode = (
    <>
      <Loader2 size={10} className="animate-spin" />
      <span className="truncate">{label}</span>
    </>
  );

  if (!onOpenWorkflow) {
    return (
      <div className="flex items-center gap-2 text-fg-subtle text-xs ml-5">{inner}</div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpenWorkflow}
      title="Open this discussion's workflow"
      className="flex items-center gap-2 text-fg-subtle text-xs ml-5 hover:text-fg-muted transition-colors"
    >
      {inner}
    </button>
  );
}
