import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TextTab } from '@/components/Dashboard/Workspace/DashboardArea/Dashboard/UtilityPanel/TextTab/TextTab';
import { type PanelTab, PanelTabKind } from '@/store/dashboard/usePanelStore';

function textTab(text: string): PanelTab {
  return { id: 't1', kind: PanelTabKind.Text, title: 'Text', payload: { text } };
}

describe('TextTab', () => {
  it('renders markdown prose as rendered HTML, not raw markup', () => {
    render(<TextTab tab={textTab('# Heading\n\nSome **bold** prose.')} />);
    expect(screen.getByRole('heading', { name: 'Heading' })).toBeInTheDocument();
    expect(screen.getByText('bold')).toBeInTheDocument();
  });
});
