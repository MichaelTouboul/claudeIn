import { Progress } from "@/components/_ui/Progress";

import { useWorkingMessage } from "./useWorkingMessage";

/**
 * The "Working" phase body: an indeterminate animated bar plus a cycling staged
 * status message, so the long opaque `claude --print` call feels alive.
 */
export function WorkingView() {
  const message = useWorkingMessage(true);
  return (
    <>
      <p className="text-sm text-fg-muted">{message}</p>
      <Progress
        value={0}
        indeterminate
        fillColor="var(--color-accent)"
        className="h-1.5"
        trackClassName="w-full"
        aria-label="Analyzing your setup"
      />
    </>
  );
}
