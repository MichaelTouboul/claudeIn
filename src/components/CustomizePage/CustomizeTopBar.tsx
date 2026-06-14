import { ArrowLeft, User } from "lucide-react";

import { Button } from "@/components/_ui/Button";

export type CustomizeTopBarProps = {
  onBack: () => void;
};

// Page top bar: a back control to Home, the page title, and an avatar
// placeholder. Visual chrome only — no business logic.
export function CustomizeTopBar({ onBack }: CustomizeTopBarProps) {
  return (
    <header
      className="flex items-center gap-3 px-4 py-3 shrink-0"
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
      <div
        aria-hidden
        className="ml-auto flex h-8 w-8 items-center justify-center rounded-full"
        style={{ background: "var(--color-surface-3)", color: "var(--color-text-muted)" }}
      >
        <User size={16} />
      </div>
    </header>
  );
}
