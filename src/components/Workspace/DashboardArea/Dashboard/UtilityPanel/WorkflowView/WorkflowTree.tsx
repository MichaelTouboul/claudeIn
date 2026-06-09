import type { WorkflowViewProps } from './types';
import { WorkflowAgentList } from './WorkflowAgentList';

/**
 * Tree view — Phase-3 stub. Lists the session's agents; Phase 4 turns this into
 * a depth-1 fan from a session root. Exposed as a labelled tabpanel so the
 * active region is addressable by its view name.
 */
export function WorkflowTree(props: WorkflowViewProps) {
  return (
    <div role="tabpanel" aria-label="Tree" className="min-h-0 flex-1 overflow-auto">
      <WorkflowAgentList {...props} />
    </div>
  );
}
