import { WorkflowAgentList } from './WorkflowAgentList';
import type { WorkflowViewProps } from './types';

/**
 * Timeline view — Phase-3 stub. Lists the session's agents; Phase 4 turns this
 * into swimlanes of tool-spans. Exposed as a labelled tabpanel so the active
 * region is addressable by its view name.
 */
export function WorkflowTimeline(props: WorkflowViewProps) {
  return (
    <div role="tabpanel" aria-label="Timeline" className="min-h-0 flex-1 overflow-auto">
      <WorkflowAgentList {...props} />
    </div>
  );
}
