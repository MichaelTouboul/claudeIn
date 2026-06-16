import { beforeEach, describe, expect, it } from "vitest";

import {
  hasUpdate,
  useVersionStore,
  VERSION_ACK_STORAGE_KEY,
} from "../useVersionStore";

describe("useVersionStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useVersionStore.setState({ running: "", latest: null, acknowledged: null });
  });

  it("seedRunning sets the running version and hasUpdate stays false", () => {
    useVersionStore.getState().seedRunning("1.0.0");
    expect(useVersionStore.getState().running).toBe("1.0.0");
    expect(hasUpdate(useVersionStore.getState())).toBe(false);
  });

  it("ingest of a newer version marks hasUpdate true", () => {
    useVersionStore.getState().seedRunning("1.0.0");
    useVersionStore.getState().ingest("1.0.1");
    expect(useVersionStore.getState().latest).toBe("1.0.1");
    expect(hasUpdate(useVersionStore.getState())).toBe(true);
  });

  it("ingest of the same version as running does NOT mark hasUpdate", () => {
    useVersionStore.getState().seedRunning("1.0.0");
    useVersionStore.getState().ingest("1.0.0");
    expect(hasUpdate(useVersionStore.getState())).toBe(false);
  });

  it("acknowledge hides the update and persists to localStorage", () => {
    useVersionStore.getState().seedRunning("1.0.0");
    useVersionStore.getState().ingest("1.0.1");
    useVersionStore.getState().acknowledge("1.0.1");

    expect(hasUpdate(useVersionStore.getState())).toBe(false);
    expect(localStorage.getItem(VERSION_ACK_STORAGE_KEY)).toBe("1.0.1");
  });

  it("loadAcknowledged hydrates the acknowledged version and suppresses an already-seen bump", () => {
    localStorage.setItem(VERSION_ACK_STORAGE_KEY, "1.0.1");
    useVersionStore.getState().loadAcknowledged();
    useVersionStore.getState().seedRunning("1.0.0");
    useVersionStore.getState().ingest("1.0.1");

    expect(useVersionStore.getState().acknowledged).toBe("1.0.1");
    expect(hasUpdate(useVersionStore.getState())).toBe(false);
  });

  it("a fresh bump after acknowledging an older one resurfaces hasUpdate", () => {
    useVersionStore.getState().seedRunning("1.0.0");
    useVersionStore.getState().ingest("1.0.1");
    useVersionStore.getState().acknowledge("1.0.1");
    useVersionStore.getState().ingest("1.0.2");
    expect(hasUpdate(useVersionStore.getState())).toBe(true);
  });
});
