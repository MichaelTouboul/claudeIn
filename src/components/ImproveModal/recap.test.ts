import { describe, expect, it } from 'vitest';

import { ImproveType } from '@/types/improve.types';

import { buildImproveRequest } from './recap';
import type { ChatMessage } from './types';

const user = (text: string): ChatMessage => ({ id: text, role: 'user', text });
const assistant = (text: string): ChatMessage => ({ id: `a:${text}`, role: 'assistant', text });

describe('buildImproveRequest — recap → ImproveRequest mapping', () => {
  it('parses Title / Description / Acceptance bullets from the latest assistant recap', () => {
    const messages: ChatMessage[] = [
      user('the send button is hard to see'),
      assistant(
        [
          'Title: Make the send button more prominent',
          'Description: Increase contrast and size of the chat send button.',
          'Acceptance:',
          '- Send button uses the accent color',
          '- Button is at least 32px tall',
        ].join('\n'),
      ),
    ];

    const req = buildImproveRequest({
      type: ImproveType.Design,
      target: { component: 'AgentChatInput', sourcePath: 'src/x.tsx:1' },
      messages,
    });

    expect(req.type).toBe(ImproveType.Design);
    expect(req.component).toBe('AgentChatInput');
    expect(req.sourcePath).toBe('src/x.tsx:1');
    expect(req.title).toBe('Make the send button more prominent');
    expect(req.description).toContain('Increase contrast');
    expect(req.acceptance).toEqual([
      'Send button uses the accent color',
      'Button is at least 32px tall',
    ]);
    // transcript carries every turn
    expect(req.transcript).toHaveLength(2);
    expect(req.transcript?.[0]).toEqual({ role: 'user', text: 'the send button is hard to see' });
  });

  it('falls back to the first user message as title + transcript as description when no recap', () => {
    const messages: ChatMessage[] = [
      user('add dark mode toggle'),
      assistant('Where should the toggle live?'),
      user('in the header'),
    ];

    const req = buildImproveRequest({
      type: ImproveType.Feature,
      target: null,
      messages,
    });

    expect(req.title).toBe('add dark mode toggle');
    expect(req.description).toContain('add dark mode toggle');
    expect(req.description).toContain('in the header');
    expect(req.acceptance).toEqual([]);
    expect(req.component).toBeUndefined();
    expect(req.sourcePath).toBeUndefined();
  });

  it('omits component/sourcePath keys when the target is null', () => {
    const req = buildImproveRequest({
      type: ImproveType.Bug,
      target: null,
      messages: [user('it crashes')],
    });
    expect('component' in req).toBe(false);
    expect('sourcePath' in req).toBe(false);
  });

  it('truncates an overly long derived title to a single sensible line', () => {
    const long = 'x'.repeat(200);
    const req = buildImproveRequest({
      type: ImproveType.Copy,
      target: null,
      messages: [user(long)],
    });
    expect(req.title.length).toBeLessThanOrEqual(120);
  });
});
