import type { WorkflowAgent } from '@/hooks/useSessionWorkflow';

/**
 * Common props for the three session-overview views (Timeline / Tree / Board).
 * Each view renders the same derived `agents` differently and reports an
 * agent-click upward via `onSelectAgent` (the container opens/focuses that
 * agent's existing AgentTab).
 */
export type WorkflowViewProps = {
  agents: WorkflowAgent[];
  onSelectAgent: (agentName: string) => void;
};
