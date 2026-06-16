import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CodeBlock } from '@/components/Dashboard/ResponseBody/blocks/CodeBlock/CodeBlock';
import { codeTabId, PanelTabKind, usePanelStore } from '@/store/dashboard/usePanelStore';

beforeEach(() => {
  usePanelStore.setState({ isOpen: false, current: null });
});

/** Highlighted code is split across token spans — match on the joined
 *  textContent of the rendered <code> element, not a single text node. */
function codeText(container: HTMLElement): string {
  return container.querySelector('code')?.textContent ?? '';
}

describe('CodeBlock', () => {
  it('renders the code text and a Copy action', () => {
    const { container } = render(
      <CodeBlock data={{ lang: 'ts', src: 'const x = 1;' }} raw="const x = 1;" />,
    );
    expect(codeText(container)).toBe('const x = 1;');
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
    const obj = s.current;
    expect(obj?.id).toBe(codeTabId(data));
    expect(obj?.kind).toBe(PanelTabKind.Code);
    expect(obj?.payload).toEqual(data);
  });

  it('copies the RAW source (not the highlighted markup) on Copy', () => {
    const writeText = vi.fn();
    Object.assign(navigator, { clipboard: { writeText } });
    const src = 'const greet = (n) => `hi ${n}`; // wave';
    render(<CodeBlock data={{ lang: 'ts', src }} raw={src} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith(src);
  });
});
