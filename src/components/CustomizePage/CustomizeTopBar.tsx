import { ArrowLeft, User } from "lucide-react";

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
      <button
        type="button"
        aria-label="Back to home"
        onClick={onBack}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-sans)" }}
      >
        <ArrowLeft size={16} />
        Customize
      </button>
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
