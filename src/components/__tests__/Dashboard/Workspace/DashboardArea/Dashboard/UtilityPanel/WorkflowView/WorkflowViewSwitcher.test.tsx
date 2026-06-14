import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { WorkflowViewSwitcher } from '@/components/Dashboard/Workspace/DashboardArea/Dashboard/UtilityPanel/WorkflowView/WorkflowViewSwitcher';
import { useWorkflowViewStore, WorkflowViewKind } from '@/store/dashboard/useWorkflowViewStore';

beforeEach(() => {
  useWorkflowViewStore.setState({ view: WorkflowViewKind.Timeline });
});

describe('WorkflowViewSwitcher', () => {
  it('renders a tablist with the three view options', () => {
    render(<WorkflowViewSwitcher />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Timeline' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Tree' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Board' })).toBeInTheDocument();
  });

  it('marks the store-active option as selected', () => {
    render(<WorkflowViewSwitcher />);
    expect(screen.getByRole('tab', { name: 'Timeline' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Board' })).toHaveAttribute('aria-selected', 'false');
  });

  it('switches the store view when an option is clicked', () => {
    render(<WorkflowViewSwitcher />);

    fireEvent.click(screen.getByRole('tab', { name: 'Board' }));

    expect(useWorkflowViewStore.getState().view).toBe(WorkflowViewKind.Board);
    expect(screen.getByRole('tab', { name: 'Board' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Timeline' })).toHaveAttribute('aria-selected', 'false');
  });
});
