import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useComposerBridgeStore } from '../useComposerBridgeStore';

beforeEach(() => {
  useComposerBridgeStore.setState({ handlers: {} });
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('useComposerBridgeStore', () => {
  it('register publishes handlers and returns an unregister fn', () => {
    const handlers = { setInput: vi.fn(), send: vi.fn() };
    const unregister = useComposerBridgeStore.getState().register('c1', handlers);
    expect(useComposerBridgeStore.getState().handlers.c1).toBe(handlers);
    unregister();
    expect(useComposerBridgeStore.getState().handlers.c1).toBeUndefined();
  });

  it('save forwards the markdown to the composer setInput without sending', () => {
    const setInput = vi.fn();
    const send = vi.fn();
    useComposerBridgeStore.getState().register('c1', { setInput, send });
    useComposerBridgeStore.getState().save('c1', '# hi');
    expect(setInput).toHaveBeenCalledWith('# hi');
    expect(send).not.toHaveBeenCalled();
  });

  it('send sets the input then fires send on the next tick', () => {
    const setInput = vi.fn();
    const send = vi.fn();
    useComposerBridgeStore.getState().register('c1', { setInput, send });
    useComposerBridgeStore.getState().send('c1', 'go');
    expect(setInput).toHaveBeenCalledWith('go');
    expect(send).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('save / send are no-ops when the composer is not registered', () => {
    expect(() => useComposerBridgeStore.getState().save('gone', 'x')).not.toThrow();
    expect(() => useComposerBridgeStore.getState().send('gone', 'x')).not.toThrow();
    vi.runAllTimers();
  });
});
