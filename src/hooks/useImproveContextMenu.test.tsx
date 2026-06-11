import { fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { elementToComponent } from '@/lib/elementToComponent';
import { useImproveModalStore } from '@/store/useImproveModalStore';

import { useImproveContextMenu } from './useImproveContextMenu';

vi.mock('@/lib/elementToComponent', () => ({
  elementToComponent: vi.fn(),
}));

const openContextMenu = vi.fn();
let selectedCb: ((target: { component?: string; sourcePath?: string } | null) => void) | null = null;
const onSelected = vi.fn((cb: (t: { component?: string; sourcePath?: string } | null) => void) => {
  selectedCb = cb;
  return () => { selectedCb = null; };
});

function Harness() {
  useImproveContextMenu();
  return <button data-testid="el">click me</button>;
}

beforeEach(() => {
  useImproveModalStore.setState({ open: false, target: null });
  openContextMenu.mockReset();
  onSelected.mockClear();
  selectedCb = null;
  vi.mocked(elementToComponent).mockReset();
  vi.stubEnv('DEV', true);
  window.api = {
    openContextMenu,
    onImproveContextMenuSelected: onSelected,
  } as unknown as Window['api'];
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('useImproveContextMenu — capture + native menu request', () => {
  it('resolves the right-clicked element and asks main to open the menu (dev)', () => {
    vi.mocked(elementToComponent).mockReturnValue({
      component: 'AgentChat',
      sourcePath: 'src/components/AgentChat/AgentChat.tsx:42',
    });
    const { getByTestId } = render(<Harness />);

    fireEvent.contextMenu(getByTestId('el'));

    expect(openContextMenu).toHaveBeenCalledWith({
      target: { component: 'AgentChat', sourcePath: 'src/components/AgentChat/AgentChat.tsx:42' },
      isDev: true,
    });
  });

  it('sends target: null when nothing is annotated (still allows a general improve)', () => {
    vi.mocked(elementToComponent).mockReturnValue(null);
    const { getByTestId } = render(<Harness />);

    fireEvent.contextMenu(getByTestId('el'));

    expect(openContextMenu).toHaveBeenCalledWith({ target: null, isDev: true });
  });

  it('reports isDev: false in a production build (item gated off in main)', () => {
    vi.stubEnv('DEV', false);
    vi.mocked(elementToComponent).mockReturnValue(null);
    const { getByTestId } = render(<Harness />);

    fireEvent.contextMenu(getByTestId('el'));

    expect(openContextMenu).toHaveBeenCalledWith({ target: null, isDev: false });
  });
});

describe('useImproveContextMenu — "Improve this…" selection → openImprove', () => {
  it('opens the modal with the resolved component target on selection', () => {
    render(<Harness />);
    expect(onSelected).toHaveBeenCalledTimes(1);

    selectedCb?.({ component: 'Header', sourcePath: 'src/components/Header/Header.tsx:10' });

    const s = useImproveModalStore.getState();
    expect(s.open).toBe(true);
    expect(s.target).toEqual({ component: 'Header', sourcePath: 'src/components/Header/Header.tsx:10' });
  });

  it('opens the modal with target null when resolution was null', () => {
    render(<Harness />);

    selectedCb?.(null);

    const s = useImproveModalStore.getState();
    expect(s.open).toBe(true);
    expect(s.target).toBeNull();
  });

  it('unsubscribes the selection listener on unmount', () => {
    const { unmount } = render(<Harness />);
    expect(selectedCb).not.toBeNull();
    unmount();
    expect(selectedCb).toBeNull();
  });
});
