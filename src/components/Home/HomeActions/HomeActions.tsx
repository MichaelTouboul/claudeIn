import { User, Wand2 } from "lucide-react";

import { Button } from "@/components/_ui/Button";

type HomeActionsProps = {
  onOpenUserAgent: () => void;
  onCustomize: () => void;
};

/**
 * Actions row: a user-scope chat opener and a "Customize Claude" entry into the
 * Customize page, plus a placeholder "Task" action disabled with a "soon" hint
 * until the task pillar lands.
 */
export function HomeActions({ onOpenUserAgent, onCustomize }: HomeActionsProps) {
  return (
    <section aria-label="Actions">
      <div className="mb-3.5">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
          Actions
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          intent="secondary"
          size="md"
          leftIcon={<User size={15} aria-hidden="true" />}
          onClick={onOpenUserAgent}
        >
          Chat with Claude
        </Button>
        <Button
          intent="secondary"
          size="md"
          leftIcon={<Wand2 size={15} aria-hidden="true" />}
          onClick={onCustomize}
        >
          Customize Claude
        </Button>
        <Button intent="outline" size="md" disabled aria-label="Task — soon">
          Task <span className="text-fg-subtle">· soon</span>
        </Button>
      </div>
    </section>
  );
}
