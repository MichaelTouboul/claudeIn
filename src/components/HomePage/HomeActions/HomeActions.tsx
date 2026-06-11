import { Button } from "@/components/_ui/Button";

type HomeActionsProps = {
  onOpenUserAgent: () => void;
};

/**
 * Actions row: a user-scope chat opener and a placeholder "Task" action.
 * "Task" is disabled with a "bientôt" hint until the task pillar lands.
 */
export function HomeActions({ onOpenUserAgent }: HomeActionsProps) {
  return (
    <section aria-label="Actions" className="flex flex-col gap-3">
      <h2 className="text-xs uppercase tracking-[0.12em] text-fg-subtle" style={{ fontFamily: "var(--font-mono)" }}>
        Actions
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        <Button intent="outline" size="md" onClick={onOpenUserAgent}>
          Agent scope-user
        </Button>
        <Button intent="outline" size="md" disabled title="bientôt" aria-label="Task — bientôt">
          Task <span className="text-fg-subtle">· bientôt</span>
        </Button>
      </div>
    </section>
  );
}
