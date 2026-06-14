import { useEffect, useState } from "react";

/** Cosmetic staged messages cycled while the (opaque) analysis call runs. */
export const WORKING_MESSAGES: readonly string[] = [
  "Locating your .claude…",
  "Reading agents & skills…",
  "Inspecting MCP & hooks…",
  "Summarizing your setup…",
];

const STEP_MS = 1400;

/**
 * Cycle through `WORKING_MESSAGES` on a timer while `active`, holding on the last
 * one until the call resolves. The underlying request is a single opaque call —
 * these messages are purely to keep the step feeling alive. Resets to the first
 * message whenever `active` flips back on.
 */
export function useWorkingMessage(active: boolean): string {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      return;
    }
    setIndex(0);
    const id = setInterval(() => {
      setIndex((i) => Math.min(i + 1, WORKING_MESSAGES.length - 1));
    }, STEP_MS);
    return () => clearInterval(id);
  }, [active]);

  return WORKING_MESSAGES[index];
}
