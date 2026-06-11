import type { ImproveRequest } from "@/types/improve.types";

import { ImproveNotificationItem } from "./ImproveNotificationItem";

export type ImproveNotificationListProps = {
  requests: ImproveRequest[];
  onUpdate: (id: string) => void;
  onDismiss: (id: string) => void;
};

export function ImproveNotificationList({
  requests,
  onUpdate,
  onDismiss,
}: ImproveNotificationListProps) {
  return (
    <div className="w-80 max-w-[90vw]">
      <div
        className="px-3 py-2.5"
        style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted font-mono">
          Improvements ready
        </p>
        <p className="mt-1 text-[11px] leading-snug text-fg-subtle">
          The interface reloads live. Main-process changes may need an app
          relaunch.
        </p>
      </div>
      <ul className="max-h-[60vh] overflow-y-auto">
        {requests.map((request) => (
          <ImproveNotificationItem
            key={request.id}
            request={request}
            onUpdate={onUpdate}
            onDismiss={onDismiss}
          />
        ))}
      </ul>
    </div>
  );
}
