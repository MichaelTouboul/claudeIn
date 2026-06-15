import { useEffect, useState } from "react";

/** Cosmetic staged messages cycled while the repo scan runs. */
export const REPOS_WORKING_MESSAGES: readonly string[] = [
  "Scanning your repositories…",
  "Reading .claude configs…",
  "Detecting project logos…",
  "Almost there…",
];

const STEP_MS = 1400;

/**
 * Cycle through `REPOS_WORKING_MESSAGES` on a timer while `active`, holding on the
 * last one until the scan resolves. The scan is a single opaque call — these
 * messages just keep the step feeling alive. Resets to the first message whenever
 * `active` flips back on.
 */
export function useReposWorkingMessage(active: boolean): string {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      return;
    }
    setIndex(0);
    const id = setInterval(() => {
      setIndex((i) => Math.min(i + 1, REPOS_WORKING_MESSAGES.length - 1));
    }, STEP_MS);
    return () => clearInterval(id);
  }, [active]);

  return REPOS_WORKING_MESSAGES[index];
}
