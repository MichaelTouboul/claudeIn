import { beforeEach, describe, expect, it } from 'vitest';

import {
  CONSOLE_DEFAULT_HEIGHT,
  CONSOLE_MIN_HEIGHT,
  useConsoleStore,
} from './useConsoleStore';

const initial = useConsoleStore.getState();
beforeEach(() => {
  useConsoleStore.setState(initial, true);
  // jsdom's default innerHeight is 768 → MAX = round(768 * 0.8) = 614.
  window.innerHeight = 768;
});

const maxHeight = () => Math.round(window.innerHeight * 0.8);

describe('useConsoleStore', () => {
  it('is closed by default with the default height', () => {
    const s = useConsoleStore.getState();
    expect(s.open).toBe(false);
    expect(s.height).toBe(CONSOLE_DEFAULT_HEIGHT);
  });

  it('toggle flips open', () => {
    expect(useConsoleStore.getState().open).toBe(false);
    useConsoleStore.getState().toggle();
    expect(useConsoleStore.getState().open).toBe(true);
    useConsoleStore.getState().toggle();
    expect(useConsoleStore.getState().open).toBe(false);
  });

  it('setOpen sets open explicitly', () => {
    useConsoleStore.getState().setOpen(true);
    expect(useConsoleStore.getState().open).toBe(true);
    useConsoleStore.getState().setOpen(false);
    expect(useConsoleStore.getState().open).toBe(false);
  });

  it('setHeight clamps below MIN', () => {
    useConsoleStore.getState().setHeight(10);
    expect(useConsoleStore.getState().height).toBe(CONSOLE_MIN_HEIGHT);
  });

  it('setHeight clamps above MAX (80% of viewport)', () => {
    useConsoleStore.getState().setHeight(100_000);
    expect(useConsoleStore.getState().height).toBe(maxHeight());
  });

  it('setHeight accepts a value within bounds', () => {
    useConsoleStore.getState().setHeight(300);
    expect(useConsoleStore.getState().height).toBe(300);
  });
});
