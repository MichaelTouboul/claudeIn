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
      className="flex-1 h-full overflow-auto p-8 flex flex-col gap-6"
    >
      <Stack gap={2}>
        <h2
          className="text-2xl font-semibold"
          style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-sans)" }}
        >
          Customize Claude
        </h2>
        <p
          className="text-sm leading-relaxed max-w-prose"
          style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-sans)" }}
        >
          Pick a connector from the left to view or edit it, or add a new one. Skills and plugins are
          coming soon.
        </p>
      </Stack>
      <ul className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {HERO_OPTIONS.map((option) => (
          <li
            key={option.key}
            className="flex flex-col gap-2 rounded-xl p-4"
            style={{
              background: "var(--color-surface-1)",
              border: "1px solid var(--color-border-subtle)",
            }}
          >
            {option.icon}
            <span
              className="text-sm font-medium"
              style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-sans)" }}
            >
              {option.title}
            </span>
            <span className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
              {option.description}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
