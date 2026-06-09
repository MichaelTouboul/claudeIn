import type { LiveEvent } from "@/types/events.types";

import type { WorkflowSegment } from "./useSessionWorkflow";

/**
 * Group one agent's events into tool-spans for the Timeline. Pure: no store
 * access. Events are sorted by `id` (monotonic), then a new span opens whenever
 * `tool_name` changes from the previous event. A span's `endMs` is the NEXT
 * event's `created_at` (the moment the tool changed); the final span ends at its
 * own last event's `created_at` (no successor to bound it). `Date.parse` yields
 * the ms timestamps. An empty stream yields no spans.
 */
export function buildSegments(events: LiveEvent[]): WorkflowSegment[] {
  if (events.length === 0) return [];

  const ordered = [...events].sort((a, b) => a.id - b.id);
  const segments: WorkflowSegment[] = [];

  let current: WorkflowSegment | null = null;
  let currentTool: string | null = null;

  for (let i = 0; i < ordered.length; i += 1) {
    const event = ordered[i];
    const startMs = Date.parse(event.created_at);

    if (current === null || event.tool_name !== currentTool) {
      current = { tool: event.tool_name, startMs, endMs: startMs };
      currentTool = event.tool_name;
      segments.push(current);
    }

    // A span ends where the NEXT event begins; the last span ends at its own time.
    const next = ordered[i + 1];
    current.endMs = next ? Date.parse(next.created_at) : startMs;
  }

  return segments;
}
