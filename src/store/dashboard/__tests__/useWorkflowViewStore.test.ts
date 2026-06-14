import { beforeEach, describe, expect, it } from 'vitest';

import { useWorkflowViewStore, WorkflowViewKind } from '../useWorkflowViewStore';

describe('useWorkflowViewStore', () => {
  beforeEach(() => useWorkflowViewStore.setState({ view: WorkflowViewKind.Timeline }));

  it('defaults to the Timeline view', () => {
    expect(useWorkflowViewStore.getState().view).toBe(WorkflowViewKind.Timeline);
  });

  it('switches the view via setView', () => {
    useWorkflowViewStore.getState().setView(WorkflowViewKind.Board);
    expect(useWorkflowViewStore.getState().view).toBe(WorkflowViewKind.Board);

    useWorkflowViewStore.getState().setView(WorkflowViewKind.Tree);
    expect(useWorkflowViewStore.getState().view).toBe(WorkflowViewKind.Tree);
  });
});
