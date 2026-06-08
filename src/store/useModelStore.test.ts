import { beforeEach, describe, expect, it } from 'vitest';

import { MODELS, useModelStore } from './useModelStore';

beforeEach(() => {
  useModelStore.setState({ models: {} });
});

describe('MODELS list', () => {
  it('exposes the three known models with their ids', () => {
    const byId = Object.fromEntries(MODELS.map((m) => [m.id, m.label]));
    expect(byId['claude-opus-4-8']).toBe('Opus 4.8');
    expect(byId['claude-sonnet-4-6']).toBe('Sonnet 4.6');
    expect(byId['claude-haiku-4-5-20251001']).toBe('Haiku 4.5');
  });
});

describe('useModelStore', () => {
  it('returns undefined for a conversation with no selection (claude default)', () => {
    expect(useModelStore.getState().getModel('conv-1')).toBeUndefined();
  });

  it('stores and reads a model per conversation key', () => {
    useModelStore.getState().setModel('conv-1', 'claude-opus-4-8');
    expect(useModelStore.getState().getModel('conv-1')).toBe('claude-opus-4-8');
    // other conversations are unaffected
    expect(useModelStore.getState().getModel('conv-2')).toBeUndefined();
  });

  it('overwrites a prior selection for the same conversation', () => {
    useModelStore.getState().setModel('conv-1', 'claude-opus-4-8');
    useModelStore.getState().setModel('conv-1', 'claude-haiku-4-5-20251001');
    expect(useModelStore.getState().getModel('conv-1')).toBe('claude-haiku-4-5-20251001');
  });
});
