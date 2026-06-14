import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CodeTab } from '@/components/Dashboard/Workspace/DashboardArea/Dashboard/UtilityPanel/CodeTab/CodeTab';
import { type PanelTab, PanelTabKind } from '@/store/dashboard/usePanelStore';

function codeTab(src: string, lang: string | null): PanelTab {
  return { id: 'c1', kind: PanelTabKind.Code, title: 'Code', payload: { lang, src } };
}

describe('CodeTab', () => {
  it('renders the source read-only inside a pre', () => {
    render(<CodeTab tab={codeTab('const x = 1;', 'ts')} />);
    expect(screen.getByText('const x = 1;')).toBeInTheDocument();
  });

  it('shows the language label when present', () => {
    render(<CodeTab tab={codeTab('x = 1', 'python')} />);
    expect(screen.getByText('python')).toBeInTheDocument();
  });
});
