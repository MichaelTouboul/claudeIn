import { Plug, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { CustomizeSection } from "@/store/useCustomizeStore";

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

export function CustomizeNav({ active, onSelect }: CustomizeNavProps) {
  return (
    <nav aria-label="Customize sections" className="flex flex-col gap-0.5">
      {Object.values(CustomizeSection).map((section) => {
        const { label, icon } = NAV_PRESENTATION[section];
        const selected = section === active;
        return (
          <button
            key={section}
            type="button"
            aria-current={selected ? "page" : undefined}
            onClick={() => onSelect(section)}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
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
    </nav>
  );
}
