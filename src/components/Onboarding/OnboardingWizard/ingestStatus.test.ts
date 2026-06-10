import { describe, expect, it } from "vitest";

import { INGEST_STATUS_PRESENTATION, IngestStatus } from "./ingestStatus";

describe("ingestStatus", () => {
  it("has a presentation entry for every IngestStatus value (no fallback chain)", () => {
    for (const value of Object.values(IngestStatus)) {
      expect(INGEST_STATUS_PRESENTATION[value]).toBeDefined();
      expect(typeof INGEST_STATUS_PRESENTATION[value].label).toBe("string");
    }
  });

  it("marks only Running as busy", () => {
    expect(INGEST_STATUS_PRESENTATION[IngestStatus.Running].busy).toBe(true);
    expect(INGEST_STATUS_PRESENTATION[IngestStatus.Pending].busy).toBe(false);
    expect(INGEST_STATUS_PRESENTATION[IngestStatus.Done].busy).toBe(false);
    expect(INGEST_STATUS_PRESENTATION[IngestStatus.Error].busy).toBe(false);
  });

  it("marks Done and Error as terminal", () => {
    expect(INGEST_STATUS_PRESENTATION[IngestStatus.Done].terminal).toBe(true);
    expect(INGEST_STATUS_PRESENTATION[IngestStatus.Error].terminal).toBe(true);
    expect(INGEST_STATUS_PRESENTATION[IngestStatus.Pending].terminal).toBe(false);
    expect(INGEST_STATUS_PRESENTATION[IngestStatus.Running].terminal).toBe(false);
  });
});
