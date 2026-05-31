import { describe, expect, it } from 'vitest';

import type { OpenChat } from '../types';
import { annotateConversations } from './conversations';

const chat = (agentName: string): OpenChat => ({ id: agentName, agentName, title: 't', createdAt: 0, isNew: false });

describe('annotateConversations', () => {
  it('marks waiting > live > idle in priority order', () => {
    const chats = [chat('a'), chat('b'), chat('c')];
    const result = annotateConversations(chats, new Set(['a', 'b']), new Set(['b']));
    expect(result.map((c) => c.status)).toEqual(['live', 'waiting', 'idle']);
  });

  it('preserves the chat fields', () => {
    const [only] = annotateConversations([chat('x')], new Set(), new Set());
    expect(only).toMatchObject({ id: 'x', agentName: 'x', status: 'idle' });
  });
});
