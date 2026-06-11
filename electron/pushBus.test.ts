// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { createPushBus } from "./pushBus";

/**
 * The push-bus multiplexes the single `push-event` IPC channel into an
 * in-process set of JS subscribers. These tests exercise the bus in isolation
 * with a fake `register` (the "attach the one underlying listener" function),
 * so no real Electron `ipcRenderer` is needed.
 */
describe("createPushBus", () => {
  it("attaches the underlying listener exactly once across many subscribes", () => {
    const register = vi.fn<(emit: (data: unknown) => void) => void>();
    const bus = createPushBus(register);

    bus.subscribe(() => {});
    bus.subscribe(() => {});
    bus.subscribe(() => {});

    expect(register).toHaveBeenCalledTimes(1);
  });

  it("does not register the underlying listener before the first subscribe", () => {
    const register = vi.fn<(emit: (data: unknown) => void) => void>();
    createPushBus(register);

    expect(register).not.toHaveBeenCalled();
  });

  it("fans out a dispatched payload to all current subscribers", () => {
    let emit: (data: unknown) => void = () => {};
    const register = vi.fn((fn: (data: unknown) => void) => {
      emit = fn;
    });
    const bus = createPushBus(register);

    const a = vi.fn();
    const b = vi.fn();
    bus.subscribe(a);
    bus.subscribe(b);

    const payload = { type: "settings_changed", snapshot: { foo: 1 } };
    emit(payload);

    expect(a).toHaveBeenCalledTimes(1);
    expect(a).toHaveBeenCalledWith(payload);
    expect(b).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledWith(payload);
  });

  it("cleanup removes only that subscriber; others keep receiving", () => {
    let emit: (data: unknown) => void = () => {};
    const register = vi.fn((fn: (data: unknown) => void) => {
      emit = fn;
    });
    const bus = createPushBus(register);

    const a = vi.fn();
    const b = vi.fn();
    const unsubA = bus.subscribe(a);
    bus.subscribe(b);

    unsubA();
    emit({ type: "agents_changed" });

    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("fires no handler after every subscriber unsubscribes", () => {
    let emit: (data: unknown) => void = () => {};
    const register = vi.fn((fn: (data: unknown) => void) => {
      emit = fn;
    });
    const bus = createPushBus(register);

    const a = vi.fn();
    const b = vi.fn();
    const unsubA = bus.subscribe(a);
    const unsubB = bus.subscribe(b);

    unsubA();
    unsubB();
    emit({ type: "mcp_changed" });

    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });

  it("calling a cleanup twice is idempotent (no throw, no double-delete effect)", () => {
    let emit: (data: unknown) => void = () => {};
    const register = vi.fn((fn: (data: unknown) => void) => {
      emit = fn;
    });
    const bus = createPushBus(register);

    const a = vi.fn();
    const b = vi.fn();
    const unsubA = bus.subscribe(a);
    bus.subscribe(b);

    unsubA();
    expect(() => unsubA()).not.toThrow();
    emit({ type: "x" });

    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });
});
