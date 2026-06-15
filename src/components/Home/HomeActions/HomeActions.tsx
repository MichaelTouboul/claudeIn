import { Button } from "@/components/_ui/Button";
import { Stack } from "@/components/_ui/Stack";

type HomeActionsProps = {
  onOpenUserAgent: () => void;
  onCustomize: () => void;
};

/**
 * Actions row: a user-scope chat opener, a "Customize Claude" entry into the
 * Customize page, and a placeholder "Task" action. "Task" is disabled with a
 * "soon" hint until the task pillar lands.
 */
export function HomeActions({ onOpenUserAgent, onCustomize }: HomeActionsProps) {
  return (
    <Stack as="section" gap={3} aria-label="Actions">
      <h2 className="text-xs uppercase tracking-[0.12em] text-fg-subtle" style={{ fontFamily: "var(--font-sans)" }}>
        Actions
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        <Button intent="outline" size="md" onClick={onOpenUserAgent}>
          Agent scope-user
        </Button>
        <Button intent="outline" size="md" onClick={onCustomize}>
          Customize Claude
        </Button>
        <Button intent="outline" size="md" disabled title="soon" aria-label="Task — soon">
          Task <span className="text-fg-subtle">· soon</span>
        </Button>
      </div>
    </Stack>
  );
}
