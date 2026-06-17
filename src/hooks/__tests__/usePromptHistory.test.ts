import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { usePromptHistory } from '../usePromptHistory';

describe('usePromptHistory', () => {
  it('records submitted prompts as the most-recent history entries', () => {
    const { result } = renderHook(() => usePromptHistory());

    act(() => {
      result.current.record('first');
      result.current.record('second');
    });

    // ArrowUp from an empty draft rewinds to the most recent first.
    expect(result.current.navigatePrev('')).toBe('second');
    expect(result.current.navigatePrev('second')).toBe('first');
  });

  it('returns null when there is no older entry to rewind to', () => {
    const { result } = renderHook(() => usePromptHistory());
    act(() => result.current.record('only'));

    expect(result.current.navigatePrev('')).toBe('only');
    // Already at the oldest entry — nothing further up.
    expect(result.current.navigatePrev('only')).toBeNull();
  });

  it('returns null on ArrowUp when the history is empty', () => {
    const { result } = renderHook(() => usePromptHistory());
    expect(result.current.navigatePrev('whatever')).toBeNull();
  });

  it('preserves the in-progress draft and restores it past the newest entry', () => {
    const { result } = renderHook(() => usePromptHistory());
    act(() => {
      result.current.record('p1');
      result.current.record('p2');
    });

    // Enter history with a draft typed by the user.
    expect(result.current.navigatePrev('my draft')).toBe('p2');
    expect(result.current.navigatePrev('p2')).toBe('p1');
    // Coming back down: p1 -> p2 -> draft.
    expect(result.current.navigateNext()).toBe('p2');
    expect(result.current.navigateNext()).toBe('my draft');
    // Below the newest entry there is nothing more.
    expect(result.current.navigateNext()).toBeNull();
  });

  it('returns null on ArrowDown when not currently navigating history', () => {
    const { result } = renderHook(() => usePromptHistory());
    act(() => result.current.record('p1'));
    expect(result.current.navigateNext()).toBeNull();
  });

  it('resets navigation (forgetting the draft cursor) on record', () => {
    const { result } = renderHook(() => usePromptHistory());
    act(() => {
      result.current.record('p1');
      result.current.record('p2');
    });
    // Walk up into history…
    expect(result.current.navigatePrev('draft')).toBe('p2');
    // …a fresh submission resets the cursor so the next ArrowUp starts at the newest.
    act(() => result.current.record('p3'));
    expect(result.current.navigatePrev('new draft')).toBe('p3');
  });

  it('reports whether the cursor is currently inside the history', () => {
    const { result } = renderHook(() => usePromptHistory());
    act(() => result.current.record('p1'));

    expect(result.current.isNavigating()).toBe(false);
    result.current.navigatePrev('');
    expect(result.current.isNavigating()).toBe(true);
    result.current.navigateNext();
    expect(result.current.isNavigating()).toBe(false);
  });
});
