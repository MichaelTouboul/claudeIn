import { WorkflowAgentList } from './WorkflowAgentList';
import type { WorkflowViewProps } from './types';

/**
 * Board view — Phase-3 stub. Lists the session's agents; Phase 4 groups them
 * into Working / Waiting / Idle columns of cards. Exposed as a labelled tabpanel
 * so the active region is addressable by its view name.
 */
export function WorkflowBoard(props: WorkflowViewProps) {
  return (
    <div role="tabpanel" aria-label="Board" className="min-h-0 flex-1 overflow-auto">
      <WorkflowAgentList {...props} />
    </div>
  );
}
