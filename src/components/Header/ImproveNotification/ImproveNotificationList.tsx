import type { ImproveRequest } from "@/lib/types";

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
  const empty = requests.length === 0;
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
      {empty ? (
        <p className="px-3 py-6 text-center text-xs leading-snug text-fg-subtle">
          No updates yet — merged improvements will land here.
        </p>
      ) : (
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
      )}
    </div>
  );
}
