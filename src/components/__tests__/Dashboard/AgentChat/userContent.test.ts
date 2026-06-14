import { describe, expect, it } from 'vitest';

import { decideUserContent } from '@/components/Dashboard/AgentChat/userContent';

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

  it('detects a ```toon fence and collapses the blob to a toon render', () => {
    const content = 'Analyze this data:\n\n```toon\n[2]{id,name}:\n  1,a\n  2,b\n```';
    const decision = decideUserContent(content);
    expect(decision.kind).toBe('toon');
    if (decision.kind === 'toon') {
      expect(decision.text).toBe('Analyze this data:');
      expect(decision.info.format).toBe('toon');
      expect(decision.info.tokens).toBeGreaterThan(0);
    }
  });

  it('detects a ```json fence (TOON was not smaller / encoding failed)', () => {
    const content = '```json\n{\n  "a": 1\n}\n```';
    const decision = decideUserContent(content);
    expect(decision.kind).toBe('toon');
    if (decision.kind === 'toon') {
      expect(decision.text).toBe('');
      expect(decision.info.format).toBe('json');
    }
  });

  it('does not treat a non-toon/json code fence as an attachment', () => {
    expect(decideUserContent('```ts\nconst x = 1;\n```')).toEqual({
      kind: 'text',
      text: '```ts\nconst x = 1;\n```',
    });
  });
});
