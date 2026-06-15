import { Badge } from "@/components/_ui/Badge";
import { Switch } from "@/components/_ui/Switch";
import type { HookEntry } from "@/lib/types";

// One normalized hook: event badge + matcher + command (mono), and a Switch
// bound to `enabled`. Managed (non-editable) hooks render the Switch disabled
// with a "read-only" tooltip so the state is visible but not mutable.
export function HookRow({
  hook,
  onToggle,
}: {
  hook: HookEntry;
  onToggle: (enabled: boolean) => void;
}) {
  const managed = !hook.editable;
  return (
    <div
      className="flex items-center gap-2.5 rounded-[var(--radius-md)] border p-3"
      style={{ background: "var(--color-surface-1)", borderColor: "var(--color-border)" }}
    >
      <Badge variant="yellow">{hook.event}</Badge>
      <span className="text-xs" style={{ fontFamily: "var(--font-mono)", color: "var(--color-text-muted)" }}>
        {hook.matcher ?? "*"}
      </span>
      <span
        className="min-w-0 flex-1 truncate text-xs"
        style={{ fontFamily: "var(--font-mono)", color: "var(--color-text-secondary)" }}
        title={hook.command}
      >
        {hook.command}
      </span>
      <span title={managed ? "Managed — read-only" : undefined}>
        <Switch
          checked={hook.enabled}
          disabled={managed}
          onCheckedChange={onToggle}
          aria-label={`${hook.event} ${hook.matcher ?? "all"} hook`}
        />
      </span>
    </div>
  );
}
