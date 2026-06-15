import { Bot, Brain, Plug, Sparkles, User, Zap } from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";

import { Stack } from "@/components/_ui/Stack";
import { CustomizeSection } from "@/store/customize/useCustomizeStore";

export type CustomizeNavProps = {
  active: CustomizeSection;
  onSelect: (section: CustomizeSection) => void;
  /** Optional per-section item counts shown as a trailing mono tally. */
  counts?: Partial<Record<CustomizeSection, number>>;
};

type NavPresentation = {
  label: string;
  icon: (active: boolean) => ReactNode;
};

// Section→presentation map (no fallback chain): every CustomizeSection has an
// explicit nav label + icon. The icon takes the active flag so it tints
// `--accent-text` when selected and `--text-tertiary` at rest. `Object.values`
// drives the rendered order.
const NAV_PRESENTATION: Record<CustomizeSection, NavPresentation> = {
  [CustomizeSection.Profile]: { label: "Profile", icon: () => <User size={16} /> },
  [CustomizeSection.Connectors]: { label: "Connectors", icon: () => <Plug size={16} /> },
  [CustomizeSection.Skills]: { label: "Skills", icon: () => <Sparkles size={16} /> },
  [CustomizeSection.Agents]: { label: "Sub-agents", icon: () => <Bot size={16} /> },
  [CustomizeSection.Hooks]: { label: "Hooks", icon: () => <Zap size={16} /> },
  [CustomizeSection.Memory]: { label: "Memory", icon: () => <Brain size={16} /> },
};

const SECTIONS = Object.values(CustomizeSection);

// Vertical section nav as an ARIA tablist (matches the project's tab pattern):
// each section is a `role="tab"` with `aria-selected`, a roving tabIndex so only
// the active tab is in the tab order, and ArrowUp/ArrowDown to move selection.
export function CustomizeNav({ active, onSelect, counts }: CustomizeNavProps) {
  const move = (dir: 1 | -1) => {
    const i = SECTIONS.indexOf(active);
    if (i === -1) return;
    onSelect(SECTIONS[(i + dir + SECTIONS.length) % SECTIONS.length]);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    }
  };

  return (
    <Stack
      gap={0.5}
      role="tablist"
      aria-label="Customize sections"
      aria-orientation="vertical"
    >
      {SECTIONS.map((section) => {
        const { label, icon } = NAV_PRESENTATION[section];
        const selected = section === active;
        const count = counts?.[section];
        return (
          <button
            key={section}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(section)}
            onKeyDown={onKeyDown}
            className={`flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] ${
              selected ? "" : "hover:bg-surface-2"
            }`}
            style={{
              color: selected ? "var(--color-accent)" : "var(--color-text-secondary)",
              background: selected ? "var(--color-accent-dim)" : "transparent",
              fontWeight: selected ? 500 : 400,
              fontFamily: "var(--font-sans)",
            }}
          >
            <span
              className="flex"
              style={{ color: selected ? "var(--color-accent)" : "var(--color-text-muted)" }}
            >
              {icon(selected)}
            </span>
            {label}
            {count !== undefined ? (
              <span
                className="ml-auto text-[11px] tabular-nums"
                style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
              >
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </Stack>
  );
}
