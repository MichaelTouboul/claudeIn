import { ArrowLeft, User } from "lucide-react";

import { Button } from "@/components/_ui/Button";
import { useUserProfile } from "@/hooks/useUserProfile";
import { cn, isMac } from "@/lib/utils";
import { CustomizeSection, useCustomizeStore } from "@/store/customize/useCustomizeStore";

export type CustomizeTopBarProps = {
  onBack: () => void;
};

/** First letter of a profile name, uppercased, or null when no usable name. */
function initialOf(name: string | null): string | null {
  const trimmed = name?.trim() ?? "";
  return trimmed.length > 0 ? trimmed[0].toUpperCase() : null;
}

// Page top bar: a back control to Home, the page title, and a real avatar
// control that opens the Profile section (shows the user's initial when known).
export function CustomizeTopBar({ onBack }: CustomizeTopBarProps) {
  const { profile } = useUserProfile();
  const setSection = useCustomizeStore((s) => s.setSection);
  const initial = initialOf(profile?.name ?? null);

  return (
    <header
      // `titlebar-drag` + Mac-aware left padding clear the macOS traffic-light
      // buttons so the back control isn't hidden behind them (mirrors Header.tsx).
      // The global `.titlebar-drag button { -webkit-app-region: no-drag }` rule
      // keeps the interactive controls clickable.
      className={cn(
        "titlebar-drag flex items-center gap-3 pr-4 py-3 shrink-0",
        isMac ? "pl-20" : "pl-4",
      )}
      style={{ background: "var(--color-surface-1)", borderBottom: "1px solid var(--color-border)" }}
    >
      <Button type="button" intent="ghost" size="sm" aria-label="Back to home" onClick={onBack}>
        <ArrowLeft size={16} />
        Customize
      </Button>
      <h1
        className="text-sm font-semibold"
        style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-sans)" }}
      >
        Customize Claude
      </h1>
      <button
        type="button"
        aria-label="View your profile"
        onClick={() => setSection(CustomizeSection.Profile)}
        className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        style={{ background: "var(--color-surface-3)", color: "var(--color-text-muted)" }}
      >
        {initial ?? <User size={16} />}
      </button>
    </header>
  );
}
