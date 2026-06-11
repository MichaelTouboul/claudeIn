import { Sparkles } from "lucide-react";
import { useCallback, useMemo } from "react";

import { Button } from "@/components/_ui/Button";
import { Popover } from "@/components/_ui/Popover";
import { unacknowledgedMerged, useImproveStore } from "@/store/useImproveStore";

import { ImproveNotificationList } from "./ImproveNotificationList";

/**
 * Self-Improve notification (I5). A discreet Header affordance: a button with a
 * count badge when merged improvements await acknowledgement; a popover lists
 * each with an "Update" (reload + ack) and "Dismiss" (ack only) action.
 *
 * Renders nothing when there is nothing to show, so it stays invisible in the
 * common case.
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

  if (requests.length === 0) return null;

  const count = requests.length;
  return (
    <Popover
      align="end"
      trigger={
        <Button
          intent="outline"
          size="sm"
          aria-label={`${count} improvement${count === 1 ? "" : "s"} ready`}
          className="relative glow-cyan text-accent"
          style={{
            fontFamily: "var(--font-mono)",
            border: "1px solid rgba(6, 182, 212, 0.25)",
          }}
        >
          <Sparkles size={12} />
          <span
            className="tabular-nums"
            style={{ minWidth: "0.75rem", textAlign: "center" }}
          >
            {count}
          </span>
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
