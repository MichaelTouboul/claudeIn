import { Bot, Plug, Sparkles, Zap } from "lucide-react";
import type { ComponentType } from "react";

import type { Capabilities } from "@/lib/types";

type LucideGlyph = ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
type Stat = { key: string; label: string; count: number; Icon: LucideGlyph };

/** The four capability counts, in display order, paired with their accent glyph. */
function stats(capabilities: Capabilities): Stat[] {
  return [
    { key: "agents", label: "agents", count: capabilities.agents.count, Icon: Bot },
    { key: "skills", label: "skills", count: capabilities.skills, Icon: Sparkles },
    { key: "mcp", label: "MCP servers", count: capabilities.mcp, Icon: Plug },
    { key: "hooks", label: "hooks", count: capabilities.hooks, Icon: Zap },
  ];
}

type ProfileStatStripProps = {
  capabilities: Capabilities;
};

/**
 * The hero stat strip: a 4-column row of capability counts, each an accent icon,
 * a big mono number, and a label. Sits inset under the identity row.
 */
export function ProfileStatStrip({ capabilities }: ProfileStatStripProps) {
  return (
    <div
      className="grid grid-cols-4 border-t border-border-subtle"
      style={{ background: "var(--color-surface-inset)" }}
    >
      {stats(capabilities).map((s, i) => (
        <div
          key={s.key}
          className="flex flex-col gap-1 px-4 py-3.5"
          style={i > 0 ? { borderLeft: "1px solid var(--color-border-subtle)" } : undefined}
        >
          <span className="flex" style={{ color: "var(--color-accent-text)" }}>
            <s.Icon size={16} aria-hidden />
          </span>
          <div className="flex items-baseline gap-1.5">
            <span
              className="text-xl font-semibold tabular-nums text-fg"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {s.count}
            </span>
            <span className="text-xs text-fg-subtle">{s.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
