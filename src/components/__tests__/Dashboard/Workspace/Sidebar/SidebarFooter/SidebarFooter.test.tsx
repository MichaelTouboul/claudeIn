import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SidebarFooter } from '@/components/Dashboard/Workspace/Sidebar/SidebarFooter/SidebarFooter';

describe('SidebarFooter', () => {
  it('shows "Install from plugin" and calls onInstallPlugin on click', () => {
    const onInstallPlugin = vi.fn();
    render(<SidebarFooter onInstallPlugin={onInstallPlugin} />);

    const button = screen.getByRole('button', { name: /install from plugin/i });
    fireEvent.click(button);

    expect(onInstallPlugin).toHaveBeenCalledTimes(1);
  });

  it('never renders the "New session" affordance', () => {
    render(<SidebarFooter onInstallPlugin={vi.fn()} />);
    expect(screen.queryByText(/new session/i)).toBeNull();
  });
});
