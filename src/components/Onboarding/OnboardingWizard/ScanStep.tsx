import { Badge } from "@/components/_ui/Badge";
import { Button } from "@/components/_ui/Button";
import type { Candidate } from "@/types/onboarding.types";

type ScanStepProps = {
  candidates: Candidate[];
  loading: boolean;
  selected: ReadonlySet<string>;
  onToggle: (path: string) => void;
  onAddSelected: () => void;
  onSkip: () => void;
};

export function ScanStep({
  candidates,
  loading,
  selected,
  onToggle,
  onAddSelected,
  onSkip,
}: ScanStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-base font-sans font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Discover your Claude Code setups
        </h2>
        <p className="text-xs font-sans" style={{ color: "var(--color-text-secondary)" }}>
          Pick the repositories ClaudeIn should understand. We&apos;ll explore each
          <code className="font-mono"> .claude</code> directory and build a profile.
        </p>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 py-6" style={{ color: "var(--color-text-secondary)" }}>
          <span
            className="w-4 h-4 border-2 rounded-full animate-spin"
            style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
          />
          <span className="text-xs font-mono uppercase tracking-wider">Scanning</span>
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5 max-h-72 overflow-auto">
          {candidates.length === 0 ? (
            <li className="text-xs font-sans py-4" style={{ color: "var(--color-text-muted)" }}>
              No repositories with a root-level .claude were found.
            </li>
          ) : (
            candidates.map((candidate) => {
              const checkboxId = `scan-${candidate.path}`;
              return (
                <li
                  key={candidate.path}
                  className="flex items-center gap-3 rounded px-3 py-2"
                  style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)" }}
                >
                  <input
                    id={checkboxId}
                    type="checkbox"
                    aria-label={`Add ${candidate.path}`}
                    checked={selected.has(candidate.path)}
                    onChange={() => onToggle(candidate.path)}
                  />
                  <label htmlFor={checkboxId} className="flex-1 min-w-0 flex items-center gap-2 cursor-pointer">
                    <span
                      className="flex-1 truncate text-xs font-mono"
                      style={{ color: "var(--color-text-primary)" }}
                      title={candidate.path}
                    >
                      {candidate.path}
                    </span>
                    {candidate.scope === "user" ? <Badge variant="purple">user</Badge> : null}
                    {candidate.plugins.map((plugin) => (
                      <Badge key={plugin} variant="orange">
                        {plugin}
                      </Badge>
                    ))}
                  </label>
                </li>
              );
            })
          )}
        </ul>
      )}

      <footer className="flex items-center justify-between gap-2">
        <Button intent="ghost" size="sm" onClick={onSkip}>
          Skip for now
        </Button>
        <Button
          intent="primary"
          size="md"
          onClick={onAddSelected}
          disabled={selected.size === 0}
          aria-label="Add selected scopes"
        >
          Add selected
        </Button>
      </footer>
    </div>
  );
}
