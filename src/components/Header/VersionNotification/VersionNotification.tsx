import { ArrowUpCircle } from "lucide-react";
import { useCallback } from "react";

import { Button } from "@/components/_ui/Button";
import { Popover } from "@/components/_ui/Popover";
import { hasUpdate, useVersionStore } from "@/store/useVersionStore";

/**
 * App-version notification. A discreet always-visible Header affordance: a button
 * that grows an "update available" dot the moment the main process self-detects a
 * `package.json` version bump (every `land.sh` landing). The popover names the new
 * version and offers "Reload to update", which acknowledges the version and
 * reloads the renderer.
 *
 * Mounted once at the App root as a fixed overlay (see `App.tsx`), so it is
 * present on every page except Onboarding — alongside `ImproveNotification`. Its
 * domain (a single running/latest version) is deliberately separate from the
 * improve store (a map of merged requests).
 */
export function VersionNotification() {
  const running = useVersionStore((s) => s.running);
  const latest = useVersionStore((s) => s.latest);
  const acknowledged = useVersionStore((s) => s.acknowledged);
  const acknowledge = useVersionStore((s) => s.acknowledge);

  const update = hasUpdate({ running, latest, acknowledged });

  const onReload = useCallback(() => {
    if (latest) acknowledge(latest);
    // The renderer reloads onto the merged code; main-process changes still need
    // a full app relaunch (flagged in the popover copy).
    window.location.reload();
  }, [latest, acknowledge]);

  const label = update ? `Update available — v${latest}` : "App version";

  return (
    <Popover
      align="end"
      trigger={
        <Button
          intent="outline"
          size="sm"
          aria-label={label}
          className="relative text-fg-muted"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          <ArrowUpCircle size={12} />
          {update ? (
            <span
              data-testid="version-dot"
              aria-hidden
              className="absolute -top-1 -right-1 rounded-full"
              style={{
                width: "0.5rem",
                height: "0.5rem",
                background: "var(--color-accent)",
                boxShadow: "0 0 0 2px var(--color-surface-0)",
              }}
            />
          ) : null}
        </Button>
      }
    >
      <div className="w-72 max-w-[90vw]">
        <div
          className="px-3 py-2.5"
          style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted font-sans">
            App version
          </p>
          <p className="mt-1 text-xs leading-snug text-fg-subtle">
            Running{" "}
            <span className="text-fg font-mono tabular-nums">v{running}</span>
            {update ? (
              <>
                {" — "}
                <span className="text-accent font-mono tabular-nums">
                  v{latest}
                </span>{" "}
                is ready.
              </>
            ) : (
              " — you're up to date."
            )}
          </p>
        </div>
        {update ? (
          <div className="px-3 py-2.5">
            <Button
              intent="primary"
              size="sm"
              className="w-full"
              onClick={onReload}
            >
              Reload to update → v{latest}
            </Button>
            <p className="mt-2 text-[11px] leading-snug text-fg-subtle">
              Reloads the interface. Main-process changes need a full app
              relaunch.
            </p>
          </div>
        ) : (
          <p className="px-3 py-6 text-center text-xs leading-snug text-fg-subtle">
            No new version yet — bumps land here automatically.
          </p>
        )}
      </div>
    </Popover>
  );
}
