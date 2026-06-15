import { useCustomizeHooks } from "@/hooks/useCustomizeHooks";

import { HookRow } from "./HookRow";
import { PaneEmpty, PaneLoading, PaneShell } from "./PaneShell";

// Hooks section: every normalized lifecycle hook for the active scope with a
// reversible enable/disable toggle. Managed hooks are shown read-only.
export function HooksPane({ repoScope }: { repoScope: string | null }) {
  const { hooks, loading, setEnabled } = useCustomizeHooks(repoScope);
  return (
    <PaneShell
      title="Hooks"
      description="Shell commands that run on Claude Code lifecycle events."
    >
      {loading ? (
        <PaneLoading label="Loading hooks…" />
      ) : hooks.length === 0 ? (
        <PaneEmpty message="No hooks in this scope yet." />
      ) : (
        <div className="flex flex-col gap-2">
          {hooks.map((hook) => (
            <HookRow
              key={hook.id}
              hook={hook}
              onToggle={(enabled) => void setEnabled(hook.id, enabled)}
            />
          ))}
        </div>
      )}
    </PaneShell>
  );
}
