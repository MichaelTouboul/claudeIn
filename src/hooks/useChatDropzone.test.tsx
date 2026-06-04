import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useChatDropzone } from './useChatDropzone';

type AttachedFile = { path: string; dataUrl: string | null };

function fakeDataTransfer(files: File[]): DataTransfer {
  return { files } as unknown as DataTransfer;
}

function fakeDropEvent(files: File[]) {
  return {
    preventDefault: vi.fn(),
    dataTransfer: fakeDataTransfer(files),
  } as unknown as React.DragEvent;
}

// Drive the hook alongside the attachedFiles state it appends to, matching the
// real AgentChat wiring (setAttachedFiles is passed in).
function useHarness() {
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const zone = useChatDropzone(setAttachedFiles);
  return { attachedFiles, zone };
}

describe('useChatDropzone', () => {
  beforeEach(() => {
    const getPathForFile = vi.fn((f: File) => `/abs/${f.name}`);
    const readImageAsDataUrl = vi.fn(async (p: string) =>
      p.endsWith('.png') ? `data:image/png;base64,${p}` : null,
    );
    window.api = { getPathForFile, readImageAsDataUrl } as unknown as Window['api'];
  });

  it('resolves dropped paths via getPathForFile + readImageAsDataUrl and appends', async () => {
    const { result } = renderHook(() => useHarness());

    await act(async () => {
      await result.current.zone.dragHandlers.onDrop(
        fakeDropEvent([new File(['x'], 'photo.png'), new File(['y'], 'notes.txt')]),
      );
    });

    expect(window.api.getPathForFile).toHaveBeenCalledTimes(2);
    expect(window.api.readImageAsDataUrl).toHaveBeenCalledWith('/abs/photo.png');
    expect(result.current.attachedFiles).toEqual([
      { path: '/abs/photo.png', dataUrl: 'data:image/png;base64,/abs/photo.png' },
      { path: '/abs/notes.txt', dataUrl: null },
    ]);
  });

  it('does not double-add a file already attached (dedupe by path)', async () => {
    const { result } = renderHook(() => useHarness());

    await act(async () => {
      await result.current.zone.dragHandlers.onDrop(fakeDropEvent([new File(['x'], 'photo.png')]));
    });
    await act(async () => {
      await result.current.zone.dragHandlers.onDrop(fakeDropEvent([new File(['x'], 'photo.png')]));
    });

    expect(result.current.attachedFiles).toHaveLength(1);
  });

  it('toggles isDragging on enter/leave with a depth guard against child flicker', () => {
    const { result } = renderHook(() => useChatDropzone(vi.fn()));
    const enter = () => result.current.dragHandlers.onDragEnter(fakeDropEvent([]));
    const leave = () => result.current.dragHandlers.onDragLeave(fakeDropEvent([]));

    act(() => enter()); // container
    expect(result.current.isDragging).toBe(true);
    act(() => enter()); // child — still dragging
    act(() => leave()); // leave child — depth still > 0
    expect(result.current.isDragging).toBe(true);
    act(() => leave()); // leave container — now clears
    expect(result.current.isDragging).toBe(false);
  });
});
