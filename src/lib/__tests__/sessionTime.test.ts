import { describe, expect, it } from "vitest";

import { SessionTimeBucket, sessionTimeBucket, sessionTimeLabel } from "@/lib/utils/sessionTime";

// A fixed "now": Wed 2026-06-17 10:00 local. Buckets are computed against the
// LOCAL calendar day so "Today"/"Yesterday" match what the user sees.
const NOW = new Date("2026-06-17T10:00:00").getTime();

describe("sessionTimeBucket", () => {
  it("classifies same-calendar-day as Today", () => {
    expect(sessionTimeBucket(new Date("2026-06-17T08:30:00").toISOString(), NOW)).toBe(
      SessionTimeBucket.Today,
    );
  });

  it("classifies the previous calendar day as Yesterday", () => {
    expect(sessionTimeBucket(new Date("2026-06-16T23:59:00").toISOString(), NOW)).toBe(
      SessionTimeBucket.Yesterday,
    );
  });

  it("classifies 2–7 days ago as Previous7Days", () => {
    expect(sessionTimeBucket(new Date("2026-06-12T12:00:00").toISOString(), NOW)).toBe(
      SessionTimeBucket.Previous7Days,
    );
  });

  it("classifies older than 7 days as Older", () => {
    expect(sessionTimeBucket(new Date("2026-06-01T12:00:00").toISOString(), NOW)).toBe(
      SessionTimeBucket.Older,
    );
  });

  it("treats a null/absent timestamp as Older", () => {
    expect(sessionTimeBucket(null, NOW)).toBe(SessionTimeBucket.Older);
  });
});

describe("sessionTimeLabel", () => {
  it("shows a compact hour label within the last 24h ('2h')", () => {
    expect(sessionTimeLabel(new Date("2026-06-17T08:00:00").toISOString(), NOW)).toBe("2h");
  });

  it("shows 'now' under a minute", () => {
    expect(sessionTimeLabel(new Date("2026-06-17T09:59:40").toISOString(), NOW)).toBe("now");
  });

  it("shows minutes under an hour ('15m')", () => {
    expect(sessionTimeLabel(new Date("2026-06-17T09:45:00").toISOString(), NOW)).toBe("15m");
  });

  it("shows a clock time for yesterday ('HH:MM')", () => {
    expect(sessionTimeLabel(new Date("2026-06-16T18:41:00").toISOString(), NOW)).toBe("18:41");
  });

  it("shows a weekday within the previous 7 days", () => {
    // 2026-06-12 is a Friday.
    expect(sessionTimeLabel(new Date("2026-06-12T12:00:00").toISOString(), NOW)).toBe("Fri");
  });

  it("returns an empty string for a null timestamp", () => {
    expect(sessionTimeLabel(null, NOW)).toBe("");
  });
});
