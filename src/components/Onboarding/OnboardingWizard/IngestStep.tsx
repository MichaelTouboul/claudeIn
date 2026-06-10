import { Badge } from "@/components/_ui/Badge";
import { Button } from "@/components/_ui/Button";
import type { Candidate } from "@/types/onboarding.types";

import { INGEST_STATUS_PRESENTATION, IngestStatus } from "./ingestStatus";

type IngestStepProps = {
  scopes: Candidate[];
  statusByScope: Record<string, IngestStatus>;
  onFinish: () => void;
};

function statusOf(statusByScope: Record<string, IngestStatus>, path: string): IngestStatus {
  // Absent entry → the genuinely-not-started case (Pending), per the enum rule.
  return statusByScope[path] ?? IngestStatus.Pending;
}

export function IngestStep({ scopes, statusByScope, onFinish }: IngestStepProps) {
  const allTerminal = scopes.every(
    (scope) => INGEST_STATUS_PRESENTATION[statusOf(statusByScope, scope.path)].terminal,
  );

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-base font-sans font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Building understanding
        </h2>
        <p className="text-xs font-sans" style={{ color: "var(--color-text-secondary)" }}>
          Each scope is explored independently — a failure on one does not block the others.
        </p>
      </header>

      <ul className="flex flex-col gap-1.5 max-h-72 overflow-auto">
        {scopes.map((scope) => {
          const status = statusOf(statusByScope, scope.path);
          const presentation = INGEST_STATUS_PRESENTATION[status];
          return (
            <li
              key={scope.path}
              data-testid={`ingest-row-${scope.path}`}
              className="flex items-center gap-3 rounded px-3 py-2"
              style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)" }}
            >
              {presentation.busy ? (
                <span
                  className="w-3.5 h-3.5 border-2 rounded-full animate-spin shrink-0"
                  style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
                />
              ) : null}
              <span
                className="flex-1 truncate text-xs font-mono"
                style={{ color: "var(--color-text-primary)" }}
                title={scope.path}
              >
                {scope.path}
              </span>
              <Badge variant={presentation.variant}>{presentation.label}</Badge>
            </li>
          );
        })}
      </ul>

      <footer className="flex items-center justify-end">
        <Button
          intent="primary"
          size="md"
          onClick={onFinish}
          disabled={!allTerminal}
          aria-label="Enter app"
        >
          Enter app
        </Button>
      </footer>
    </div>
  );
}
