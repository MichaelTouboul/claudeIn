import { Check } from "lucide-react";

import { Progress } from "@/components/_ui/Progress";
import { StatusDot } from "@/components/_ui/StatusDot";

import { useWorkingMessage, WORKING_MESSAGES } from "./useWorkingMessage";

/**
 * The "Working" phase body: an indeterminate animated bar plus a staged scan
 * checklist (completed lines get a check, the current line a pulsing dot), so the
 * long opaque `claude --print` call feels alive. The staged list mirrors the
 * design-system onboarding kit's "Analyzing your setup" screen.
 */
export function WorkingView() {
  const active = useWorkingMessage(true);
  return (
    <>
      <Progress
        value={0}
        indeterminate
        fillColor="var(--color-accent)"
        className="h-1.5"
        trackClassName="w-full"
        aria-label="Analyzing your setup"
      />
      <div className="mt-1.5 flex flex-col gap-2.5">
        {WORKING_MESSAGES.map((message, i) => (
          <div
            key={message}
            className="flex items-center gap-2.5 text-[13px] text-fg-muted"
            style={{ opacity: i <= active ? 1 : 0.4 }}
          >
            {i < active ? (
              <span className="shrink-0" style={{ color: "var(--color-active)" }}>
                <Check size={16} aria-hidden="true" />
              </span>
            ) : (
              <StatusDot
                size="sm"
                pulse={i === active}
                className="shrink-0"
                style={{ background: i === active ? "var(--color-info)" : "var(--color-fg-subtle)" }}
              />
            )}
            {message}
          </div>
        ))}
      </div>
    </>
  );
}
