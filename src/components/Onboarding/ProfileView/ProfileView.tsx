import { useState } from "react";

import { Button } from "@/components/_ui/Button";
import { MarkdownBody } from "@/components/_ui/MarkdownBody";
import type { ScopeProfile } from "@/types/onboarding.types";

type ProfileViewProps = {
  scopePath: string;
  profile: ScopeProfile | null;
};

export function ProfileView({ scopePath, profile }: ProfileViewProps) {
  const [current, setCurrent] = useState<ScopeProfile | null>(profile);
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const refreshed = await window.api.refreshProfile(scopePath);
      setCurrent(refreshed);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <h2
            className="text-base font-sans font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            Scope profile
          </h2>
          <span
            className="text-xs font-mono truncate"
            style={{ color: "var(--color-text-secondary)" }}
            title={scopePath}
          >
            {scopePath}
          </span>
        </div>
        <Button
          intent="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label="Refresh profile"
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </header>

      {current ? (
        <MarkdownBody content={current.profileMd} />
      ) : (
        <div
          className="rounded-lg p-6 text-sm font-sans"
          style={{
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-border-subtle)",
            color: "var(--color-text-secondary)",
          }}
        >
          No profile generated yet for this scope. Refresh to explore its{" "}
          <code className="font-mono">.claude</code> and build one.
        </div>
      )}
    </div>
  );
}
