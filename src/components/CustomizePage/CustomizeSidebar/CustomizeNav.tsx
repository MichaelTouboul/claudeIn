import { Plug, Sparkles } from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";

import { Stack } from "@/components/_ui/Stack";
import { CustomizeSection } from "@/store/customize/useCustomizeStore";

export type CustomizeNavProps = {
  active: CustomizeSection;
  onSelect: (section: CustomizeSection) => void;
};

type NavPresentation = {
  label: string;
  icon: ReactNode;
};

// Section→presentation map (no fallback chain): every CustomizeSection has an
// explicit nav label + icon. `Object.values` drives the rendered order.
const NAV_PRESENTATION: Record<CustomizeSection, NavPresentation> = {
  [CustomizeSection.Skills]: { label: "Skills", icon: <Sparkles size={14} className="text-active" /> },
  [CustomizeSection.Connectors]: { label: "Connectors", icon: <Plug size={14} className="text-accent" /> },
};

const SECTIONS = Object.values(CustomizeSection);

// Vertical section nav as an ARIA tablist (matches the project's tab pattern):
// each section is a `role="tab"` with `aria-selected`, a roving tabIndex so only
// the active tab is in the tab order, and ArrowUp/ArrowDown to move selection.
export function CustomizeNav({ active, onSelect }: CustomizeNavProps) {
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
        return (
          <button
            key={section}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(section)}
            onKeyDown={onKeyDown}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            style={{
              color: selected ? "var(--color-accent)" : "var(--color-text-secondary)",
              background: selected ? "var(--color-accent-dim)" : "transparent",
              fontFamily: "var(--font-sans)",
            }}
          >
            {icon}
            {label}
          </button>
        );
      })}
    </Stack>
  );
}
