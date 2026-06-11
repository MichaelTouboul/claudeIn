/**
 * Push-event multiplexer for the preload bridge.
 *
 * The whole real-time layer rides ONE IPC channel (`push-event`). Historically
 * every `onXxx` subscription attached its own `ipcRenderer.on("push-event", …)`
 * listener, so N feature subscribers meant N listeners on a single event name —
 * blowing past Node's default `EventEmitter` limit of 10 and emitting
 * `MaxListenersExceededWarning`.
 *
 * This bus inverts that: it attaches the underlying channel listener EXACTLY
 * ONCE (lazily, on the first subscribe) and fans every payload out to an
 * in-process `Set` of JS subscribers. Adding more features adds JS-set entries,
 * never new `ipcRenderer` listeners — so the warning is gone for good while a
 * genuine leak (a component re-subscribing in a loop) would still surface as a
 * growing set elsewhere.
 *
 * It takes a `register` callback rather than touching `ipcRenderer` directly, so
 * the bus is pure and unit-testable with a fake emit source.
 */

/** A subscriber receives the raw `push-event` payload, unfiltered. */
export type PushSubscriber = (data: unknown) => void;

/**
 * `register` is the "attach the single underlying listener" function. The bus
 * calls it once, on the first subscribe, handing it the `emit` function the bus
 * wants invoked for every incoming `push-event` payload.
 */
export type PushRegister = (emit: (data: unknown) => void) => void;

export interface PushBus {
  /** Adds a subscriber and returns a cleanup that removes only that subscriber. */
  subscribe: (handler: PushSubscriber) => () => void;
}

export function createPushBus(register: PushRegister): PushBus {
  const subscribers = new Set<PushSubscriber>();
  let registered = false;

  const emit = (data: unknown): void => {
    // Copy so a subscriber unsubscribing mid-dispatch can't disturb iteration.
    for (const handler of [...subscribers]) {
      handler(data);
    }
  };

  const subscribe = (handler: PushSubscriber): (() => void) => {
    if (!registered) {
      registered = true;
      register(emit);
    }
    subscribers.add(handler);
    return () => {
      subscribers.delete(handler);
    };
  };

  return { subscribe };
}
