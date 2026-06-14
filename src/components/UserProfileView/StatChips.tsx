import { Badge } from "@/components/_ui/Badge";
import { Inline } from "@/components/_ui/Inline";
import type { Capabilities } from "@/lib/types";

type Stat = { key: string; label: string; count: number };

function stats(capabilities: Capabilities): Stat[] {
  return [
    { key: "agents", label: "agents", count: capabilities.agents.count },
    { key: "skills", label: "skills", count: capabilities.skills },
    { key: "mcp", label: "MCP", count: capabilities.mcp },
    { key: "hooks", label: "hooks", count: capabilities.hooks },
  ];
}

type StatChipsProps = {
  capabilities: Capabilities;
};

/** Capability counts (agents/skills/MCP/hooks) as small stat badges. */
export function StatChips({ capabilities }: StatChipsProps) {
  return (
    <Inline gap={1.5} className="flex-wrap">
      {stats(capabilities).map((s) => (
        <Badge key={s.key} variant="cyan" shape="pill">
          <span className="tabular-nums">{s.count}</span> {s.label}
        </Badge>
      ))}
    </Inline>
  );
}
