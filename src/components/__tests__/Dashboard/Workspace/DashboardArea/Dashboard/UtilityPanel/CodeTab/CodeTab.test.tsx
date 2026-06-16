import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CodeTab } from '@/components/Dashboard/Workspace/DashboardArea/Dashboard/UtilityPanel/CodeTab/CodeTab';
import { type PanelTab, PanelTabKind, usePanelStore } from '@/store/dashboard/usePanelStore';

const transformMock = vi.fn<(input: unknown) => Promise<string>>();
window.api = { transform: transformMock } as unknown as typeof window.api;

function codeTab(src: string, lang: string | null): PanelTab {
  return { id: 'c1', kind: PanelTabKind.Code, title: 'Code', payload: { lang, src } };
}

/** Highlighted code is split across token spans — join the <code> textContent. */
function codeText(container: HTMLElement): string {
  return container.querySelector('code')?.textContent ?? '';
}

beforeEach(() => {
  usePanelStore.setState({ isOpen: true, current: codeTab('const x = 1;', 'ts') });
});
afterEach(() => transformMock.mockReset());

describe('CodeTab', () => {
  it('renders the source read-only inside a code element', () => {
    const { container } = render(<CodeTab tab={codeTab('const x = 1;', 'ts')} />);
    expect(codeText(container)).toBe('const x = 1;');
  });

  it('shows the language label when present', () => {
    render(<CodeTab tab={codeTab('x = 1', 'python')} />);
    expect(screen.getByText('python')).toBeInTheDocument();
  });

  it('copies the RAW source on the header Copy button', () => {
    const writeText = vi.fn();
    Object.assign(navigator, { clipboard: { writeText } });
    const src = 'def f(n):\n    return n  # raw';
    render(<CodeTab tab={codeTab(src, 'python')} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith(src);
  });

  it('applies a PromptBar transform via the panel store update', async () => {
    transformMock.mockResolvedValue('const y = 2;');
    render(<CodeTab tab={codeTab('const x = 1;', 'ts')} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'rename x to y' } });
    fireEvent.submit(screen.getByRole('textbox').closest('form')!);

    await waitFor(() => {
      const payload = usePanelStore.getState().current?.payload;
      expect(payload).toEqual({ lang: 'ts', src: 'const y = 2;' });
    });
  });
});
