import { RefreshCw, X } from "lucide-react";

import { Badge, type BadgeVariant } from "@/components/_ui/Badge";
import { Button } from "@/components/_ui/Button";
import { Flex } from "@/components/_ui/Flex";
import { Inline } from "@/components/_ui/Inline";
import type { ImproveRequest } from "@/lib/types";
import { ImproveType } from "@/lib/types";

// Type→badge appearance (CLAUDE.md: enum + behavior map, not a fallback chain).
const TYPE_BADGE: Record<ImproveType, { label: string; variant: BadgeVariant }> = {
  [ImproveType.Feature]: { label: "Feature", variant: "cyan" },
  [ImproveType.Bug]: { label: "Bug", variant: "red" },
  [ImproveType.Design]: { label: "Design", variant: "purple" },
  [ImproveType.Performance]: { label: "Perf", variant: "yellow" },
  [ImproveType.Copy]: { label: "Copy", variant: "blue" },
};

export type ImproveNotificationItemProps = {
  request: ImproveRequest;
  /** Reload the renderer + acknowledge. */
  onUpdate: (id: string) => void;
  /** Acknowledge without reloading. */
  onDismiss: (id: string) => void;
};

export function ImproveNotificationItem({
  request,
  onUpdate,
  onDismiss,
}: ImproveNotificationItemProps) {
  const badge = TYPE_BADGE[request.type];
  return (
    <li
      className="flex flex-col gap-2 px-3 py-2.5"
      style={{ borderTop: "1px solid var(--color-border-subtle)" }}
    >
      <Inline gap={2} align="start">
        <Badge variant={badge.variant}>{badge.label}</Badge>
        <span className="flex-1 text-[13px] font-medium leading-snug text-fg">
          {request.title}
        </span>
        <Button
          intent="ghost"
          size="icon"
          aria-label={`Dismiss ${request.title}`}
          onClick={() => onDismiss(request.id)}
          className="h-6 w-6 shrink-0"
        >
          <X size={13} />
        </Button>
      </Inline>
      {request.summary ? (
        <p className="text-xs leading-snug text-fg-muted">{request.summary}</p>
      ) : null}
      <Flex justify="end">
        <Button
          intent="outline"
          size="sm"
          aria-label={`Update — apply ${request.title}`}
          onClick={() => onUpdate(request.id)}
          className="text-accent"
          style={{ border: "1px solid rgba(6, 182, 212, 0.25)" }}
        >
          <RefreshCw size={11} />
          Update
          {request.version ? (
            <span className="tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>
              {`→ v${request.version}`}
            </span>
          ) : null}
        </Button>
      </Flex>
    </li>
  );
}
