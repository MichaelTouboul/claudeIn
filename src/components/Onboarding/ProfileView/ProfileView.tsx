import { useState } from "react";

import { Button } from "@/components/_ui/Button";
import { Inline } from "@/components/_ui/Inline";
import { MarkdownBody } from "@/components/_ui/MarkdownBody";
import { Stack } from "@/components/_ui/Stack";
import type { ScopeProfile } from "@/lib/types";

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
    <Stack gap={4}>
      <Inline as="header" gap={3} justify="between">
        <Stack gap={0.5} className="min-w-0">
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
        </Stack>
        <Button
          intent="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label="Refresh profile"
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </Inline>

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
    </Stack>
  );
}
