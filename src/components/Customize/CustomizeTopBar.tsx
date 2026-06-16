import { ArrowLeft } from "lucide-react";

import { Avatar } from "@/components/_ui/Avatar";
import { Button } from "@/components/_ui/Button";
import { IconButton } from "@/components/_ui/IconButton";
import { BrandName } from "@/components/BrandName/BrandName";
import { Logo } from "@/components/Logo/Logo";
import { useUserProfile } from "@/hooks/useUserProfile";
import { cn, isMac } from "@/lib/utils";
import { CustomizeSection, useCustomizeStore } from "@/store/customize/useCustomizeStore";

export type CustomizeTopBarProps = {
  onBack: () => void;
};

// Page top bar (design-system kit): the ClaudeIn brand chevron + a "/ Customize"
// crumb, a back-to-home control, and a profile avatar that opens the Profile
// section. The Mac-aware left padding clears the traffic-light buttons.
export function CustomizeTopBar({ onBack }: CustomizeTopBarProps) {
  const { profile } = useUserProfile();
  const setSection = useCustomizeStore((s) => s.setSection);

  return (
    <header
      // `titlebar-drag` + Mac-aware left padding clear the macOS traffic-light
      // buttons so the back control isn't hidden behind them (mirrors Header.tsx).
      // The global `.titlebar-drag button { -webkit-app-region: no-drag }` rule
      // keeps the interactive controls clickable.
      className={cn(
        "titlebar-drag flex h-[var(--header-height)] items-center gap-3 pr-4 shrink-0 border-b border-border",
        isMac ? "pl-20" : "pl-4",
      )}
      style={{ background: "var(--color-surface-1)" }}
    >
      <span className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-fg">
        <Logo size={22} />
        <BrandName />
      </span>
      <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
        / Customize
      </span>
      <div className="flex-1" />
      <Button
        type="button"
        intent="ghost"
        size="sm"
        aria-label="Back to home"
        onClick={onBack}
        leftIcon={<ArrowLeft size={15} aria-hidden="true" />}
      >
        Home
      </Button>
      <IconButton aria-label="View your profile" onClick={() => setSection(CustomizeSection.Profile)}>
        <Avatar name={profile?.name ?? "You"} hue="blue" size="sm" />
      </IconButton>
    </header>
  );
}
