import { beforeEach, describe, expect, it } from 'vitest';

import { AttachmentFormat, type JsonAttachment } from '@/lib/types';
import { byComposer, useToonStore } from '@/store/useToonStore';

function makeAttachment(id: string, composerId: string): JsonAttachment {
  return {
    id,
    composerId,
    sourceJson: '{\n  "a": 1\n}',
    toon: 'a: 1',
    format: AttachmentFormat.Toon,
    jsonTokens: 10,
    toonTokens: 4,
  };
}

beforeEach(() => {
  useToonStore.setState({ attachments: {}, editingId: null });
});

describe('useToonStore', () => {
  it('starts empty', () => {
    expect(useToonStore.getState().attachments).toEqual({});
    expect(useToonStore.getState().editingId).toBeNull();
  });

  it('add stores an attachment keyed by id', () => {
    useToonStore.getState().add(makeAttachment('a1', 'c1'));
    expect(useToonStore.getState().attachments.a1.composerId).toBe('c1');
  });

  it('update patches an existing attachment in place', () => {
    useToonStore.getState().add(makeAttachment('a1', 'c1'));
    useToonStore.getState().update('a1', { format: AttachmentFormat.Json });
    expect(useToonStore.getState().attachments.a1.format).toBe(AttachmentFormat.Json);
  });

  it('update is a no-op for an unknown id', () => {
    useToonStore.getState().update('nope', { format: AttachmentFormat.Json });
    expect(useToonStore.getState().attachments).toEqual({});
  });

  it('remove deletes the attachment and clears editingId when it pointed at it', () => {
    useToonStore.getState().add(makeAttachment('a1', 'c1'));
    useToonStore.getState().setEditing('a1');
    useToonStore.getState().remove('a1');
    expect(useToonStore.getState().attachments.a1).toBeUndefined();
    expect(useToonStore.getState().editingId).toBeNull();
  });

  it('byComposer returns only a composer\'s attachments', () => {
    useToonStore.getState().add(makeAttachment('a1', 'c1'));
    useToonStore.getState().add(makeAttachment('a2', 'c1'));
    useToonStore.getState().add(makeAttachment('b1', 'c2'));
    const c1 = byComposer(useToonStore.getState().attachments, 'c1');
    expect(c1.map((a) => a.id).sort()).toEqual(['a1', 'a2']);
    expect(byComposer(useToonStore.getState().attachments, 'c2')).toHaveLength(1);
  });

  it('clearComposer drops every attachment of that composer (and only it)', () => {
    useToonStore.getState().add(makeAttachment('a1', 'c1'));
    useToonStore.getState().add(makeAttachment('b1', 'c2'));
    useToonStore.getState().setEditing('a1');
    useToonStore.getState().clearComposer('c1');
    expect(byComposer(useToonStore.getState().attachments, 'c1')).toHaveLength(0);
    expect(byComposer(useToonStore.getState().attachments, 'c2')).toHaveLength(1);
    expect(useToonStore.getState().editingId).toBeNull();
  });
});
