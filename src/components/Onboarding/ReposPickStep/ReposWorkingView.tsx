import { Progress } from "@/components/_ui/Progress";

import { useReposWorkingMessage } from "./useReposWorkingMessage";

/**
 * The repo-scan "working" phase body: an indeterminate animated bar plus a
 * cycling staged status message, mirroring the user-search working view so the
 * long opaque scan feels alive. The action buttons stay hidden while this shows.
 */
export function ReposWorkingView() {
  const message = useReposWorkingMessage(true);
  return (
    <>
      <p className="text-sm text-fg-muted">{message}</p>
      <Progress
        value={0}
        indeterminate
        fillColor="var(--color-accent)"
        className="h-1.5"
        trackClassName="w-full"
        aria-label="Scanning your repositories"
      />
    </>
  );
}
