import { Sparkles } from "lucide-react";
import { useCallback, useMemo } from "react";

import { Button } from "@/components/_ui/Button";
import { Popover } from "@/components/_ui/Popover";
import { unacknowledgedMerged, useImproveStore } from "@/store/useImproveStore";

import { ImproveNotificationList } from "./ImproveNotificationList";

/**
 * Self-Improve notification (I5). An always-visible app affordance: a button so
 * the user always knows where merged improvements land. A count badge appears
 * only when merged improvements await acknowledgement; the popover lists each
 * with an "Update" (reload + ack) and "Dismiss" (ack only) action, or a discreet
 * empty state when nothing is pending.
 *
 * Mounted once at the App root as a fixed overlay (see `App.tsx`), so it is
 * present on every page except Onboarding.
 */
export function ImproveNotification() {
  // Select the raw slices (stable references) and derive the array with useMemo
  // — a selector that builds a new array every call would loop zustand forever.
  const requestMap = useImproveStore((s) => s.requests);
  const acknowledgedIds = useImproveStore((s) => s.acknowledgedIds);
  const acknowledge = useImproveStore((s) => s.acknowledge);
  const requests = useMemo(
    () => unacknowledgedMerged(requestMap, acknowledgedIds),
    [requestMap, acknowledgedIds],
  );

  const onUpdate = useCallback(
    (id: string) => {
      acknowledge(id);
      // HMR has already applied renderer changes; the reload is a safety net so
      // the user always lands on the merged code. Main-process changes still
      // need an app relaunch (flagged in the popover copy).
      window.location.reload();
    },
    [acknowledge],
  );

  const count = requests.length;
  const label =
    count === 0
      ? "Self-Improve updates"
      : `${count} improvement${count === 1 ? "" : "s"} ready`;

  return (
    <Popover
      align="end"
      trigger={
        <Button
          intent="outline"
          size="sm"
          aria-label={label}
          className="relative glow-cyan text-accent"
          style={{
            fontFamily: "var(--font-mono)",
            border: "1px solid rgba(6, 182, 212, 0.25)",
          }}
        >
          <Sparkles size={12} />
          {count > 0 ? (
            <span
              data-testid="improve-count"
              className="tabular-nums"
              style={{ minWidth: "0.75rem", textAlign: "center" }}
            >
              {count}
            </span>
          ) : null}
        </Button>
      }
    >
      <ImproveNotificationList
        requests={requests}
        onUpdate={onUpdate}
        onDismiss={acknowledge}
      />
    </Popover>
  );
}
