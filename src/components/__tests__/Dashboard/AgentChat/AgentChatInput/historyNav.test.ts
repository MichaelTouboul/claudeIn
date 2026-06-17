import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { resolveHistoryNav } from '@/components/Dashboard/AgentChat/AgentChatInput/historyNav';
import type { HistoryNavContext } from '@/components/Dashboard/AgentChat/RichEditor/plugins/SubmitPlugin';
import { usePromptHistory } from '@/hooks/usePromptHistory';

function makeHistory(prompts: string[]) {
  const { result } = renderHook(() => usePromptHistory());
  prompts.forEach((p) => result.current.record(p));
  return result.current;
}

const edge = (over: Partial<HistoryNavContext> = {}): HistoryNavContext => ({
  atFirstLine: true,
  atLastLine: true,
  currentText: 'draft',
  ...over,
});

describe('resolveHistoryNav', () => {
  it('AC1: ArrowUp on the first line walks up through the session history', () => {
    const history = makeHistory(['first', 'second']);
    expect(resolveHistoryNav(history, 'ArrowUp', edge())).toBe('second');
    expect(resolveHistoryNav(history, 'ArrowUp', edge({ currentText: 'second' }))).toBe('first');
  });

  it('AC2: ArrowDown on the last line walks back down and restores the draft', () => {
    const history = makeHistory(['first', 'second']);
    resolveHistoryNav(history, 'ArrowUp', edge({ currentText: 'my draft' })); // -> second
    resolveHistoryNav(history, 'ArrowUp', edge({ currentText: 'second' })); // -> first
    expect(resolveHistoryNav(history, 'ArrowDown', edge({ currentText: 'first' }))).toBe('second');
    expect(resolveHistoryNav(history, 'ArrowDown', edge({ currentText: 'second' }))).toBe('my draft');
  });

  it('AC3: ArrowUp NOT on the first line never touches the history', () => {
    const history = makeHistory(['first']);
    expect(
      resolveHistoryNav(history, 'ArrowUp', edge({ atFirstLine: false, atLastLine: false }))
    ).toBeNull();
    // The history was not entered, so a subsequent first-line ArrowUp still starts fresh.
    expect(resolveHistoryNav(history, 'ArrowUp', edge())).toBe('first');
  });

  it('AC3: ArrowDown NOT on the last line is ignored while not navigating', () => {
    const history = makeHistory(['first']);
    expect(
      resolveHistoryNav(history, 'ArrowDown', edge({ atFirstLine: false, atLastLine: false }))
    ).toBeNull();
  });

  it('terminal-style: once navigating, arrows keep walking even off the edge line', () => {
    const history = makeHistory(['a', 'b']);
    // Enter the history (single line, both edges true).
    expect(resolveHistoryNav(history, 'ArrowUp', edge())).toBe('b');
    // A loaded multi-line entry leaves the caret mid-content (not on the first line),
    // yet ArrowUp must continue rewinding because we are inside the history.
    expect(
      resolveHistoryNav(history, 'ArrowUp', edge({ atFirstLine: false, atLastLine: false }))
    ).toBe('a');
  });

  it('ArrowDown is a no-op when the history was never entered', () => {
    const history = makeHistory(['a']);
    expect(resolveHistoryNav(history, 'ArrowDown', edge())).toBeNull();
  });
});
