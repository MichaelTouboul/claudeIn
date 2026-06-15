import { Boxes,Plug, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { Stack } from "@/components/_ui/Stack";

type HeroOption = {
  key: string;
  icon: ReactNode;
  title: string;
  description: string;
};

// Visual-only placeholders (no business logic — wired in a later phase).
const HERO_OPTIONS: HeroOption[] = [
  {
    key: "connect",
    icon: <Plug size={18} className="text-accent" />,
    title: "Connect your apps",
    description: "Add MCP servers to give Claude new tools and data sources.",
  },
  {
    key: "skills",
    icon: <Sparkles size={18} className="text-active" />,
    title: "Create new skills",
    description: "Package reusable workflows Claude can call on demand.",
  },
  {
    key: "plugins",
    icon: <Boxes size={18} className="text-accent" />,
    title: "Browse plugins",
    description: "Discover bundles that extend what Claude Code can do.",
  },
];

// Default Customize content shown when nothing is selected: a "Customize Claude"
// title + lead-in line plus three placeholder option cards. Purely
// presentational — the cards are non-interactive until their flows ship.
export function CustomizeHero() {
  return (
    <section
      data-testid="customize-hero"
      aria-label="Customize Claude"
      className="flex-1 h-full overflow-auto px-8 py-7 flex flex-col gap-6"
    >
      <Stack gap={1.5}>
        <h1
          className="text-[22px] font-semibold tracking-[-0.01em]"
          style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-sans)" }}
        >
          Connectors
        </h1>
        <p
          className="text-sm leading-relaxed max-w-[60ch]"
          style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-sans)" }}
        >
          MCP servers give Claude new tools and data sources. Pick one to view or edit it, or add a
          new one.
        </p>
      </Stack>
      <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {HERO_OPTIONS.map((option) => (
          <li
            key={option.key}
            className="flex flex-col gap-2 rounded-[var(--radius-lg)] p-4"
            style={{
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-xs)",
            }}
          >
            {option.icon}
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-sans)" }}
            >
              {option.title}
            </span>
            <span
              className="text-[13px] leading-relaxed"
              style={{ color: "var(--color-text-muted)" }}
            >
              {option.description}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
