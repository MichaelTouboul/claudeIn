import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Console } from '@/components/Workspace/DashboardArea/Console/Console';
import { useConsoleStore } from '@/store/useConsoleStore';

// xterm needs a real terminal host; mock the body components so the Console
// test stays a pure UI test of the open/closed shell.
vi.mock('@/components/Workspace/DashboardArea/Console/TerminalView/TerminalView', () => ({
  TerminalView: () => <div data-testid="terminal-view" />,
}));
vi.mock('@/components/EventConsole/EventConsole', () => ({
  EventConsole: () => <div data-testid="event-console" />,
}));

const consoleInitial = useConsoleStore.getState();
beforeEach(() => {
  useConsoleStore.setState(consoleInitial, true);
});

describe('Console', () => {
  it('renders only the bar (no body, no resize handle) when closed', () => {
    render(<Console />);
    expect(screen.getByText('Terminal')).toBeInTheDocument();
    expect(screen.queryByTestId('terminal-view')).not.toBeInTheDocument();
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
    expect(screen.getByTitle('Open')).toBeInTheDocument();
  });

  it('opens when a tab is clicked and shows the body + resize handle', () => {
    render(<Console />);
    fireEvent.click(screen.getByText('Terminal'));
    expect(useConsoleStore.getState().open).toBe(true);
    expect(screen.getByRole('separator')).toBeInTheDocument();
    expect(screen.getByTitle('Close')).toBeInTheDocument();
  });

  it('the chevron toggles open and closed', () => {
    render(<Console />);
    fireEvent.click(screen.getByTitle('Open'));
    expect(useConsoleStore.getState().open).toBe(true);
    fireEvent.click(screen.getByTitle('Close'));
    expect(useConsoleStore.getState().open).toBe(false);
  });
});
