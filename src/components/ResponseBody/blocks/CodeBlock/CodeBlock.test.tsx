import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { codeTabId, PanelTabKind, usePanelStore } from '@/store/usePanelStore';

import { CodeBlock } from './CodeBlock';

beforeEach(() => {
  usePanelStore.setState({ isOpen: false, tabs: [], activeTabId: null });
});

describe('CodeBlock', () => {
  it('renders the code text and a Copy action', () => {
    render(<CodeBlock data={{ lang: 'ts', src: 'const x = 1;' }} raw="const x = 1;" />);
    expect(screen.getByText('const x = 1;')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  it('shows the language label when present', () => {
    render(<CodeBlock data={{ lang: 'python', src: 'x = 1' }} raw="x = 1" />);
    expect(screen.getByText('python')).toBeInTheDocument();
  });

  it('opens a Code panel tab with the block source on Open', () => {
    const data = { lang: 'ts', src: 'const x = 1;' };
    render(<CodeBlock data={data} raw="const x = 1;" />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    const s = usePanelStore.getState();
    expect(s.isOpen).toBe(true);
    expect(s.tabs).toHaveLength(1);
    const tab = s.tabs[0];
    expect(tab.id).toBe(codeTabId(data));
    expect(tab.kind).toBe(PanelTabKind.Code);
    expect(tab.payload).toEqual(data);
  });
});
