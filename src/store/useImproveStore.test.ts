import { beforeEach, describe, expect, it } from "vitest";

import type { ImproveRequest } from "@/types/improve.types";
import { ImproveStatus, ImproveType } from "@/types/improve.types";

import {
  ACKNOWLEDGED_STORAGE_KEY,
  selectUnacknowledgedMerged,
  useImproveStore,
} from "./useImproveStore";

function makeRequest(overrides: Partial<ImproveRequest> = {}): ImproveRequest {
  return {
    id: "req-1",
    createdAt: "2026-06-11T10:00:00Z",
    type: ImproveType.Feature,
    title: "Add dark mode",
    description: "A dark theme toggle",
    acceptance: ["toggle exists"],
    transcript: [],
    status: ImproveStatus.Merged,
    summary: "Shipped a dark theme",
    ...overrides,
  };
}

describe("useImproveStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useImproveStore.setState({ requests: {}, acknowledgedIds: new Set() });
  });

  it("ingests a merged request so it surfaces as an unacknowledged notification", () => {
    useImproveStore.getState().ingest(makeRequest());
    const merged = selectUnacknowledgedMerged(useImproveStore.getState());
    expect(merged.map((r) => r.id)).toEqual(["req-1"]);
  });

  it("ignores a pending request (only merged ones notify)", () => {
    useImproveStore.getState().ingest(makeRequest({ status: ImproveStatus.Pending }));
    expect(selectUnacknowledgedMerged(useImproveStore.getState())).toHaveLength(0);
  });

  it("ignores a failed request", () => {
    useImproveStore.getState().ingest(makeRequest({ status: ImproveStatus.Failed }));
    expect(selectUnacknowledgedMerged(useImproveStore.getState())).toHaveLength(0);
  });

  it("ignores an in_progress request (only merged ones notify)", () => {
    useImproveStore.getState().ingest(makeRequest({ status: ImproveStatus.InProgress }));
    expect(selectUnacknowledgedMerged(useImproveStore.getState())).toHaveLength(0);
  });

  it("acknowledging a request hides it and persists the id to localStorage", () => {
    useImproveStore.getState().ingest(makeRequest());
    useImproveStore.getState().acknowledge("req-1");
    expect(selectUnacknowledgedMerged(useImproveStore.getState())).toHaveLength(0);

    const persisted = JSON.parse(localStorage.getItem(ACKNOWLEDGED_STORAGE_KEY) ?? "[]");
    expect(persisted).toContain("req-1");
  });

  it("seeds only merged requests and keeps already-acknowledged ids hidden", () => {
    localStorage.setItem(ACKNOWLEDGED_STORAGE_KEY, JSON.stringify(["req-2"]));
    useImproveStore.getState().loadAcknowledged();

    useImproveStore.getState().seed([
      makeRequest({ id: "req-1" }),
      makeRequest({ id: "req-2" }),
      makeRequest({ id: "req-3", status: ImproveStatus.Pending }),
    ]);

    const merged = selectUnacknowledgedMerged(useImproveStore.getState());
    expect(merged.map((r) => r.id)).toEqual(["req-1"]);
  });

  it("does not resurface an acknowledged request when the same event arrives again", () => {
    useImproveStore.getState().ingest(makeRequest());
    useImproveStore.getState().acknowledge("req-1");
    useImproveStore.getState().ingest(makeRequest());
    expect(selectUnacknowledgedMerged(useImproveStore.getState())).toHaveLength(0);
  });

  it("loadAcknowledged reads persisted ids from localStorage", () => {
    localStorage.setItem(ACKNOWLEDGED_STORAGE_KEY, JSON.stringify(["a", "b"]));
    useImproveStore.getState().loadAcknowledged();
    expect([...useImproveStore.getState().acknowledgedIds].sort()).toEqual(["a", "b"]);
  });
});
