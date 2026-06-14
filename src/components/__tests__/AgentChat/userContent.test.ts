import { describe, expect, it } from 'vitest';

import { decideUserContent } from '@/components/AgentChat/userContent';

describe('decideUserContent', () => {
  it('hides a turn that is purely a harness <task-notification> block', () => {
    const content =
      '<task-notification>\n' +
      '<task-id>bj40in9jm</task-id>\n' +
      '<status>killed</status>\n' +
      '<summary>Background command "x" was stopped</summary>\n' +
      '</task-notification>';
    expect(decideUserContent(content)).toEqual({ kind: 'hidden' });
  });

  it('hides a turn that is purely a <system-reminder> block', () => {
    expect(decideUserContent('<system-reminder>injected</system-reminder>')).toEqual({
      kind: 'hidden',
    });
  });

  it('hides a turn that is purely a <tool_result> block', () => {
    expect(
      decideUserContent('<tool_result tool_use_id="toolu_x">done</tool_result>')
    ).toEqual({ kind: 'hidden' });
  });

  it('keeps only the user prose when a <system-reminder> is appended', () => {
    const content =
      'Refactor the parser.\n<system-reminder>plumbing the user never typed</system-reminder>';
    expect(decideUserContent(content)).toEqual({ kind: 'text', text: 'Refactor the parser.' });
  });

  it('returns plain prose unchanged (trimmed) when there is no noise', () => {
    expect(decideUserContent('hello there')).toEqual({ kind: 'text', text: 'hello there' });
  });

  it('still hides a slash-command caveat-only turn', () => {
    expect(
      decideUserContent('<local-command-caveat>Caveat: the messages below…</local-command-caveat>')
    ).toEqual({ kind: 'hidden' });
  });

  it('returns a slash invocation as a slash render', () => {
    const content = '<command-name>/compact</command-name><command-args></command-args>';
    expect(decideUserContent(content)).toEqual({
      kind: 'slash',
      message: { kind: 'invocation', name: '/compact' },
    });
  });
});
