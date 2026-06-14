import { RotateCcw } from "lucide-react";
import { useCallback, useState } from "react";

import { cn } from "@/lib/utils";
import { AppPage, useAppStore } from "@/store/useAppStore";

type DevResetProps = {
  /** Optional extra classes for the host surface (e.g. Footer vs Home). */
  className?: string;
};

/**
 * Dev-only "Reset onboarding (dev)" affordance. Clears the persisted user
 * (`window.api.resetUser`) and re-enters the onboarding flow. Strictly gated on
 * `import.meta.env.DEV` so the bundler dead-code-eliminates it from production
 * builds — it never renders for real users.
 */
export function DevReset({ className }: DevResetProps) {
  const navigate = useAppStore((s) => s.navigate);
  const [resetting, setResetting] = useState(false);

  const reset = useCallback(async () => {
    setResetting(true);
    try {
      await window.api.resetUser();
      navigate(AppPage.Onboarding);
    } finally {
      setResetting(false);
    }
  }, [navigate]);

  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => void reset()}
      disabled={resetting}
      aria-label="Reset onboarding (dev)"
      title="Dev only — clears your profile and favorites, then restarts onboarding"
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em]",
        "text-fg-muted transition-colors hover:text-danger",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      style={{ fontFamily: "var(--font-mono)" }}
    >
      <RotateCcw size={10} aria-hidden="true" />
      {resetting ? "Reset…" : "Reset onboarding (dev)"}
    </button>
  );
}
